<script setup lang="ts">
type Min = "screen" | "half" | "fib-610" | "fib-987";
type Gap = "fib-3" | "fib-5" | "fib-8";

interface Props {
  as?: keyof HTMLElementTagNameMap;
  /** Minimum height (maps to `data-min`). */
  min?: Min;
  /** Gap between centered children (maps to `data-gap`). */
  gap?: Gap;
}

withDefaults(defineProps<Props>(), { as: "div", min: "fib-610" });
</script>

<template>
  <component :is="as" class="vd-cover" :data-min="min" :data-gap="gap">
    <slot />
  </component>
</template>
