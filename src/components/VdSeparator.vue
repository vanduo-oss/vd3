<script setup lang="ts">
interface Props {
  /** Render a vertical divider (for use inside a flex row). */
  vertical?: boolean;
  /** Semantic primary-to-info gradient; line remains the default. */
  variant?: "line" | "gradient";
  /** Optional centered label (horizontal only). */
  label?: string;
}

withDefaults(defineProps<Props>(), {
  vertical: false,
  variant: "line",
  label: "",
});
</script>

<template>
  <div
    v-if="label && !vertical"
    class="vd-separator vd-separator-labeled"
    :class="{ 'vd-separator-gradient': variant === 'gradient' }"
    role="separator"
    aria-orientation="horizontal"
  >
    <span class="vd-separator-label">{{ label }}</span>
  </div>
  <hr
    v-else
    class="vd-separator"
    :class="{
      'vd-separator-vertical': vertical,
      'vd-separator-gradient': variant === 'gradient',
    }"
    :aria-orientation="vertical ? 'vertical' : 'horizontal'"
  />
</template>
