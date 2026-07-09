import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Ports framework/js/components/affix.js — scans `root` for
 * `.vd-affix` / `.vd-sticky` / `[data-vd-affix]` elements, finds the nearest
 * scrollable parent, inserts a sentinel before each element, and toggles
 * `.is-stuck` via IntersectionObserver while the element is pinned. Falls back
 * to the viewport when there is no scrollable parent. Emits `affix:stuck` /
 * `affix:unstuck` with `{ offset, root }`.
 */
function isScrollable(el: Element | null): boolean {
  if (!el || el === document.body) return false;
  const style = window.getComputedStyle(el);
  const canY =
    /(auto|scroll|overlay)/.test(style.overflowY) &&
    el.scrollHeight > el.clientHeight;
  const canX =
    /(auto|scroll|overlay)/.test(style.overflowX) &&
    el.scrollWidth > el.clientWidth;
  return canY || canX;
}

function getScrollParent(el: Element): Element | null {
  let parent = el.parentElement;
  while (
    parent &&
    parent !== document.body &&
    parent !== document.documentElement
  ) {
    if (isScrollable(parent)) return parent;
    parent = parent.parentElement;
  }
  return null;
}

export function useAffix(root: Ref<HTMLElement | null>): void {
  const cleanups: Array<() => void> = [];

  onMounted(() => {
    if (typeof window === "undefined") return;
    const host = root.value;
    if (!host) return;

    const els = host.querySelectorAll<HTMLElement>(
      ".vd-affix, .vd-sticky, [data-vd-affix]",
    );

    els.forEach((el) => {
      const parsed = parseInt(
        el.getAttribute("data-vd-affix-offset") || "0",
        10,
      );
      const offset = Number.isNaN(parsed) ? 0 : parsed;
      const scrollParent = getScrollParent(el);
      let isStuck = false;

      const sentinel = document.createElement("div");
      sentinel.style.cssText =
        "display:block;height:1px;margin-bottom:-1px;visibility:hidden;pointer-events:none;";
      el.parentNode?.insertBefore(sentinel, el);
      el.style.setProperty("--vd-affix-top-offset", offset + "px");

      const stick = (): void => {
        if (isStuck) return;
        isStuck = true;
        el.classList.add("is-stuck");
        el.dispatchEvent(
          new CustomEvent("affix:stuck", {
            bubbles: true,
            detail: { offset, root: scrollParent || window },
          }),
        );
      };

      const unstick = (): void => {
        if (!isStuck) return;
        isStuck = false;
        el.classList.remove("is-stuck");
        el.dispatchEvent(
          new CustomEvent("affix:unstuck", {
            bubbles: true,
            detail: { offset, root: scrollParent || window },
          }),
        );
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) stick();
            else unstick();
          });
        },
        {
          root: scrollParent,
          rootMargin: "-" + offset + "px 0px 0px 0px",
          threshold: 0,
        },
      );
      observer.observe(sentinel);

      cleanups.push(
        () => observer.disconnect(),
        () => {
          if (sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);
        },
        () => {
          el.classList.remove("is-stuck");
          el.style.removeProperty("--vd-affix-top-offset");
        },
      );
    });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });
}
