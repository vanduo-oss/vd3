<script setup lang="ts">
type Ratio =
  "golden" | "golden-portrait" | "square" | "16-9" | "4-3" | "3-2" | "21-9";

interface Props {
  /** Aspect ratio (maps to `data-ratio`). */
  ratio?: Ratio;
  as?: keyof HTMLElementTagNameMap;
}

withDefaults(defineProps<Props>(), { ratio: "golden", as: "div" });
</script>

<template>
  <component :is="as" class="vd-frame" :data-ratio="ratio">
    <slot />
  </component>
</template>
