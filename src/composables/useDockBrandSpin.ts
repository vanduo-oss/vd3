import { onMounted, onUnmounted, watch, type Ref } from "vue";

export const DOCK_BRAND_ANGLE_VAR = "--vd-dock-brand-angle";
export const DOCK_BRAND_SPIN_NAME = "vd-dock-brand-spin";
export const DOCK_BRAND_SETTLE_NAME = "vd-dock-brand-settle";
export const DOCK_SPIN_HOVER_MS = 5000;
export const DOCK_SPIN_MORPH_MS = 900;
export const DOCK_SPIN_SETTLE_MIN_MS = 600;
export const DOCK_SPIN_SETTLE_MAX_MS = 1800;

const spinTarget = (dock: HTMLElement): HTMLElement | null => {
  const node = dock.querySelector(".vd-dock-brand-spin");
  return node instanceof HTMLElement ? node : null;
};

const readAngle = (spin: HTMLElement): number => {
  const raw = getComputedStyle(spin)
    .getPropertyValue(DOCK_BRAND_ANGLE_VAR)
    .trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
};

const cancelNamed = (spin: HTMLElement): void => {
  if (typeof spin.getAnimations !== "function") return;
  for (const animation of spin.getAnimations()) {
    if (
      animation.id === DOCK_BRAND_SPIN_NAME ||
      animation.id === DOCK_BRAND_SETTLE_NAME
    ) {
      animation.cancel();
    }
  }
};

/** Keep a continuous rotation on the brand mark, preserving the current angle. */
export function ensureDockBrandSpin(
  spin: HTMLElement,
  durationMs: number,
): Animation | null {
  if (typeof spin.animate !== "function") return null;
  const angle = readAngle(spin);
  cancelNamed(spin);
  spin.style.setProperty(DOCK_BRAND_ANGLE_VAR, `${angle}deg`);
  return spin.animate(
    [
      { [DOCK_BRAND_ANGLE_VAR]: `${angle}deg` },
      { [DOCK_BRAND_ANGLE_VAR]: `${angle + 360}deg` },
    ],
    {
      duration: durationMs,
      iterations: Infinity,
      easing: "linear",
      id: DOCK_BRAND_SPIN_NAME,
    },
  );
}

/** Ease the mark back to the next upright (0deg) pose. */
export function settleDockBrandSpin(
  spin: HTMLElement,
  reducedMotion = false,
): void {
  const angle = readAngle(spin);
  const mod = ((angle % 360) + 360) % 360;
  cancelNamed(spin);
  if (reducedMotion || mod < 0.5 || typeof spin.animate !== "function") {
    spin.style.setProperty(DOCK_BRAND_ANGLE_VAR, "0deg");
    return;
  }
  const remaining = 360 - mod;
  const duration = Math.min(
    DOCK_SPIN_SETTLE_MAX_MS,
    Math.max(DOCK_SPIN_SETTLE_MIN_MS, remaining * 4),
  );
  spin.animate(
    [
      { [DOCK_BRAND_ANGLE_VAR]: `${angle}deg` },
      { [DOCK_BRAND_ANGLE_VAR]: `${angle + remaining}deg` },
    ],
    {
      duration,
      easing: "cubic-bezier(0.05, 0.7, 0.1, 1)",
      fill: "forwards",
      id: DOCK_BRAND_SETTLE_NAME,
    },
  );
}

/**
 * Spins `.vd-dock-brand-spin` on hover, focus, and while the dock is morphing,
 * then coasts to upright. Touch release settles immediately so a sticky :hover
 * cannot leave the mark spinning.
 */
export function useDockBrandSpin(
  dockEl: Ref<HTMLElement | null>,
  enabled: Ref<boolean>,
): void {
  let cleanup: (() => void) | undefined;

  const bind = (dock: HTMLElement): (() => void) => {
    const brand = dock.querySelector(".vd-dock-brand");
    const spin = spinTarget(dock);
    if (!(brand instanceof HTMLElement) || !spin) return () => undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let engaged = false;

    const spinAt = (durationMs: number): void => {
      if (reducedMotion.matches) {
        settleDockBrandSpin(spin, true);
        return;
      }
      ensureDockBrandSpin(spin, durationMs);
    };

    const onActivate = (): void => {
      engaged = true;
      spinAt(
        dock.classList.contains("is-morphing")
          ? DOCK_SPIN_MORPH_MS
          : DOCK_SPIN_HOVER_MS,
      );
    };

    const onDeactivate = (): void => {
      engaged = false;
      if (dock.classList.contains("is-morphing")) return;
      settleDockBrandSpin(spin, reducedMotion.matches);
    };

    const onPointerRelease = (event: Event): void => {
      if (event instanceof PointerEvent && event.pointerType === "mouse") {
        return;
      }
      onDeactivate();
    };

    const onClass = (): void => {
      if (!engaged && !brand.matches(":focus-visible")) {
        if (!dock.classList.contains("is-morphing")) return;
      }
      if (dock.classList.contains("is-morphing")) {
        spinAt(DOCK_SPIN_MORPH_MS);
        return;
      }
      if (engaged || brand.matches(":focus-visible")) {
        spinAt(DOCK_SPIN_HOVER_MS);
        return;
      }
      settleDockBrandSpin(spin, reducedMotion.matches);
    };

    brand.addEventListener("pointerenter", onActivate);
    brand.addEventListener("pointerdown", onActivate);
    brand.addEventListener("pointerleave", onDeactivate);
    brand.addEventListener("pointerup", onPointerRelease);
    brand.addEventListener("pointercancel", onPointerRelease);
    brand.addEventListener("focusin", onActivate);
    brand.addEventListener("focusout", onDeactivate);

    const observer = new MutationObserver(onClass);
    observer.observe(dock, { attributes: true, attributeFilter: ["class"] });

    return () => {
      brand.removeEventListener("pointerenter", onActivate);
      brand.removeEventListener("pointerdown", onActivate);
      brand.removeEventListener("pointerleave", onDeactivate);
      brand.removeEventListener("pointerup", onPointerRelease);
      brand.removeEventListener("pointercancel", onPointerRelease);
      brand.removeEventListener("focusin", onActivate);
      brand.removeEventListener("focusout", onDeactivate);
      observer.disconnect();
      settleDockBrandSpin(spin, true);
    };
  };

  const sync = (el: HTMLElement | null, isEnabled: boolean): void => {
    cleanup?.();
    cleanup = el && isEnabled ? bind(el) : undefined;
  };

  watch([dockEl, enabled], ([el, isEnabled]) => sync(el, isEnabled), {
    flush: "post",
  });

  onMounted(() => {
    sync(dockEl.value, enabled.value);
  });

  onUnmounted(() => {
    cleanup?.();
    cleanup = undefined;
  });
}
