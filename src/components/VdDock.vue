<script setup lang="ts">
import { computed, provide, ref, watch } from "vue";
import {
  DOCK_GLASS_STEPS,
  DOCK_RADIUS_OPTIONS,
  DOCK_TINT_MODES,
  DOCK_TINTS,
  dockOrientationOf,
  useDockOrientation,
  type DockGlass,
  type DockItemLayout,
  type DockOrientation,
  type DockPlacement,
  type DockRadius,
  type DockTint,
  type DockTintMode,
} from "../composables/useDockOrientation";
import { useDockBrandSpin } from "../composables/useDockBrandSpin";
import { useTooltips } from "../composables/useTooltips";
import { VD_DOCK_KEY } from "./dock-context";

interface Props {
  orientation?: DockOrientation;
  placement?: DockPlacement;
  position?: "fixed" | "contained";
  dark?: boolean;
  tint?: DockTint | "";
  /** `surface` tints the pill; `accent` keeps it ink and tints icons only. */
  tintMode?: DockTintMode;
  glass?: DockGlass;
  radius?: DockRadius | string;
  itemLayout?: DockItemLayout;
  /** `mirror` flips the brand to the far corner. `consistent` keeps it left / bottom. */
  brandCorner?: "mirror" | "consistent";
  /** Spin `.vd-dock-brand-spin` on hover, focus, and while the dock morphs. */
  brandSpin?: boolean;
  brandToggles?: boolean;
  /** Default `pair` keeps bottom↔left / top↔right. `edges` walks all four. */
  cycle?: "pair" | "edges";
  persist?: boolean;
  storageKey?: string;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  orientation: undefined,
  placement: undefined,
  position: "fixed",
  dark: true,
  tint: "",
  tintMode: "surface",
  glass: 34,
  radius: "1.25",
  itemLayout: "stack",
  brandCorner: "mirror",
  brandSpin: false,
  brandToggles: true,
  cycle: "pair",
  persist: false,
  storageKey: "",
  label: "Primary",
});

const emit = defineEmits<{
  "update:orientation": [value: DockOrientation];
  "update:placement": [value: DockPlacement];
}>();

const {
  placement,
  orientation,
  visualPhase,
  morphCorner,
  isMorphing,
  dockClasses,
  brandLabel,
  brandPressed,
  canToggle,
  toggle,
  playTo,
  playToPlacement,
  snapTo,
  snapToPlacement,
} = useDockOrientation({
  persist: props.persist,
  storageKey: props.storageKey || undefined,
  initial: props.orientation ?? "horizontal",
  initialPlacement: props.placement,
});

watch(
  () => [props.placement, props.orientation] as const,
  ([nextPlacement, nextOrientation]) => {
    if (nextPlacement) {
      const edgeChanged = nextPlacement !== placement.value;
      const phaseStale = visualPhase.value !== dockOrientationOf(nextPlacement);
      if (edgeChanged || phaseStale) {
        playToPlacement(nextPlacement, { interrupt: true });
      }
      // Placement is source of truth. A stale paired orientation (parent
      // applied update:placement before update:orientation) must not snap
      // back to the previous edge.
      return;
    }
    if (!nextOrientation || nextOrientation === orientation.value) return;
    if (isMorphing.value) {
      snapTo(nextOrientation);
      return;
    }
    playTo(nextOrientation);
  },
);

watch(orientation, (value) => {
  emit("update:orientation", value);
});

watch(placement, (value) => {
  emit("update:placement", value);
});

const resolvedGlass = computed<DockGlass>(() =>
  (DOCK_GLASS_STEPS as readonly number[]).includes(props.glass)
    ? props.glass
    : 34,
);

const resolvedRadius = computed(() => {
  const value = String(props.radius);
  const allowed = (DOCK_RADIUS_OPTIONS as readonly string[]).includes(value)
    ? value
    : "1.25";
  return allowed === "9999" ? "9999px" : `${allowed}rem`;
});

const resolvedTint = computed(() =>
  (DOCK_TINTS as readonly string[]).includes(props.tint) ? props.tint : "",
);

const resolvedTintMode = computed<DockTintMode>(() =>
  (DOCK_TINT_MODES as readonly string[]).includes(props.tintMode)
    ? props.tintMode
    : "surface",
);

const rootEl = ref<HTMLElement | null>(null);
const brandSpinEnabled = computed(() => props.brandSpin);
useDockBrandSpin(rootEl, brandSpinEnabled);
useTooltips(rootEl, { showDelay: 520 });

const itemLayout = computed(() => props.itemLayout);
provide(VD_DOCK_KEY, { placement, itemLayout });

const resolvedItemLayout = computed<"stack" | "inline">(() => {
  if (props.itemLayout === "inline") return "inline";
  if (props.itemLayout === "auto") {
    return orientation.value === "horizontal" ? "inline" : "stack";
  }
  return "stack";
});

const edgeClass = computed(() => `vd-dock-edge-${placement.value}`);

const rootClasses = computed(() => [
  "vd-dock",
  "vd-glass",
  `vd-glass-${resolvedGlass.value}`,
  "vd-glass-contrast",
  props.position === "contained" ? "vd-dock-contained" : "vd-dock-fixed",
  props.dark ? "vd-dock-dark" : null,
  resolvedItemLayout.value === "inline"
    ? "vd-dock-items-inline"
    : "vd-dock-items-stack",
  props.itemLayout === "auto" ? "vd-dock-items-auto" : null,
  props.brandCorner === "consistent" ? "vd-dock-brand-consistent" : null,
  resolvedTint.value ? `vd-dock-tint-${resolvedTint.value}` : null,
  resolvedTint.value && resolvedTintMode.value === "accent"
    ? "vd-dock-tint-accent"
    : null,
  edgeClass.value,
  dockClasses.value,
]);

const rootStyle = computed(() => ({
  "--vd-dock-radius": resolvedRadius.value,
}));

const EDGE_CYCLE: DockPlacement[] = ["bottom", "left", "top", "right"];

const onBrandClick = (): void => {
  if (!props.brandToggles) return;
  if (!canToggle.value) return;
  if (props.cycle === "edges") {
    const index = EDGE_CYCLE.indexOf(placement.value);
    playToPlacement(EDGE_CYCLE[(index + 1) % EDGE_CYCLE.length]);
    return;
  }
  toggle();
};

defineExpose({
  placement,
  orientation,
  visualPhase,
  morphCorner,
  isMorphing,
  toggle,
  playTo,
  playToPlacement,
  snapTo,
  snapToPlacement,
});
</script>

<template>
  <nav ref="rootEl" :class="rootClasses" :style="rootStyle" :aria-label="label">
    <button
      v-if="$slots.brand"
      type="button"
      class="vd-dock-brand"
      :aria-label="brandToggles ? brandLabel : 'Brand'"
      :aria-pressed="brandPressed"
      :aria-disabled="!canToggle || !brandToggles ? 'true' : undefined"
      @click="onBrandClick"
    >
      <span v-if="brandSpin" class="vd-dock-brand-spin">
        <slot name="brand" />
      </span>
      <slot v-else name="brand" />
    </button>

    <div class="vd-dock-nav">
      <div class="vd-dock-links">
        <slot />
      </div>
    </div>

    <div v-if="$slots.actions" class="vd-dock-actions">
      <slot name="actions" />
    </div>
  </nav>
</template>
