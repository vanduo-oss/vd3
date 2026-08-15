import { computed, onMounted, onUnmounted, ref, type Ref } from "vue";
import { getStoragePrefix } from "./useTheme";

export type DockOrientation = "horizontal" | "vertical";
export type DockVisualPhase = "horizontal" | "square" | "vertical";

export const DOCK_PLACEMENTS = ["bottom", "top", "left", "right"] as const;
export type DockPlacement = (typeof DOCK_PLACEMENTS)[number];

export const DOCK_PLACEMENT_PAIR: Record<DockPlacement, DockPlacement> = {
  bottom: "left",
  left: "bottom",
  top: "right",
  right: "top",
};

export const DOCK_MORPH_MS = { shrink: 480, grow: 720 } as const;
export const DOCK_NARROW_QUERY = "(max-width: 520px)";
export const DOCK_ORIENT_SUFFIX = "dock-orient";

export const DOCK_TINTS = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
] as const;
export type DockTint = (typeof DOCK_TINTS)[number];

export const DOCK_GLASS_STEPS = [1, 2, 3, 5, 8, 13, 21, 34] as const;
export type DockGlass = (typeof DOCK_GLASS_STEPS)[number];

export const DOCK_RADIUS_OPTIONS = [
  "0.5",
  "0.75",
  "1",
  "1.25",
  "1.5",
  "2",
  "9999",
] as const;
export type DockRadius = (typeof DOCK_RADIUS_OPTIONS)[number];

export type DockItemLayout = "stack" | "inline";

export interface UseDockOrientationOptions {
  narrowQuery?: string;
  persist?: boolean;
  storageKey?: string;
  initial?: DockOrientation;
  initialPlacement?: DockPlacement;
}

export function dockOrientationOf(placement: DockPlacement): DockOrientation {
  return placement === "left" || placement === "right"
    ? "vertical"
    : "horizontal";
}

export function dockHorizontalOf(placement: DockPlacement): DockPlacement {
  return placement === "top" || placement === "right" ? "top" : "bottom";
}

export function dockPlacementOf(
  orientation: DockOrientation,
  from: DockPlacement,
): DockPlacement {
  const endPair = from === "top" || from === "right";
  if (orientation === "horizontal") return endPair ? "top" : "bottom";
  return endPair ? "right" : "left";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resolveStorageKey(options: UseDockOrientationOptions): string | null {
  if (!options.persist) return null;
  if (options.storageKey) return options.storageKey;
  return `${getStoragePrefix()}${DOCK_ORIENT_SUFFIX}`;
}

function parseStoredPlacement(value: string | null): DockPlacement | null {
  if (value === "horizontal") return "bottom";
  if (value === "vertical") return "left";
  if (
    value === "bottom" ||
    value === "top" ||
    value === "left" ||
    value === "right"
  ) {
    return value;
  }
  return null;
}

function readStored(key: string | null): DockPlacement | null {
  if (!key || typeof localStorage === "undefined") return null;
  try {
    return parseStoredPlacement(localStorage.getItem(key));
  } catch {
    /* private mode */
  }
  return null;
}

function writeStored(key: string | null, edge: DockPlacement): void {
  if (!key || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, edge);
  } catch {
    /* private mode */
  }
}

function resolveInitialPlacement(
  options: UseDockOrientationOptions,
): DockPlacement {
  if (options.initialPlacement) return options.initialPlacement;
  if (options.initial === "vertical") return "left";
  return "bottom";
}

export function useDockOrientation(options: UseDockOrientationOptions = {}) {
  const narrowQuery = options.narrowQuery ?? DOCK_NARROW_QUERY;
  const storageKey = resolveStorageKey(options);
  const initialPlacement = resolveInitialPlacement(options);
  const initialOrientation = dockOrientationOf(initialPlacement);

  const placement = ref<DockPlacement>(initialPlacement);
  const orientation = ref<DockOrientation>(initialOrientation);
  const visualPhase = ref<DockVisualPhase>(initialOrientation);
  const isMorphing = ref(false);
  const isNarrow = ref(false);

  let morphTimer: ReturnType<typeof setTimeout> | null = null;
  let narrowMql: MediaQueryList | null = null;

  const clearMorphTimer = (): void => {
    if (morphTimer != null) {
      clearTimeout(morphTimer);
      morphTimer = null;
    }
  };

  let chosenPlacement = initialPlacement;

  const applyVisual = (target: DockPlacement): void => {
    placement.value = target;
    orientation.value = dockOrientationOf(target);
    visualPhase.value = orientation.value;
  };

  const applyRest = (target: DockPlacement): void => {
    applyVisual(target);
    chosenPlacement = target;
    writeStored(storageKey, target);
  };

  const snapToPlacement = (target: DockPlacement): void => {
    clearMorphTimer();
    isMorphing.value = false;
    applyRest(target);
  };

  const snapTo = (target: DockOrientation): void => {
    snapToPlacement(dockPlacementOf(target, placement.value));
  };

  const playToPlacement = (
    target: DockPlacement,
    options?: { interrupt?: boolean },
  ): void => {
    if (typeof window === "undefined") return;
    if (isNarrow.value) {
      snapToPlacement(dockHorizontalOf(placement.value));
      return;
    }
    if (isMorphing.value) {
      if (options?.interrupt) snapToPlacement(target);
      return;
    }
    if (
      placement.value === target &&
      visualPhase.value === dockOrientationOf(target)
    ) {
      writeStored(storageKey, target);
      return;
    }
    if (prefersReducedMotion()) {
      snapToPlacement(target);
      return;
    }

    isMorphing.value = true;
    visualPhase.value = "square";
    clearMorphTimer();
    morphTimer = setTimeout(() => {
      applyRest(target);
      morphTimer = setTimeout(() => {
        isMorphing.value = false;
        morphTimer = null;
      }, DOCK_MORPH_MS.grow);
    }, DOCK_MORPH_MS.shrink);
  };

  const playTo = (target: DockOrientation): void => {
    playToPlacement(dockPlacementOf(target, placement.value));
  };

  const toggle = (): void => {
    if (isNarrow.value) return;
    if (isMorphing.value) return;
    playToPlacement(DOCK_PLACEMENT_PAIR[placement.value]);
  };

  const restore = (): void => {
    isNarrow.value = window.matchMedia(narrowQuery).matches;
    const stored = readStored(storageKey);
    const value = stored ?? initialPlacement;
    chosenPlacement = value;
    if (isNarrow.value) {
      applyVisual(dockHorizontalOf(value));
      return;
    }
    applyVisual(value);
  };

  const onNarrowChange = (event: MediaQueryListEvent): void => {
    isNarrow.value = event.matches;
    if (event.matches) {
      clearMorphTimer();
      isMorphing.value = false;
      applyVisual(dockHorizontalOf(chosenPlacement));
      return;
    }
    applyVisual(readStored(storageKey) ?? chosenPlacement);
  };

  onMounted(() => {
    restore();
    narrowMql = window.matchMedia(narrowQuery);
    isNarrow.value = narrowMql.matches;
    narrowMql.addEventListener("change", onNarrowChange);
  });

  onUnmounted(() => {
    clearMorphTimer();
    narrowMql?.removeEventListener("change", onNarrowChange);
    narrowMql = null;
  });

  const dockClasses = computed(() => ({
    "is-horizontal": visualPhase.value === "horizontal",
    "is-square": visualPhase.value === "square",
    "is-vertical": visualPhase.value === "vertical",
    "is-morphing": isMorphing.value,
    [`vd-dock-edge-${placement.value}`]: true,
  }));

  const orientClass = computed(() =>
    orientation.value === "vertical"
      ? "vd-dock-orient-vertical"
      : "vd-dock-orient-horizontal",
  );

  const brandLabel = computed(() =>
    orientation.value === "horizontal"
      ? "Use vertical dock"
      : "Use horizontal dock",
  );

  const brandPressed = computed(() => orientation.value === "vertical");
  const canToggle = computed(() => !isNarrow.value);

  return {
    placement: placement as Ref<DockPlacement>,
    orientation: orientation as Ref<DockOrientation>,
    visualPhase: visualPhase as Ref<DockVisualPhase>,
    isMorphing: isMorphing as Ref<boolean>,
    isNarrow: isNarrow as Ref<boolean>,
    dockClasses,
    orientClass,
    brandLabel,
    brandPressed,
    canToggle,
    toggle,
    playTo,
    playToPlacement,
    snapTo,
    snapToPlacement,
  };
}
