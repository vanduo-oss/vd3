<script setup lang="ts">
type Ratio = "golden" | "golden-portrait" | "square" | "16-9" | "4-3" | "3-2";

interface Props {
  /** Aspect ratio (maps to `data-ratio`). */
  ratio?: Ratio;
}

withDefaults(defineProps<Props>(), { ratio: "golden" });
</script>

<template>
  <div class="vd-frame" :data-ratio="ratio">
    <slot />
  </div>
</template>
