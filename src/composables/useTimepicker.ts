import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Ports framework/js/components/timepicker.js — scans `root` for
 * `[data-vd-timepicker]` inputs and attaches a scrollable time-selection
 * dropdown (12h/24h format, configurable minute step). The popup is appended to
 * `document.body` (position:fixed) and anchored under the input; opens on focus,
 * selects on click, closes on outside-click / Escape, repositions on
 * scroll/resize.
 *
 * Fix-to-documented-intent: `timepicker:select` fires the documented
 * `{ time, hours, minutes }` detail (the Vanilla JS fired `{ display, value }`,
 * so the documented `event.detail.time/hours/minutes` were undefined).
 */
function positionAnchoredPopup(
  anchor: HTMLElement,
  popup: HTMLElement,
  gap = 4,
): void {
  const padding = 8;
  const rect = anchor.getBoundingClientRect();
  popup.style.minWidth = Math.max(rect.width, 0) + "px";

  let top = rect.bottom + gap;
  let left = rect.left;
  popup.style.top = top + "px";
  popup.style.left = left + "px";

  const popRect = popup.getBoundingClientRect();
  if (
    popRect.bottom > window.innerHeight - padding &&
    rect.top - popRect.height > padding
  ) {
    top = rect.top - popRect.height - gap;
    popup.style.top = top + "px";
  }

  const alignedRect = popup.getBoundingClientRect();
  left = rect.left;
  if (left + alignedRect.width > window.innerWidth - padding) {
    left = window.innerWidth - alignedRect.width - padding;
  }
  popup.style.left = Math.max(padding, left) + "px";
}

export function useTimepicker(root: Ref<HTMLElement | null>): void {
  const cleanups: Array<() => void> = [];

  onMounted(() => {
    if (typeof window === "undefined") return;
    const host = root.value;
    if (!host) return;

    host
      .querySelectorAll<HTMLInputElement>("[data-vd-timepicker]")
      .forEach((input) => {
        const is24h = input.getAttribute("data-vd-timepicker-format") === "24h";
        const step = parseInt(
          input.getAttribute("data-vd-timepicker-step") || "30",
          10,
        );

        const popup = document.createElement("div");
        popup.className = "vd-timepicker-popup";
        popup.setAttribute("role", "listbox");
        document.body.appendChild(popup);

        const times: { display: string; value: string }[] = [];
        for (let h = 0; h < 24; h++) {
          for (let m = 0; m < 60; m += step) {
            const hh24 = String(h).padStart(2, "0");
            const mm = String(m).padStart(2, "0");
            if (is24h) {
              times.push({ display: hh24 + ":" + mm, value: hh24 + ":" + mm });
            } else {
              const period = h < 12 ? "AM" : "PM";
              const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
              times.push({
                display: h12 + ":" + mm + " " + period,
                value: hh24 + ":" + mm,
              });
            }
          }
        }

        const render = (): void => {
          popup.innerHTML = "";
          times.forEach((t) => {
            const item = document.createElement("div");
            item.className = "vd-timepicker-item";
            item.setAttribute("role", "option");
            item.textContent = t.display;
            if (input.value === t.value || input.value === t.display) {
              item.classList.add("is-selected");
              item.setAttribute("aria-selected", "true");
            }
            item.addEventListener("click", () => {
              input.value = t.display;
              popup.querySelectorAll(".vd-timepicker-item").forEach((i) => {
                i.classList.remove("is-selected");
                i.removeAttribute("aria-selected");
              });
              item.classList.add("is-selected");
              item.setAttribute("aria-selected", "true");
              close();
              const [hh, mm] = t.value.split(":");
              input.dispatchEvent(
                new CustomEvent("timepicker:select", {
                  bubbles: true,
                  detail: {
                    time: t.display,
                    hours: parseInt(hh, 10),
                    minutes: parseInt(mm, 10),
                  },
                }),
              );
              input.dispatchEvent(new Event("change", { bubbles: true }));
            });
            popup.appendChild(item);
          });
        };

        const positionPopup = (): void => {
          if (!popup.classList.contains("is-open")) return;
          positionAnchoredPopup(input, popup);
        };

        const open = (): void => {
          render();
          popup.classList.add("is-open");
          input.setAttribute("aria-expanded", "true");
          requestAnimationFrame(() => {
            positionPopup();
            const selected = popup.querySelector(".is-selected");
            if (selected) selected.scrollIntoView({ block: "center" });
          });
        };

        const close = (): void => {
          popup.classList.remove("is-open");
          input.setAttribute("aria-expanded", "false");
        };

        const focusHandler = (): void => open();
        const outsideHandler = (e: Event): void => {
          const target = e.target as Node;
          if (!input.contains(target) && !popup.contains(target)) close();
        };
        const escHandler = (e: KeyboardEvent): void => {
          if (e.key === "Escape") close();
        };
        const repositionHandler = (): void => positionPopup();

        input.addEventListener("focus", focusHandler);
        document.addEventListener("click", outsideHandler, true);
        document.addEventListener("keydown", escHandler);
        window.addEventListener("resize", repositionHandler);
        window.addEventListener("scroll", repositionHandler, true);
        input.setAttribute("aria-haspopup", "listbox");
        input.setAttribute("aria-expanded", "false");
        input.setAttribute("autocomplete", "off");
        input.readOnly = true;

        cleanups.push(
          () => input.removeEventListener("focus", focusHandler),
          () => document.removeEventListener("click", outsideHandler, true),
          () => document.removeEventListener("keydown", escHandler),
          () => window.removeEventListener("resize", repositionHandler),
          () => window.removeEventListener("scroll", repositionHandler, true),
          () => popup.remove(),
        );
      });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });
}
