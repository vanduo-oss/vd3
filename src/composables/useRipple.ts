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
 * Color variants (`.vd-ripple-dark`, `[data-vd-ripple="primary"]`, …) are
 * pure CSS and need no JS involvement.
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

    els.forEach((el) => {
      const createWave = (e: MouseEvent | TouchEvent): void => {
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const pointer = e as MouseEvent & Partial<TouchEvent>;
        const touch = pointer.touches && pointer.touches[0];
        const x =
          (pointer.clientX ||
            (touch && touch.clientX) ||
            rect.left + rect.width / 2) -
          rect.left -
          size / 2;
        const y =
          (pointer.clientY ||
            (touch && touch.clientY) ||
            rect.top + rect.height / 2) -
          rect.top -
          size / 2;

        const wave = document.createElement("span");
        wave.className = "vd-ripple-wave";
        wave.style.width = size + "px";
        wave.style.height = size + "px";
        wave.style.left = x + "px";
        wave.style.top = y + "px";

        el.appendChild(wave);

        wave.addEventListener("animationend", () => {
          if (wave.parentNode) wave.parentNode.removeChild(wave);
        });
      };

      el.addEventListener("mousedown", createWave);
      el.addEventListener("touchstart", createWave, { passive: true });

      cleanups.push(
        () => el.removeEventListener("mousedown", createWave),
        () => el.removeEventListener("touchstart", createWave),
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
