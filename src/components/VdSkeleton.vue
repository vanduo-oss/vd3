<script setup lang="ts">
type Shape = "text" | "circle" | "rect" | "card" | "button";
type Size = "sm" | "md" | "lg" | "xl";

interface Props {
  shape?: Shape;
  size?: Size;
  width?: string;
  lines?: number;
}

withDefaults(defineProps<Props>(), {
  shape: "text",
  size: "md",
  width: "",
  lines: 1,
});
</script>

<template>
  <div
    v-if="shape === 'card'"
    class="vd-skeleton-card"
    :class="`vd-skeleton-card-${size}`"
  >
    <div class="vd-skeleton vd-skeleton-card-header" />
    <div class="vd-skeleton-card-body">
      <div class="vd-skeleton vd-skeleton-text" />
      <div class="vd-skeleton vd-skeleton-text" />
      <div class="vd-skeleton vd-skeleton-text vd-skeleton-text-short" />
    </div>
  </div>
  <div
    v-else-if="shape === 'button'"
    class="vd-skeleton vd-skeleton-button"
    :class="`vd-skeleton-button-${size}`"
  />
  <div
    v-else-if="shape === 'circle'"
    class="vd-skeleton vd-skeleton-circle"
    :class="`vd-skeleton-circle-${size}`"
  />
  <div v-else-if="lines > 1" class="vd-skeleton-lines">
    <div
      v-for="n in lines"
      :key="n"
      class="vd-skeleton vd-skeleton-text"
      :class="n === lines ? 'vd-skeleton-text-short' : ''"
    />
  </div>
  <div
    v-else
    class="vd-skeleton vd-skeleton-text"
    :class="`vd-skeleton-text-${size}`"
    :style="width ? `width: ${width}` : ''"
  />
</template>
