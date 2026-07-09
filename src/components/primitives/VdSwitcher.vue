<script setup lang="ts">
type Threshold = "fib-377" | "fib-610" | "fib-987";
type Gap = "fib-3" | "fib-5" | "fib-8";

interface Props {
  /** Width below which children stack (maps to `data-threshold`). */
  threshold?: Threshold;
  /** Gap between items (maps to `data-gap`). */
  gap?: Gap;
}

withDefaults(defineProps<Props>(), { threshold: "fib-610", gap: "fib-5" });
</script>

<template>
  <div class="vd-switcher" :data-threshold="threshold" :data-gap="gap">
    <slot />
  </div>
</template>
