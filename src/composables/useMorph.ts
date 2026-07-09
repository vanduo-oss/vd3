import { onMounted, onUnmounted, type Ref } from "vue";

const MORPH_DURATION_MS = 750;

/**
 * Reproduces `framework/js/components/morph.js`: a liquid wave content-swap on
 * click for `.vd-morph` / `[data-vd-morph]` elements. Auto-creates the
 * `.vd-morph-wave` / `.vd-morph-shine` layers, originates the wave at the
 * pointer, adds `.is-morphing` for the animation window, then swaps
 * `.vd-morph-current` ⇄ `.vd-morph-next`. `[data-vd-morph="manual"]` opts out
 * of the click handler.
 */
export function useMorph(root: Ref<HTMLElement | null>): void {
  const cleanups: Array<() => void> = [];

  const ensureLayers = (el: HTMLElement): void => {
    if (!el.querySelector(".vd-morph-wave")) {
      const wave = document.createElement("span");
      wave.className = "vd-morph-wave";
      wave.setAttribute("aria-hidden", "true");
      el.insertBefore(wave, el.firstChild);
    }
    if (!el.querySelector(".vd-morph-shine")) {
      const shine = document.createElement("span");
      shine.className = "vd-morph-shine";
      shine.setAttribute("aria-hidden", "true");
      const waveEl = el.querySelector(".vd-morph-wave");
      if (waveEl?.nextSibling) el.insertBefore(shine, waveEl.nextSibling);
      else el.insertBefore(shine, el.firstChild);
    }
  };

  const runMorph = (
    el: HTMLElement,
    e: MouseEvent | null,
    done: () => void,
  ): void => {
    const wave = el.querySelector<HTMLElement>(".vd-morph-wave");
    if (wave) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const px = e ? e.clientX || cx : cx;
      const py = e ? e.clientY || cy : cy;
      wave.style.left = `${px - rect.left}px`;
      wave.style.top = `${py - rect.top}px`;
    }

    el.classList.add("is-morphing");

    let duration = MORPH_DURATION_MS;
    const custom = getComputedStyle(el).getPropertyValue("--vd-morph-duration");
    if (custom) {
      const parsed = parseFloat(custom);
      if (!isNaN(parsed))
        duration = parsed * (custom.includes("ms") ? 1 : 1000);
    }

    window.setTimeout(() => {
      el.classList.remove("is-morphing");
      const current = el.querySelector(".vd-morph-current");
      const next = el.querySelector(".vd-morph-next");
      if (current && next) {
        current.classList.replace("vd-morph-current", "vd-morph-next");
        next.classList.replace("vd-morph-next", "vd-morph-current");
      }
      done();
    }, duration);
  };

  onMounted(() => {
    const scope = root.value;
    if (!scope) return;
    scope
      .querySelectorAll<HTMLElement>(".vd-morph, [data-vd-morph]")
      .forEach((el) => {
        if (el.getAttribute("data-vd-morph") === "manual") return;
        ensureLayers(el);
        let morphing = false;
        const onClick = (e: MouseEvent): void => {
          if (morphing) return;
          morphing = true;
          runMorph(el, e, () => (morphing = false));
        };
        el.addEventListener("click", onClick);
        cleanups.push(() => el.removeEventListener("click", onClick));
      });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });
}
