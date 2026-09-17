import { onMounted, onUnmounted, type Ref } from "vue";
import { sanitizeHtml } from "../utils/sanitizeHtml";

export type UseTooltipsOptions = {
  /** Default show delay (ms) when a trigger has no data-tooltip-delay. */
  showDelay?: number;
};

let tooltipId = 0;
const owners = new WeakSet<HTMLElement>();
const selector = "[data-tooltip],[data-tooltip-html]";

/** Wire tooltip triggers within a mounted root. Rich content is sanitized. */
export function useTooltips(
  root: Ref<HTMLElement | null>,
  options: UseTooltipsOptions = {},
): void {
  let current: HTMLElement | null = null;
  let active: HTMLElement | null = null;
  let described: HTMLElement | null = null;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let observer: MutationObserver | null = null;
  const wired = new Map<HTMLElement, () => void>();

  const clearTimers = (): void => {
    if (showTimer !== null) clearTimeout(showTimer);
    if (hideTimer !== null) clearTimeout(hideTimer);
    showTimer = hideTimer = null;
  };

  const hide = (): void => {
    clearTimers();
    if (current && described) {
      const ids = (described.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter((id) => id && id !== current?.id);
      if (ids.length) described.setAttribute("aria-describedby", ids.join(" "));
      else described.removeAttribute("aria-describedby");
    }
    current?.remove();
    current = active = described = null;
  };

  const place = (
    trigger: HTMLElement,
    tip: HTMLElement,
    preferred: string,
  ): void => {
    const r = trigger.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const gap = 8;
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = document.documentElement.clientHeight || window.innerHeight;
    const positions: Record<string, [number, number]> = {
      top: [r.top - t.height - gap, r.left + (r.width - t.width) / 2],
      bottom: [r.bottom + gap, r.left + (r.width - t.width) / 2],
      left: [r.top + (r.height - t.height) / 2, r.left - t.width - gap],
      right: [r.top + (r.height - t.height) / 2, r.right + gap],
    };
    const opposite: Record<string, string> = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
    };
    let placement = Object.hasOwn(positions, preferred) ? preferred : "top";
    const fits = ([top, left]: [number, number]): boolean =>
      top >= 4 &&
      left >= 4 &&
      top + t.height <= height - 4 &&
      left + t.width <= width - 4;
    if (!fits(positions[placement]) && fits(positions[opposite[placement]]))
      placement = opposite[placement];
    const [top, left] = positions[placement];
    tip.dataset.placement = placement;
    tip.classList.add(`vd-tooltip-${placement}`);
    tip.style.top = `${Math.max(4, Math.min(top, height - t.height - 4))}px`;
    tip.style.left = `${Math.max(4, Math.min(left, width - t.width - 4))}px`;
  };

  const delayedHide = (): void => {
    if (active?.contains(document.activeElement)) return;
    if (showTimer !== null) clearTimeout(showTimer);
    showTimer = null;
    if (hideTimer !== null) clearTimeout(hideTimer);
    // Allow the pointer to cross the gap onto the tooltip surface.
    hideTimer = setTimeout(hide, 120);
  };

  const show = (trigger: HTMLElement, focusTarget?: HTMLElement): void => {
    hide();
    const text = trigger.getAttribute("data-tooltip");
    const html = trigger.getAttribute("data-tooltip-html");
    if (!text && !html) return;
    const placement = trigger.getAttribute("data-tooltip-placement") ?? "top";
    const tip = document.createElement("div");
    tip.id = `vd-tooltip-${++tooltipId}`;
    tip.className = "vd-tooltip";
    for (const attr of ["variant", "size"]) {
      const value = trigger.getAttribute(`data-tooltip-${attr}`);
      if (value && /^[\w-]+$/.test(value))
        tip.classList.add(`vd-tooltip-${value}`);
    }
    tip.setAttribute("role", "tooltip");
    tip.style.position = "fixed";
    tip.style.margin = "0";
    tip.style.pointerEvents = "auto";
    tip.style.maxWidth =
      "min(var(--vd-tooltip-max-width, 300px), calc(100vw - 8px))";
    if (html) {
      tip.classList.add("vd-tooltip-html");
      tip.innerHTML = sanitizeHtml(html, { allowStyle: false });
      // A tooltip describes its trigger; it must not contain another control.
      tip
        .querySelectorAll("a")
        .forEach((anchor) => anchor.removeAttribute("href"));
    } else tip.textContent = text;
    document.body.appendChild(tip);
    active = trigger;
    described =
      focusTarget ??
      trigger.querySelector<HTMLElement>(
        "button, a[href], input, select, textarea, [tabindex]",
      ) ??
      trigger;
    const ids = (described.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean);
    described.setAttribute("aria-describedby", [...ids, tip.id].join(" "));
    current = tip;
    place(described, tip, placement);
    tip.addEventListener("mouseenter", clearTimers);
    tip.addEventListener("mouseleave", delayedHide);
    requestAnimationFrame(() => {
      if (current === tip) tip.classList.add("is-visible");
    });
  };

  const scheduleShow = (trigger: HTMLElement, event: Event): void => {
    clearTimers();
    const attr = Number.parseInt(
      trigger.getAttribute("data-tooltip-delay") ?? "",
      10,
    );
    const delay =
      Number.isFinite(attr) && attr >= 0
        ? attr
        : Math.max(0, options.showDelay ?? 0);
    const target =
      event.type === "focus" && event.target instanceof HTMLElement
        ? event.target
        : undefined;
    if (delay === 0) show(trigger, target);
    else showTimer = setTimeout(() => show(trigger, target), delay);
  };

  const scan = (el: HTMLElement): void => {
    for (const [trigger, cleanup] of wired) {
      if (!el.contains(trigger) || !trigger.matches(selector)) {
        if (trigger === active) hide();
        cleanup();
        wired.delete(trigger);
      }
    }
    const triggers = [...el.querySelectorAll<HTMLElement>(selector)];
    if (el.matches(selector)) triggers.unshift(el);
    for (const trigger of triggers) {
      if (owners.has(trigger)) continue;
      owners.add(trigger);
      const enter = (event: Event): void => scheduleShow(trigger, event);
      trigger.addEventListener("mouseenter", enter);
      trigger.addEventListener("mouseleave", delayedHide);
      trigger.addEventListener("focus", enter, true);
      trigger.addEventListener("blur", hide, true);
      wired.set(trigger, () => {
        clearTimers();
        trigger.removeEventListener("mouseenter", enter);
        trigger.removeEventListener("mouseleave", delayedHide);
        trigger.removeEventListener("focus", enter, true);
        trigger.removeEventListener("blur", hide, true);
        owners.delete(trigger);
      });
    }
  };

  const dismiss = (event: KeyboardEvent): void => {
    if (event.key === "Escape") hide();
  };
  onMounted(() => {
    const el = root.value;
    if (!el) return;
    scan(el);
    document.addEventListener("keydown", dismiss);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver((records) => {
        scan(el);
        if (
          active &&
          current &&
          records.some(
            (record) =>
              record.type === "attributes" && record.target === active,
          )
        ) {
          show(active, described ?? undefined);
        }
      });
      observer.observe(el, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "data-tooltip",
          "data-tooltip-html",
          "data-tooltip-delay",
          "data-tooltip-placement",
        ],
      });
    }
  });

  onUnmounted(() => {
    hide();
    observer?.disconnect();
    wired.forEach((cleanup) => cleanup());
    wired.clear();
    if (typeof document !== "undefined")
      document.removeEventListener("keydown", dismiss);
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    }
  });
}
