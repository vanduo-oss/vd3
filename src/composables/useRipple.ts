import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Ports framework/js/components/ripple.js — wires every `.vd-ripple` /
 * `[data-vd-ripple]` element under `root` (including the root element itself
 * when it matches, mirroring the framework's `Vanduo.queryAll`) with
 * `mousedown` and passive `touchstart` handlers that append a
 * `.vd-ripple-wave` span sized to `max(width, height)` of the element and
 * positioned so the wave centers on the pointer (element center when pointer
 * coordinates are unavailable). Each wave removes itself on `animationend`;
 * the expand animation itself lives in the ripple CSS. Unmount removes this
 * instance's handlers and any lingering `.vd-ripple-wave` elements — other
 * instances' wiring is untouched.
 *
 * Extensions over the vanilla shim:
 * - `data-vd-ripple-color` sets a custom `--vd-ripple-color` on the wave.
 * - `data-vd-ripple-centered` centers the wave on the element (ignores pointer).
 * - Touch/mouse deduplication prevents double ripples on touch devices.
 * - `aria-hidden="true"` on waves so screen readers skip them.
 * - Respects `prefers-reduced-motion: reduce` (no waves spawned).
 */
export function useRipple(root: Ref<HTMLElement | null>): void {
  const cleanups: Array<() => void> = [];

  onMounted(() => {
    if (typeof window === "undefined") return;
    const host = root.value;
    if (!host) return;

    const selector = ".vd-ripple, [data-vd-ripple]";
    const els: HTMLElement[] = [];
    if (host.matches(selector)) els.push(host);
    host.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      els.push(el);
    });

    const prefersReducedMotion = (): boolean =>
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    els.forEach((el) => {
      let lastTouchTime = 0;

      const createWave = (e: MouseEvent | TouchEvent): void => {
        if (prefersReducedMotion()) return;

        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const pointer = e as MouseEvent & Partial<TouchEvent>;
        const touch = pointer.touches && pointer.touches[0];
        const centered = el.hasAttribute("data-vd-ripple-centered");
        const x = centered
          ? (rect.width - size) / 2
          : (pointer.clientX ||
              (touch && touch.clientX) ||
              rect.left + rect.width / 2) -
            rect.left -
            size / 2;
        const y = centered
          ? (rect.height - size) / 2
          : (pointer.clientY ||
              (touch && touch.clientY) ||
              rect.top + rect.height / 2) -
            rect.top -
            size / 2;

        const wave = document.createElement("span");
        wave.className = "vd-ripple-wave";
        wave.setAttribute("aria-hidden", "true");
        wave.style.width = size + "px";
        wave.style.height = size + "px";
        wave.style.left = x + "px";
        wave.style.top = y + "px";

        const customColor = el.getAttribute("data-vd-ripple-color");
        if (customColor) {
          wave.style.setProperty("--vd-ripple-color", customColor);
        }

        el.appendChild(wave);

        wave.addEventListener("animationend", () => {
          if (wave.parentNode) wave.parentNode.removeChild(wave);
        });
      };

      const onMouseDown = (e: MouseEvent): void => {
        // Ignore mouse events that immediately follow a touch (deduplication).
        if (Date.now() - lastTouchTime < 500) return;
        createWave(e);
      };

      const onTouchStart = (e: TouchEvent): void => {
        lastTouchTime = Date.now();
        createWave(e);
      };

      el.addEventListener("mousedown", onMouseDown);
      el.addEventListener("touchstart", onTouchStart, { passive: true });

      cleanups.push(
        () => el.removeEventListener("mousedown", onMouseDown),
        () => el.removeEventListener("touchstart", onTouchStart),
        () => {
          el.querySelectorAll(".vd-ripple-wave").forEach((w) => w.remove());
        },
      );
    });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });
}
