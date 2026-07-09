import { onMounted, onUnmounted, type Ref } from "vue";

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

/**
 * Ports framework/js/components/stepper.js — scans `root` for `.vd-stepper`
 * containers and manages step state. The active index is derived from the
 * initial `.is-active` item; `setStep` marks earlier items `.is-completed`,
 * the target `.is-active`, and dispatches `stepper:change` with
 * `{ current, previous, total }`. `.vd-stepper-clickable` steppers navigate on
 * item click. The returned imperative API lets the page wire the docs
 * `data-stepper-demo-control` Prev/Next buttons.
 */
export function useStepper(root: Ref<HTMLElement | null>): StepperApi {
  const instances = new Map<Element, Instance>();
  const cleanups: Array<() => void> = [];

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

      const setStep = (index: number): void => {
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

      setStep(currentIndex);

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
