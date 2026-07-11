import { onMounted, onUnmounted, type Ref } from "vue";
import { sanitizeHtml } from "../utils/sanitizeHtml";

/**
 * Ports framework/js/components/lazy-load.js (v1.2.1) — an
 * IntersectionObserver-driven deferred loader. It exposes both donor levels
 * plus the root-scoped `[data-vd-lazy]` attribute wiring.
 *
 *  LOW-LEVEL — `observe(el, cb, { threshold?, rootMargin? })` fires `cb` once
 *  when `el` first intersects, then auto-unobserves. `unobserve(el)` cancels a
 *  pending observation. When `IntersectionObserver` is unavailable the callback
 *  fires immediately (eager fallback).
 *
 *  HIGH-LEVEL — `loadSection(url, container, options)` shows a placeholder
 *  (`"skeleton"` default / `"spinner"` / a custom HTML string), fetches the
 *  same-origin/https URL on first intersection (10 s abort timeout), injects
 *  the sanitized response, and dispatches `lazysection:loading` /
 *  `lazysection:loaded` / `lazysection:error` (bubbling) on the container,
 *  rendering an inline `.vd-alert.vd-alert-error` on failure.
 *
 *  ROOT WIRING — when `root` is passed, on mount every `[data-vd-lazy]`
 *  descendant is wired via `loadSection` using `data-vd-lazy` (URL) and
 *  `data-vd-lazy-placeholder`, with the `data-vd-lazy-state` attribute stamped
 *  `loading` → `loaded` / `error`.
 *
 * NEW in vd3 — there was no old @vanduo-oss/vue shim for this donor.
 * vd3-specific choices (documented per the composable-contract):
 *  - The donor's private `_sanitizeNode`/`_safeInjectHtml` are dropped in
 *    favour of the shared `utils/sanitizeHtml` (a stricter whitelist).
 *  - URL guard allows relative/same-origin **or** https (the donor allowed
 *    same-origin only); a blocked URL now dispatches `lazysection:error`
 *    instead of silently returning, so callers get a uniform failure signal.
 *  - Dropped vanilla-only concerns: DOM auto-scan/`init`, the module-global
 *    `_observerMap`, `window.VanduoLifecycle`, `window.Vanduo.init` re-init of
 *    injected subtrees, and the `window.VanduoLazyLoad` global. Each composable
 *    call owns its own observer registry, released on scope disposal.
 */

/** Options for the low-level {@link LazyLoadApi.observe}. */
export interface LazyObserveOptions {
  /** IntersectionObserver threshold. Default `0`. */
  threshold?: number;
  /** IntersectionObserver rootMargin. Default `"0px"`. */
  rootMargin?: string;
}

/** Options for the high-level {@link LazyLoadApi.loadSection}. */
export interface LoadSectionOptions {
  /**
   * `"skeleton"` (default) or `"spinner"` render the shipped loader markup; any
   * other string is treated as custom HTML and sanitized before injection.
   */
  placeholder?: "skeleton" | "spinner" | string;
  /** IntersectionObserver threshold for the deferred fetch. Default `0`. */
  threshold?: number;
  /** IntersectionObserver rootMargin for the deferred fetch. Default `"0px"`. */
  rootMargin?: string;
  /** Called with the container after the sanitized response is injected. */
  onLoaded?: (container: Element) => void;
  /** Called with the error when the fetch (or URL guard) fails. */
  onError?: (error: Error) => void;
}

/** The object returned by {@link useLazyLoad}. */
export interface LazyLoadApi {
  observe: (
    element: Element,
    callback: (element: Element) => void,
    options?: LazyObserveOptions,
  ) => void;
  unobserve: (element: Element) => void;
  loadSection: (
    url: string,
    container: Element,
    options?: LoadSectionOptions,
  ) => void;
}

/** Shipped skeleton placeholder markup (trusted static string). */
function skeletonHtml(): string {
  return (
    '<div class="vd-skeleton-card" style="position:relative;min-height:200px;padding:2rem;overflow:hidden;">' +
    '<div class="vd-skeleton vd-skeleton-heading-lg" style="margin-bottom:1.5rem;"></div>' +
    '<div class="vd-skeleton vd-skeleton-paragraph">' +
    '<div class="vd-skeleton vd-skeleton-text"></div>' +
    '<div class="vd-skeleton vd-skeleton-text"></div>' +
    '<div class="vd-skeleton vd-skeleton-text"></div></div>' +
    '<div class="vd-dynamic-loader" style="position:absolute;inset:0;">' +
    '<div class="vd-dynamic-loader-grid">' +
    '<div class="vd-spinner vd-spinner-sm vd-spinner-success"></div>' +
    '<div class="vd-spinner vd-spinner-sm vd-spinner-warning"></div>' +
    '<div class="vd-spinner vd-spinner-sm vd-spinner-error"></div>' +
    '<div class="vd-spinner vd-spinner-sm vd-spinner-info"></div></div>' +
    '<span class="vd-dynamic-loader-text">Loading…</span></div></div>'
  );
}

/** Shipped spinner placeholder markup (trusted static string). */
function spinnerHtml(): string {
  return (
    '<div class="vd-dynamic-loader" style="min-height:180px;display:flex;align-items:center;justify-content:center;">' +
    '<div class="vd-dynamic-loader-grid">' +
    '<div class="vd-spinner vd-spinner-sm vd-spinner-success"></div>' +
    '<div class="vd-spinner vd-spinner-sm vd-spinner-warning"></div>' +
    '<div class="vd-spinner vd-spinner-sm vd-spinner-error"></div>' +
    '<div class="vd-spinner vd-spinner-sm vd-spinner-info"></div></div>' +
    '<span class="vd-dynamic-loader-text">Loading…</span></div>'
  );
}

function resolvePlaceholder(placeholder: string | undefined): string {
  if (!placeholder || placeholder === "skeleton") return skeletonHtml();
  if (placeholder === "spinner") return spinnerHtml();
  // Caller-supplied HTML — sanitize before injection.
  return sanitizeHtml(placeholder);
}

/**
 * Same-origin (covers relative paths) or explicit https only. Everything else —
 * cross-origin http, `javascript:`, `data:`, malformed — is rejected.
 */
function isSafeUrl(url: string): boolean {
  try {
    const resolved = new URL(url, window.location.href);
    return (
      resolved.origin === window.location.origin ||
      resolved.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export function useLazyLoad(root?: Ref<HTMLElement | null>): LazyLoadApi {
  const observers = new Map<Element, IntersectionObserver>();
  const timeouts = new Set<ReturnType<typeof setTimeout>>();
  const controllers = new Set<AbortController>();

  const observe = (
    element: Element,
    callback: (element: Element) => void,
    options: LazyObserveOptions = {},
  ): void => {
    if (!(element instanceof Element)) {
      console.warn("[useLazyLoad] observe() requires a DOM Element.");
      return;
    }
    if (typeof callback !== "function") {
      console.warn("[useLazyLoad] observe() requires a callback function.");
      return;
    }
    // Already observed — ignore.
    if (observers.has(element)) return;

    // No IntersectionObserver (SSR / old browsers): load eagerly.
    if (typeof IntersectionObserver === "undefined") {
      try {
        callback(element);
      } catch (e) {
        console.error("[useLazyLoad] Callback threw:", e);
      }
      return;
    }

    const threshold = options.threshold != null ? options.threshold : 0;
    const rootMargin = options.rootMargin || "0px";

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);
            observers.delete(entry.target);
            try {
              callback(entry.target);
            } catch (e) {
              console.error("[useLazyLoad] Callback threw:", e);
            }
          }
        });
      },
      { threshold, rootMargin },
    );

    observers.set(element, observer);
    observer.observe(element);
  };

  const unobserve = (element: Element): void => {
    const observer = observers.get(element);
    if (observer) {
      observer.unobserve(element);
      observer.disconnect();
      observers.delete(element);
    }
  };

  const unobserveAll = (): void => {
    observers.forEach((observer) => observer.disconnect());
    observers.clear();
  };

  const loadSection = (
    url: string,
    container: Element,
    options: LoadSectionOptions = {},
  ): void => {
    if (typeof url !== "string" || !url) {
      console.warn(
        "[useLazyLoad] loadSection() requires a non-empty URL string.",
      );
      return;
    }
    if (!(container instanceof Element)) {
      console.warn(
        "[useLazyLoad] loadSection() requires a DOM Element as container.",
      );
      return;
    }

    const dispatch = (name: string, detail: Record<string, unknown>): void => {
      container.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    };

    // Reject cross-origin http / javascript: / data: / malformed URLs.
    if (!isSafeUrl(url)) {
      const error = new Error("Blocked unsafe URL: " + url);
      console.error("[useLazyLoad] loadSection() blocked unsafe URL:", url);
      dispatch("lazysection:error", { url, error });
      options.onError?.(error);
      return;
    }

    // Placeholder + loading fire immediately; the fetch waits for intersection.
    container.innerHTML = resolvePlaceholder(options.placeholder);
    dispatch("lazysection:loading", { url });

    observe(
      container,
      () => {
        const controller = new AbortController();
        controllers.add(controller);
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        timeouts.add(timeoutId);

        const settle = (): void => {
          clearTimeout(timeoutId);
          timeouts.delete(timeoutId);
          controllers.delete(controller);
        };

        fetch(url, { signal: controller.signal })
          .then((res) => {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.text();
          })
          .then((html) => {
            settle();
            container.innerHTML = sanitizeHtml(html);
            dispatch("lazysection:loaded", { url });
            options.onLoaded?.(container);
          })
          .catch((err: Error) => {
            settle();
            const alertEl = document.createElement("div");
            alertEl.className = "vd-alert vd-alert-error";
            alertEl.setAttribute("role", "alert");
            const msgEl = document.createElement("span");
            msgEl.textContent = "Failed to load content. ";
            const detailEl = document.createElement("small");
            detailEl.style.opacity = "0.7";
            detailEl.textContent = err.message;
            alertEl.append(msgEl, detailEl);
            container.replaceChildren(alertEl);
            dispatch("lazysection:error", { url, error: err });
            console.error("[useLazyLoad] loadSection failed:", err);
            options.onError?.(err);
          });
      },
      { threshold: options.threshold, rootMargin: options.rootMargin },
    );
  };

  const wire = (scope: HTMLElement): void => {
    scope.querySelectorAll<HTMLElement>("[data-vd-lazy]").forEach((el) => {
      // Skip already-observed / already-processed elements.
      if (
        observers.has(el) ||
        el.dataset.vdLazyState === "loading" ||
        el.dataset.vdLazyState === "loaded"
      ) {
        return;
      }

      const url = el.getAttribute("data-vd-lazy");
      if (!url) return;

      el.dataset.vdLazyState = "loading";
      const placeholder =
        el.getAttribute("data-vd-lazy-placeholder") || "skeleton";

      loadSection(url, el, {
        placeholder,
        onLoaded: () => {
          el.dataset.vdLazyState = "loaded";
        },
        onError: () => {
          el.dataset.vdLazyState = "error";
        },
      });
    });
  };

  onMounted(() => {
    if (typeof window === "undefined") return;
    const host = root?.value;
    if (host) wire(host);
  });

  onUnmounted(() => {
    unobserveAll();
    controllers.forEach((c) => c.abort());
    controllers.clear();
    timeouts.forEach((t) => clearTimeout(t));
    timeouts.clear();
  });

  return { observe, unobserve, loadSection };
}
