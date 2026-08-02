import { onMounted, onUnmounted, type Ref } from "vue";

export interface UseStepperOptions {
  /**
   * vd3 extension: per-item reveal stagger step in milliseconds for
   * `.vd-stepper-animated` containers (mirrors timeline `STAGGER_MS`).
   * Default `140`.
   */
  staggerMs?: number;
  /**
   * vd3 extension: cap applied to the stagger index so late items share the
   * same delay (mirrors timeline `MAX_STAGGER_INDEX`). Default `7`.
   */
  maxStaggerIndex?: number;
}

export interface StepperApi {
  /** Advance the given stepper element to the next step. */
  next(el: Element | null): void;
  /** Return the given stepper element to the previous step. */
  prev(el: Element | null): void;
  /** Set the active step of the given stepper element (zero-based). */
  setStep(el: Element | null, index: number): void;
}

interface Instance {
  setStep(index: number): void;
  next(): void;
  prev(): void;
}

const STAGGER_MS = 140;
const MAX_STAGGER_INDEX = 7;

/**
 * Ports framework/js/components/stepper.js — scans `root` for `.vd-stepper`
 * containers and manages step state. The active index is derived from the
 * initial `.is-active` item; `setStep` marks earlier items `.is-completed`,
 * the target `.is-active`, and dispatches `stepper:change` with
 * `{ current, previous, total }`. `.vd-stepper-clickable` steppers navigate on
 * item click. Containers that also carry `.vd-stepper-animated` get the same
 * staggered IntersectionObserver reveal as timeline (per-item
 * `--vd-stepper-reveal-delay`, `.is-revealed` on intersect). The returned
 * imperative API lets the page wire the docs `data-stepper-demo-control`
 * Prev/Next buttons.
 */
export function useStepper(
  root: Ref<HTMLElement | null>,
  options?: UseStepperOptions,
): StepperApi {
  const staggerMs = options?.staggerMs ?? STAGGER_MS;
  const maxStaggerIndex = options?.maxStaggerIndex ?? MAX_STAGGER_INDEX;

  const instances = new Map<Element, Instance>();
  const cleanups: Array<() => void> = [];

  const initAnimatedReveal = (items: HTMLElement[]): void => {
    items.forEach((item, i) => {
      const idx = Math.min(i, maxStaggerIndex);
      item.style.setProperty(
        "--vd-stepper-reveal-delay",
        idx * staggerMs + "ms",
      );
    });

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      items.forEach((item) => {
        item.classList.add("is-revealed");
      });
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      items.forEach((item) => {
        item.classList.add("is-revealed");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.15,
      },
    );

    items.forEach((item) => {
      observer.observe(item);
    });

    cleanups.push(() => observer.disconnect());
  };

  onMounted(() => {
    const host = root.value;
    if (!host) return;

    host.querySelectorAll<HTMLElement>(".vd-stepper").forEach((el) => {
      const items = Array.from(
        el.querySelectorAll<HTMLElement>(".vd-stepper-item"),
      );
      const isClickable = el.classList.contains("vd-stepper-clickable");
      let currentIndex = items.findIndex((i) =>
        i.classList.contains("is-active"),
      );
      if (currentIndex === -1) currentIndex = 0;

      // `dispatch` is false only for the initial paint below: applying the
      // derived starting step is not a user-visible "change", so emitting
      // `stepper:change` on mount (where current === previous) is spurious.
      const setStep = (index: number, dispatch = true): void => {
        if (index < 0 || index >= items.length) return;
        const prev = currentIndex;
        currentIndex = index;
        items.forEach((item, i) => {
          item.classList.remove("is-active", "is-completed");
          item.removeAttribute("aria-current");
          if (i < index) item.classList.add("is-completed");
          else if (i === index) {
            item.classList.add("is-active");
            item.setAttribute("aria-current", "step");
          }
        });
        if (!dispatch) return;
        el.dispatchEvent(
          new CustomEvent("stepper:change", {
            detail: { current: index, previous: prev, total: items.length },
            bubbles: true,
          }),
        );
      };

      if (isClickable) {
        items.forEach((item, i) => {
          const handler = (): void => setStep(i);
          item.addEventListener("click", handler);
          const keyHandler = (e: KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setStep(i);
            }
          };
          item.addEventListener("keydown", keyHandler);
          cleanups.push(() => item.removeEventListener("click", handler));
          cleanups.push(() => item.removeEventListener("keydown", keyHandler));
        });
      }

      if (el.classList.contains("vd-stepper-animated")) {
        initAnimatedReveal(items);
      }

      // Initial paint: apply the derived step silently (no stepper:change).
      setStep(currentIndex, false);

      instances.set(el, {
        setStep,
        next: () => setStep(currentIndex + 1),
        prev: () => setStep(currentIndex - 1),
      });
    });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    instances.clear();
  });

  return {
    next: (el) => {
      if (el) instances.get(el)?.next();
    },
    prev: (el) => {
      if (el) instances.get(el)?.prev();
    },
    setStep: (el, index) => {
      if (el) instances.get(el)?.setStep(index);
    },
  };
}
