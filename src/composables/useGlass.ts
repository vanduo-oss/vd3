import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Reproduces `framework/js/components/glass.js`: scroll-aware glass activation.
 * For each `[data-glass-scroll]` element, observes a sentinel (the
 * `data-glass-sentinel` selector, else the previous sibling) and toggles
 * `.is-glass-active` when that sentinel scrolls out of / back into view.
 */
export function useGlass(root: Ref<HTMLElement | null>): void {
  const observers: IntersectionObserver[] = [];

  onMounted(() => {
    const scope = root.value;
    if (!scope || typeof IntersectionObserver === "undefined") return;

    scope.querySelectorAll<HTMLElement>("[data-glass-scroll]").forEach((el) => {
      const selector = el.dataset.glassSentinel;
      let sentinel: Element | null = selector
        ? document.querySelector(selector)
        : null;
      if (!sentinel) sentinel = el.previousElementSibling;

      if (!sentinel) {
        el.classList.add("is-glass-active");
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            el.classList.toggle("is-glass-active", !entry.isIntersecting);
          });
        },
        { threshold: 0, rootMargin: "0px" },
      );
      observer.observe(sentinel);
      observers.push(observer);
    });
  });

  onUnmounted(() => {
    observers.forEach((o) => o.disconnect());
    observers.length = 0;
  });
}
