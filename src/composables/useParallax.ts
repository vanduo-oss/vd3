import { onMounted, onUnmounted, type Ref } from "vue";

interface ParallaxConfig {
  layers: HTMLElement[];
  speed: number;
  direction: "horizontal" | "vertical";
}

/**
 * Reproduces `framework/js/components/parallax.js`: layers inside a
 * `.vd-parallax` container translate at speed-scaled rates on a
 * rAF-throttled scroll listener. Container speed comes from
 * `.vd-parallax-slow|medium|fast` (0.5 / 1 / 1.5); per-layer rate from
 * `data-parallax-speed`. Disabled entirely under prefers-reduced-motion.
 */
export function useParallax(root: Ref<HTMLElement | null>): void {
  const elements = new Map<HTMLElement, ParallaxConfig>();
  let ticking = false;
  let onScroll: (() => void) | null = null;

  const getSpeed = (el: HTMLElement): number => {
    if (el.classList.contains("vd-parallax-slow")) return 0.5;
    if (el.classList.contains("vd-parallax-fast")) return 1.5;
    return 1;
  };

  const updateOne = (el: HTMLElement): void => {
    const config = elements.get(el);
    if (!config) return;
    const rect = el.getBoundingClientRect();
    const winH = window.innerHeight;
    const scrollProgress = Math.max(
      0,
      Math.min(1, (winH - rect.top) / (winH + rect.height)),
    );
    const offset = (scrollProgress - 0.5) * config.speed * 100;
    config.layers.forEach((layer) => {
      const attr = layer.dataset.parallaxSpeed ?? layer.dataset.speed;
      const layerSpeed = attr ? parseFloat(attr) : 1;
      const layerOffset = offset * layerSpeed;
      layer.style.transform =
        config.direction === "horizontal"
          ? `translateX(${layerOffset}px)`
          : `translateY(${layerOffset}px)`;
    });
  };

  const updateAll = (): void => elements.forEach((_c, el) => updateOne(el));

  const handleScroll = (): void => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateAll();
        ticking = false;
      });
      ticking = true;
    }
  };

  onMounted(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const scope = root.value;
    if (!scope) return;

    scope.querySelectorAll<HTMLElement>(".vd-parallax").forEach((el) => {
      const layers = Array.from(
        el.querySelectorAll<HTMLElement>(".vd-parallax-layer, .vd-parallax-bg"),
      );
      const direction = el.classList.contains("vd-parallax-horizontal")
        ? "horizontal"
        : "vertical";
      elements.set(el, { layers, speed: getSpeed(el), direction });
      updateOne(el);
    });

    onScroll = () => handleScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll();
  });

  onUnmounted(() => {
    if (onScroll) window.removeEventListener("scroll", onScroll);
    onScroll = null;
    elements.forEach((config) => {
      config.layers.forEach((l) => (l.style.transform = ""));
    });
    elements.clear();
  });
}
