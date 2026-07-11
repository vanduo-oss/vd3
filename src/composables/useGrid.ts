import { onMounted, onUnmounted, ref, type Ref } from "vue";

/**
 * Ports `framework/js/components/grid.js` — the standard⇄Fibonacci grid mode
 * switcher — split into two vd3-house-style pieces:
 *
 * - `useGrid(container, { mode? })` manages one container element: it toggles
 *   the `vd-grid-standard` / `vd-grid-fibonacci` classes, keeps the
 *   `data-layout-mode` attribute and the region `aria-label`
 *   ("Grid layout: <mode> mode") in sync, dispatches a bubbling
 *   `grid:modechange` CustomEvent with `{ container, mode }`, and — only in
 *   browsers without `:has()` support — writes the donor's inline
 *   `grid-template-columns` Fibonacci fallback on each `.vd-row` / `.row` by
 *   child-column count (1 / 1-1.618 / 2-3-5 / 1-2-3-5 / equal beyond four),
 *   clearing those inline styles when returning to standard. Returns a
 *   reactive `mode` plus imperative `toggle()` / `setMode(mode)`.
 *
 * - `setGridSystem(mode)` is the new document-level default: it stamps
 *   `data-grid="fibonacci"` on `<html>` (or removes the attribute for
 *   `standard`), mirroring how the theme layer stamps `data-theme`. It is
 *   client-guarded and NOT persisted — a grid system is an app-bootstrap
 *   decision, unlike a user's theme preference.
 *
 * Dropped vanilla-layer concepts: the `[data-layout-mode]` / `[data-grid-toggle]`
 * DOM scanning + auto-init, the instances registry, toggle-button `aria-pressed`
 * bookkeeping (the caller binds `toggle()` to its own button and spec's
 * `aria-pressed` in its template), and `Vanduo.register` / `window.Vanduo*`.
 */

/** Grid layout mode: the 12-column default or the Fibonacci proportions. */
export type GridMode = "standard" | "fibonacci";

export interface UseGridOptions {
  /**
   * Initial mode. When omitted, the container's existing `data-layout-mode`
   * attribute is read (default `"standard"`).
   */
  mode?: GridMode;
}

export interface UseGridController {
  /** Reactive current mode of the managed container. */
  mode: Ref<GridMode>;
  /** Flip standard⇄fibonacci based on the container's current mode. */
  toggle(): void;
  /** Apply a specific mode; invalid values are ignored (no-op). */
  setMode(mode: GridMode): void;
}

/** Normalize an arbitrary value to a valid mode (`"standard"` is the default). */
const coerceMode = (value: string | null | undefined): GridMode =>
  value === "fibonacci" ? "fibonacci" : "standard";

/**
 * Whether the engine supports the `:has()` selector the Fibonacci CSS relies
 * on. Computed lazily (never at module scope) so it stays SSR-safe; falls back
 * to `false` when `CSS.supports` is missing or throws, which triggers the inline
 * `grid-template-columns` fallback exactly like the donor.
 */
function supportsHas(): boolean {
  try {
    return typeof CSS !== "undefined" && CSS.supports("selector(:has(*))");
  } catch {
    return false;
  }
}

export function useGrid(
  container: Ref<HTMLElement | null>,
  options: UseGridOptions = {},
): UseGridController {
  const mode = ref<GridMode>(coerceMode(options.mode));
  let hasHas = true;
  // The element captured at mount, so teardown works even after Vue has reset
  // the template ref to null (mirrors the donor's instances-map entry).
  let target: HTMLElement | null = null;

  const applyFibFallback = (el: HTMLElement): void => {
    if (hasHas) return;
    el.querySelectorAll<HTMLElement>(".vd-row, .row").forEach((row) => {
      const count = row.querySelectorAll(
        ':scope > [class*="vd-col-"], :scope > [class*="col-"]',
      ).length;
      if (count === 1) row.style.gridTemplateColumns = "1fr";
      else if (count === 2) row.style.gridTemplateColumns = "1fr 1.618fr";
      else if (count === 3) row.style.gridTemplateColumns = "2fr 3fr 5fr";
      else if (count === 4) row.style.gridTemplateColumns = "1fr 2fr 3fr 5fr";
      else row.style.gridTemplateColumns = "repeat(" + count + ", 1fr)";
    });
  };

  const removeFibFallback = (el: HTMLElement): void => {
    el.querySelectorAll<HTMLElement>(".vd-row, .row").forEach((row) => {
      row.style.gridTemplateColumns = "";
    });
  };

  const apply = (el: HTMLElement, next: GridMode): void => {
    el.classList.remove("vd-grid-standard", "vd-grid-fibonacci");
    if (next === "fibonacci") {
      el.classList.add("vd-grid-fibonacci");
      applyFibFallback(el);
    } else {
      el.classList.add("vd-grid-standard");
      removeFibFallback(el);
    }
    el.setAttribute("data-layout-mode", next);
    el.setAttribute("aria-label", "Grid layout: " + next + " mode");
    mode.value = next;
    el.dispatchEvent(
      new CustomEvent("grid:modechange", {
        bubbles: true,
        detail: { container: el, mode: next },
      }),
    );
  };

  const setMode = (next: GridMode): void => {
    if (next !== "fibonacci" && next !== "standard") return;
    const el = container.value;
    if (!el) return;
    apply(el, next);
  };

  const toggle = (): void => {
    const el = container.value;
    if (!el) return;
    const current = coerceMode(el.getAttribute("data-layout-mode"));
    apply(el, current === "fibonacci" ? "standard" : "fibonacci");
  };

  onMounted(() => {
    if (typeof document === "undefined") return;
    const el = container.value;
    if (!el) return;
    target = el;
    hasHas = supportsHas();
    el.setAttribute("role", "region");
    // Option wins; otherwise adopt the container's own data-layout-mode.
    const initial =
      options.mode !== undefined
        ? coerceMode(options.mode)
        : coerceMode(el.getAttribute("data-layout-mode"));
    apply(el, initial);
  });

  onUnmounted(() => {
    const el = target ?? container.value;
    if (!el) return;
    el.classList.remove("vd-grid-standard", "vd-grid-fibonacci");
    el.removeAttribute("aria-label");
    removeFibFallback(el);
    target = null;
  });

  return { mode, toggle, setMode };
}

/**
 * Set the document-level grid system default by stamping `data-grid="fibonacci"`
 * on `<html>` (or removing the attribute for `"standard"`). Client-guarded and
 * intentionally NOT persisted — mirror the theme layer's `data-theme`, but as a
 * bootstrap decision rather than a stored user preference. The backing
 * `[data-grid="fibonacci"]` CSS applies the Fibonacci template to `.vd-row`s
 * outside an explicit `.vd-grid-standard` container (closest container wins).
 */
export function setGridSystem(mode: GridMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "fibonacci") root.setAttribute("data-grid", "fibonacci");
  else root.removeAttribute("data-grid");
}
