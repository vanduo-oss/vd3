import { onMounted, onUnmounted, type Ref } from "vue";
import { sanitizeHtml } from "../utils/sanitizeHtml";

export type UseTooltipsOptions = {
  /** Default show delay (ms) when a trigger has no data-tooltip-delay. */
  showDelay?: number;
};

/**
 * Reproduces the framework's `Vanduo.init()` tooltip wiring in Vue: scans a root
 * element for `[data-tooltip]` / `[data-tooltip-html]` triggers and shows a
 * `.vd-tooltip` (styled by the framework CSS) on hover/focus.
 *
 * `data-tooltip-html` is run through the whitelist sanitizer before insertion —
 * mirroring the framework's tooltips.js, which sanitizes too. (`data-tooltip`
 * stays plain text via textContent.)
 */
export function useTooltips(
  root: Ref<HTMLElement | null>,
  options: UseTooltipsOptions = {},
): void {
  let current: HTMLElement | null = null;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  const wired = new WeakSet<HTMLElement>();
  const cleanups: Array<() => void> = [];

  const clearShowTimer = (): void => {
    if (showTimer !== null) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  };

  const hide = (): void => {
    clearShowTimer();
    if (current) {
      current.remove();
      current = null;
    }
  };

  const place = (
    trigger: HTMLElement,
    tip: HTMLElement,
    placement: string,
  ): void => {
    const r = trigger.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const gap = 8;
    let top: number;
    let left: number;
    switch (placement) {
      case "bottom":
        top = r.bottom + gap;
        left = r.left + r.width / 2 - t.width / 2;
        break;
      case "left":
        top = r.top + r.height / 2 - t.height / 2;
        left = r.left - t.width - gap;
        break;
      case "right":
        top = r.top + r.height / 2 - t.height / 2;
        left = r.right + gap;
        break;
      default:
        top = r.top - t.height - gap;
        left = r.left + r.width / 2 - t.width / 2;
    }
    tip.style.top = `${Math.max(4, top)}px`;
    tip.style.left = `${Math.max(4, left)}px`;
  };

  const show = (trigger: HTMLElement): void => {
    hide();
    const text = trigger.getAttribute("data-tooltip");
    const html = trigger.getAttribute("data-tooltip-html");
    if (!text && !html) return;
    const placement = trigger.getAttribute("data-tooltip-placement") ?? "top";
    const variant = trigger.getAttribute("data-tooltip-variant");
    const size = trigger.getAttribute("data-tooltip-size");

    const tip = document.createElement("div");
    tip.className =
      "vd-tooltip vd-tooltip-" +
      placement +
      (variant ? " vd-tooltip-" + variant : "") +
      (size ? " vd-tooltip-" + size : "") +
      (html ? " vd-tooltip-html" : "");
    tip.setAttribute("data-placement", placement);
    tip.style.position = "fixed";
    if (html) tip.innerHTML = sanitizeHtml(html, { allowStyle: false });
    else tip.textContent = text;

    document.body.appendChild(tip);
    place(trigger, tip, placement);
    requestAnimationFrame(() => tip.classList.add("is-visible"));
    current = tip;
  };

  const resolveDelay = (trigger: HTMLElement): number => {
    const attr = trigger.getAttribute("data-tooltip-delay");
    if (attr !== null && attr !== "") {
      const parsed = Number.parseInt(attr, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
    }
    return options.showDelay ?? 0;
  };

  const scheduleShow = (trigger: HTMLElement): void => {
    clearShowTimer();
    const delay = resolveDelay(trigger);
    if (delay <= 0) {
      show(trigger);
      return;
    }
    showTimer = setTimeout(() => {
      showTimer = null;
      show(trigger);
    }, delay);
  };

  const wireTrigger = (trigger: HTMLElement): void => {
    if (wired.has(trigger)) return;
    if (
      !trigger.hasAttribute("data-tooltip") &&
      !trigger.hasAttribute("data-tooltip-html")
    ) {
      return;
    }
    wired.add(trigger);
    const onEnter = (): void => scheduleShow(trigger);
    const onLeave = (): void => hide();
    trigger.addEventListener("mouseenter", onEnter);
    trigger.addEventListener("mouseleave", onLeave);
    trigger.addEventListener("focus", onEnter);
    trigger.addEventListener("blur", onLeave);
    cleanups.push(() => {
      trigger.removeEventListener("mouseenter", onEnter);
      trigger.removeEventListener("mouseleave", onLeave);
      trigger.removeEventListener("focus", onEnter);
      trigger.removeEventListener("blur", onLeave);
    });
  };

  const scan = (el: HTMLElement): void => {
    if (el.matches("[data-tooltip],[data-tooltip-html]") && !wired.has(el)) {
      wireTrigger(el);
    }
    el.querySelectorAll<HTMLElement>(
      "[data-tooltip],[data-tooltip-html]",
    ).forEach(wireTrigger);
  };

  onMounted(() => {
    const el = root.value;
    if (!el) return;
    scan(el);
    if (typeof MutationObserver !== "undefined") {
      const mo = new MutationObserver(() => scan(el));
      mo.observe(el, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "data-tooltip",
          "data-tooltip-html",
          "data-tooltip-delay",
        ],
      });
      cleanups.push(() => mo.disconnect());
    }
  });

  onUnmounted(() => {
    hide();
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });
}
