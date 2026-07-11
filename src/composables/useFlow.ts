import { onMounted, onUnmounted, type Ref } from "vue";

export interface FlowApi {
  /**
   * Jump the given flow element to a slide index (zero-based; wraps with
   * `data-vd-loop`, clamps otherwise). vd3 extension — the old shim
   * returned `void`.
   */
  goTo(el: Element | null, index: number): void;
  /** Advance the given flow element to the next slide. vd3 extension. */
  next(el: Element | null): void;
  /** Return the given flow element to the previous slide. vd3 extension. */
  prev(el: Element | null): void;
  /**
   * Re-scan the root: wires `.vd-flow` / `.vd-carousel` elements added
   * after mount and re-applies slide/indicator ARIA and state classes on
   * existing ones (idempotent — safe after v-for re-renders). vd3
   * extension.
   */
  refresh(): void;
}

interface FlowInstance {
  goTo(index: number): void;
  next(): void;
  prev(): void;
  sync(): void;
}

/**
 * Ports framework/js/components/flow.js — scans `root` for `.vd-flow` /
 * `.vd-carousel` carousels and wires slide transitions (track transform,
 * or `is-active` fading on `.vd-flow-fade`), `.vd-flow-prev` /
 * `.vd-flow-next` controls, indicator dots, ArrowLeft/ArrowRight keyboard
 * on the focusable container, pointer/touch swipe (50px threshold,
 * `is-dragging` class), and autoplay (`data-vd-autoplay`, period from
 * `data-vd-interval`, default 5000ms) pausing on mouseenter/focusin and
 * resuming on mouseleave/focusout. Looping follows `data-vd-loop`
 * (default true: modulo wrap; `"false"`: clamp). Carousel ARIA
 * (`role="region"`, `aria-roledescription="carousel"`, per-slide group
 * roles with "Slide i of n" labels, `aria-hidden` bookkeeping) and a
 * visually-hidden `aria-live="polite"` region announce changes; every
 * navigation dispatches `flow:change` with `{ current, previous, total }`.
 *
 * Indicator bridge (kept from the old shim): bare `<button>`s inside
 * `.vd-flow-indicators` are upgraded with `.vd-flow-indicator` so they
 * render as dots and become interactive; indicators get `role="tab"`,
 * `aria-selected`, `aria-current`, and generated labels. Control and
 * indicator clicks are delegated on the container, so v-for re-renders
 * don't strand listeners.
 *
 * Returns a `FlowApi` controller (vd3 extension — ignore it for
 * shim-compatible usage).
 */
export function useFlow(root: Ref<HTMLElement | null>): FlowApi {
  const instances = new Map<Element, FlowInstance>();
  const cleanups: Array<() => void> = [];

  const initInstance = (el: HTMLElement): void => {
    const track = el.querySelector<HTMLElement>(".vd-flow-track");
    if (!track) return;

    let slides = Array.from(
      track.querySelectorAll<HTMLElement>(".vd-flow-slide"),
    );
    if (slides.length === 0) return;

    const isFade = el.classList.contains("vd-flow-fade");
    const autoplay = el.hasAttribute("data-vd-autoplay");
    const interval =
      parseInt(el.getAttribute("data-vd-interval") ?? "", 10) || 5000;
    const loop = el.getAttribute("data-vd-loop") !== "false";

    const state = { current: 0, total: slides.length };
    let autoplayTimer: number | null = null;
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    const threshold = 50;

    const queryIndicators = (): HTMLElement[] =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          ".vd-flow-indicators button, .vd-flow-indicator",
        ),
      );

    // Idempotent slide bookkeeping: (re)reads the slide list, clamps the
    // current index, and (re)applies per-slide ARIA.
    const syncSlides = (): void => {
      slides = Array.from(
        track.querySelectorAll<HTMLElement>(".vd-flow-slide"),
      );
      state.total = slides.length;
      if (state.current > state.total - 1)
        state.current = Math.max(0, state.total - 1);
      slides.forEach((slide, i) => {
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "slide");
        slide.setAttribute("aria-label", `Slide ${i + 1} of ${state.total}`);
      });
      // Vanilla marked the first slide `is-active` at bootstrap (fade CSS
      // keys off it); only do so when no slide carries it yet.
      const active = slides[state.current];
      if (active && !slides.some((s) => s.classList.contains("is-active")))
        active.classList.add("is-active");
    };

    // Idempotent indicator bookkeeping — includes the shim's bridge that
    // upgrades bare `.vd-flow-indicators` buttons with the styled class.
    const syncIndicators = (): void => {
      queryIndicators().forEach((ind, i) => {
        ind.classList.add("vd-flow-indicator");
        ind.setAttribute("role", "tab");
        if (!ind.getAttribute("aria-label"))
          ind.setAttribute("aria-label", `Go to slide ${i + 1}`);
        ind.classList.toggle("is-active", i === state.current);
        ind.setAttribute(
          "aria-selected",
          i === state.current ? "true" : "false",
        );
        ind.setAttribute(
          "aria-current",
          i === state.current ? "true" : "false",
        );
      });
    };

    // Apply the current index to track/slides/indicators without
    // announcing or dispatching (shared by goTo and refresh-sync).
    const applyState = (): void => {
      if (isFade) {
        slides.forEach((s, i) =>
          s.classList.toggle("is-active", i === state.current),
        );
      } else {
        track.style.transform = `translateX(-${state.current * 100}%)`;
      }
      syncIndicators();
      slides.forEach((s, i) => {
        s.setAttribute("aria-hidden", i !== state.current ? "true" : "false");
      });
    };

    const goTo = (index: number, announce = true): void => {
      if (state.total === 0) return;
      const target = loop
        ? ((index % state.total) + state.total) % state.total
        : Math.max(0, Math.min(index, state.total - 1));

      const previous = state.current;
      state.current = target;
      applyState();

      if (announce)
        liveRegion.textContent = `Slide ${target + 1} of ${state.total}`;

      el.dispatchEvent(
        new CustomEvent("flow:change", {
          detail: { current: target, previous, total: state.total },
        }),
      );
    };

    const next = (): void => goTo(state.current + 1);
    const prev = (): void => goTo(state.current - 1);

    syncSlides();

    el.setAttribute("role", "region");
    el.setAttribute("aria-roledescription", "carousel");
    if (!el.getAttribute("aria-label"))
      el.setAttribute("aria-label", "Carousel");

    // Live region for announcements.
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    liveRegion.style.cssText =
      "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);";
    el.appendChild(liveRegion);
    cleanups.push(() => liveRegion.remove());

    // Controls + indicators via delegation on the container.
    const onClick = (e: Event): void => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".vd-flow-prev")) {
        prev();
        return;
      }
      if (target.closest(".vd-flow-next")) {
        next();
        return;
      }
      const ind = target.closest<HTMLElement>(
        ".vd-flow-indicator, .vd-flow-indicators button",
      );
      if (ind) {
        const i = queryIndicators().indexOf(ind);
        if (i !== -1) goTo(i);
      }
    };
    el.addEventListener("click", onClick);
    cleanups.push(() => el.removeEventListener("click", onClick));

    // Keyboard navigation.
    const keyHandler = (e: KeyboardEvent): void => {
      if (e.key === "ArrowLeft") {
        prev();
        e.preventDefault();
      }
      if (e.key === "ArrowRight") {
        next();
        e.preventDefault();
      }
    };
    el.setAttribute("tabindex", "0");
    el.addEventListener("keydown", keyHandler);
    cleanups.push(() => el.removeEventListener("keydown", keyHandler));

    // Touch / pointer swipe support.
    const pointerDown = (e: MouseEvent | TouchEvent): void => {
      isDragging = true;
      startX =
        (e as MouseEvent).clientX ||
        ((e as TouchEvent).touches && (e as TouchEvent).touches[0]?.clientX) ||
        0;
      currentX = startX;
      el.classList.add("is-dragging");
    };
    const pointerMove = (e: MouseEvent | TouchEvent): void => {
      if (!isDragging) return;
      currentX =
        (e as MouseEvent).clientX ||
        ((e as TouchEvent).touches && (e as TouchEvent).touches[0]?.clientX) ||
        0;
    };
    const pointerUp = (): void => {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove("is-dragging");
      const diff = startX - currentX;
      if (Math.abs(diff) > threshold) {
        if (diff > 0) next();
        else prev();
      }
    };

    el.addEventListener("mousedown", pointerDown);
    el.addEventListener("mousemove", pointerMove);
    el.addEventListener("mouseup", pointerUp);
    el.addEventListener("mouseleave", pointerUp);
    el.addEventListener("touchstart", pointerDown, { passive: true });
    el.addEventListener("touchmove", pointerMove, { passive: true });
    el.addEventListener("touchend", pointerUp);
    cleanups.push(
      () => el.removeEventListener("mousedown", pointerDown),
      () => el.removeEventListener("mousemove", pointerMove),
      () => el.removeEventListener("mouseup", pointerUp),
      () => el.removeEventListener("mouseleave", pointerUp),
      () => el.removeEventListener("touchstart", pointerDown),
      () => el.removeEventListener("touchmove", pointerMove),
      () => el.removeEventListener("touchend", pointerUp),
    );

    // Autoplay (pause on hover/focus).
    const startAutoplay = (): void => {
      stopAutoplay();
      autoplayTimer = window.setInterval(next, interval);
    };
    const stopAutoplay = (): void => {
      if (autoplayTimer != null) {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };
    if (autoplay) {
      startAutoplay();
      el.addEventListener("mouseenter", stopAutoplay);
      el.addEventListener("mouseleave", startAutoplay);
      el.addEventListener("focusin", stopAutoplay);
      el.addEventListener("focusout", startAutoplay);
      cleanups.push(
        () => el.removeEventListener("mouseenter", stopAutoplay),
        () => el.removeEventListener("mouseleave", startAutoplay),
        () => el.removeEventListener("focusin", stopAutoplay),
        () => el.removeEventListener("focusout", startAutoplay),
        () => stopAutoplay(),
      );
    }

    // Initial state (fires flow:change like the vanilla init did, but does
    // not announce).
    goTo(0, false);

    instances.set(el, {
      goTo,
      next,
      prev,
      sync: () => {
        syncSlides();
        applyState();
      },
    });
  };

  const refresh = (): void => {
    if (typeof window === "undefined") return;
    const host = root.value;
    if (!host) return;
    host
      .querySelectorAll<HTMLElement>(".vd-flow, .vd-carousel")
      .forEach((el) => {
        const existing = instances.get(el);
        if (existing) existing.sync();
        else initInstance(el);
      });
  };

  onMounted(refresh);

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    instances.clear();
  });

  return {
    goTo: (el, index) => {
      if (el) instances.get(el)?.goTo(index);
    },
    next: (el) => {
      if (el) instances.get(el)?.next();
    },
    prev: (el) => {
      if (el) instances.get(el)?.prev();
    },
    refresh,
  };
}
