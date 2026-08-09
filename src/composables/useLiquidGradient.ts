import { onMounted, onUnmounted, type Ref } from "vue";
import {
  createLiquidGradient,
  type LiquidGradientEngine,
} from "../effects/createLiquidGradient";

export interface UseLiquidGradientOptions {
  /**
   * Force reduced-motion behavior. When omitted, follows
   * `prefers-reduced-motion: reduce`.
   */
  reducedMotion?: boolean;
}

interface HostBinding {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  engine: LiquidGradientEngine | null;
  active: boolean;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

function isHostActive(host: HTMLElement): boolean {
  if (host.classList.contains("vd-liquid-gradient-active")) return true;
  const attr = host.getAttribute("data-vd-liquid-active");
  if (attr === null) return false;
  return attr !== "false";
}

function ensureCanvas(host: HTMLElement): HTMLCanvasElement {
  let canvas = host.querySelector<HTMLCanvasElement>(
    "canvas.vd-liquid-gradient-canvas",
  );
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "vd-liquid-gradient-canvas";
    host.appendChild(canvas);
  }
  return canvas;
}

/**
 * Scans `.vd-liquid-gradient` hosts under `root` and drives each with a
 * vanilla WebGL liquid-gradient engine. Theme tokens and `--vd-liquid-*`
 * knobs are re-read on `data-theme` / style mutations. Engines start only
 * while the host is active (`.vd-liquid-gradient-active` or
 * `data-vd-liquid-active`). Cleanup on unmount.
 */
export function useLiquidGradient(
  root: Ref<HTMLElement | null>,
  options: UseLiquidGradientOptions = {},
): void {
  const bindings: HostBinding[] = [];
  let themeObserver: MutationObserver | null = null;
  let attrObserver: MutationObserver | null = null;
  let motionQuery: MediaQueryList | null = null;
  let pointerBound = false;
  let resizeRaf = 0;

  const reducedMotion = (): boolean =>
    options.reducedMotion ?? prefersReducedMotion();

  const onPointerMove = (ev: PointerEvent): void => {
    for (const b of bindings) {
      if (!b.active || !b.engine) continue;
      b.engine.onPointer(ev.clientX, ev.clientY);
    }
  };

  const bindPointer = (): void => {
    if (pointerBound) return;
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    pointerBound = true;
  };

  const unbindPointer = (): void => {
    if (!pointerBound) return;
    window.removeEventListener("pointermove", onPointerMove);
    pointerBound = false;
  };

  const flushResize = (): void => {
    resizeRaf = 0;
    for (const b of bindings) b.engine?.resize();
  };

  const onResize = (): void => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(flushResize);
  };

  const syncActive = (b: HostBinding): void => {
    const next = isHostActive(b.host);
    if (next === b.active) {
      if (next && b.engine) {
        b.engine.syncThemeColors();
        b.engine.syncKnobs();
      }
      return;
    }
    b.active = next;
    if (!b.engine) return;
    if (next) {
      b.engine.syncThemeColors();
      b.engine.syncKnobs();
      b.engine.start();
      bindPointer();
    } else {
      b.engine.stop();
      if (!bindings.some((x) => x.active && x.engine)) unbindPointer();
    }
  };

  const recreateEngines = (): void => {
    for (const b of bindings) {
      const wasActive = b.active;
      b.engine?.destroy();
      b.engine = createLiquidGradient(b.canvas, {
        reducedMotion: reducedMotion(),
        styleRoot: b.host,
      });
      b.active = false;
      if (wasActive || isHostActive(b.host)) {
        b.active = true;
        b.engine?.start();
        if (b.engine) bindPointer();
      }
    }
    if (!bindings.some((x) => x.active && x.engine)) unbindPointer();
  };

  const syncAllThemes = (): void => {
    for (const b of bindings) {
      if (!b.engine) continue;
      b.engine.syncThemeColors();
      b.engine.syncKnobs();
    }
  };

  onMounted(() => {
    if (typeof window === "undefined") return;
    const scope = root.value;
    if (!scope) return;

    scope
      .querySelectorAll<HTMLElement>(".vd-liquid-gradient")
      .forEach((host) => {
        const canvas = ensureCanvas(host);
        const engine = createLiquidGradient(canvas, {
          reducedMotion: reducedMotion(),
          styleRoot: host,
        });
        const binding: HostBinding = {
          host,
          canvas,
          engine,
          active: false,
        };
        bindings.push(binding);
        syncActive(binding);
      });

    themeObserver = new MutationObserver(() => syncAllThemes());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-theme",
        "style",
        "class",
        "data-primary",
        "data-neutral",
        "data-palette",
      ],
    });

    attrObserver = new MutationObserver(() => {
      for (const b of bindings) syncActive(b);
    });
    for (const b of bindings) {
      attrObserver.observe(b.host, {
        attributes: true,
        attributeFilter: ["class", "data-vd-liquid-active", "style"],
      });
    }

    window.addEventListener("resize", onResize, { passive: true });

    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = (): void => recreateEngines();
    motionQuery.addEventListener?.("change", onMotionChange);
    // Stash for teardown via property to avoid extra closure fields.
    (
      motionQuery as MediaQueryList & { __vdOnChange?: () => void }
    ).__vdOnChange = onMotionChange;
  });

  onUnmounted(() => {
    unbindPointer();
    window.removeEventListener("resize", onResize);
    if (resizeRaf) {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = 0;
    }
    themeObserver?.disconnect();
    themeObserver = null;
    attrObserver?.disconnect();
    attrObserver = null;
    if (motionQuery) {
      const mq = motionQuery as MediaQueryList & { __vdOnChange?: () => void };
      if (mq.__vdOnChange) {
        motionQuery.removeEventListener?.("change", mq.__vdOnChange);
        delete mq.__vdOnChange;
      }
      motionQuery = null;
    }
    for (const b of bindings) {
      b.engine?.destroy();
      b.engine = null;
    }
    bindings.length = 0;
  });
}
