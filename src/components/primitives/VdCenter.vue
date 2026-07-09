<script setup lang="ts">
type Max = "fib-377" | "fib-610" | "fib-987";
type Axis = "both" | "horizontal" | "vertical";

interface Props {
  as?: keyof HTMLElementTagNameMap;
  /** Max content width (maps to `data-max`). */
  max?: Max;
  /** Also center children along an axis (maps to `data-axis`). */
  axis?: Axis;
}

withDefaults(defineProps<Props>(), { as: "div", max: "fib-610" });
</script>

<template>
  <component :is="as" class="vd-center" :data-max="max" :data-axis="axis">
    <slot />
  </component>
</template>
