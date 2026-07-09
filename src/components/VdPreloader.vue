<script setup lang="ts">
type Variant =
  "primary" | "secondary" | "success" | "warning" | "error" | "info";
type Size = "sm" | "md" | "lg" | "xl";
type Theme = "light" | "dark";

interface Props {
  variant?: Variant;
  size?: Size;
  theme?: Theme;
  text?: string;
}

withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  theme: "light",
  text: "",
});
</script>

<template>
  <div
    class="vd-preloader-container"
    :class="[`vd-preloader-${theme}`]"
    role="status"
    aria-live="polite"
  >
    <div
      class="vd-preloader"
      :class="[`vd-preloader-${variant}`, `vd-preloader-${size}`]"
    >
      <div class="vd-preloader-spinner" />
    </div>
    <span v-if="text" class="vd-preloader-text">{{ text }}</span>
  </div>
</template>
