<script setup lang="ts">
import { computed, inject } from "vue";
import type { DockPlacement } from "../composables/useDockOrientation";
import { VD_DOCK_KEY } from "./dock-context";
import VdIcon from "./VdIcon.vue";

interface Props {
  icon?: string;
  label: string;
  active?: boolean;
  /** Fill the Phosphor glyph while the item is active. */
  activeIconFill?: boolean;
  /**
   * Dock tooltip. `true` uses the label. A string overrides it.
   * When omitted inside an `item-layout="auto"` vertical dock, the label is used.
   */
  tooltip?: string | boolean;
  badge?: string | number;
  href?: string;
  as?: string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: "",
  active: false,
  activeIconFill: true,
  tooltip: undefined,
  badge: undefined,
  href: "",
  as: "",
});

const dock = inject(VD_DOCK_KEY, null);

const tag = computed(() => {
  if (props.as) return props.as;
  return props.href ? "a" : "button";
});

const tooltipText = computed(() => {
  if (props.tooltip === false) return "";
  if (typeof props.tooltip === "string") return props.tooltip;
  if (props.tooltip === true) return props.label;
  const placement = dock?.placement.value;
  const autoVertical =
    dock?.itemLayout.value === "auto" &&
    (placement === "left" || placement === "right");
  return autoVertical ? props.label : "";
});

const tooltipPlacement = computed(() => {
  const placement: DockPlacement = dock?.placement.value ?? "bottom";
  if (placement === "left") return "right";
  if (placement === "right") return "left";
  if (placement === "top") return "bottom";
  return "top";
});

const filled = computed(() => props.active && props.activeIconFill);
</script>

<template>
  <component
    :is="tag"
    :href="tag === 'a' ? href || undefined : undefined"
    :type="tag === 'button' ? 'button' : undefined"
    class="vd-dock-item"
    :class="{ 'is-active': active }"
    :aria-current="active ? 'page' : undefined"
    :aria-label="label"
    :data-tooltip="tooltipText || undefined"
    :data-tooltip-placement="tooltipText ? tooltipPlacement : undefined"
    :data-tooltip-variant="tooltipText ? 'dock' : undefined"
  >
    <VdIcon v-if="icon" :name="icon" size="sm" :filled="filled" />
    <span class="vd-dock-label">{{ label }}</span>
    <span v-if="badge != null && badge !== ''" class="vd-dock-badge">{{
      badge
    }}</span>
  </component>
</template>
