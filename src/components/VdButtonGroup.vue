<script setup lang="ts">
type Size = "sm" | "md" | "lg";

interface Props {
  size?: Size;
  vertical?: boolean;
  fullWidth?: boolean;
}

withDefaults(defineProps<Props>(), {
  size: "md",
  vertical: false,
  fullWidth: false,
});
</script>

<template>
  <div
    class="vd-btn-group"
    :class="[
      `vd-btn-group-${size}`,
      { 'vd-btn-group-vertical': vertical, 'vd-btn-group-full': fullWidth },
    ]"
    role="group"
  >
    <slot />
  </div>
</template>
