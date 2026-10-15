<script setup lang="ts">
import type { StatusVariant } from "../types";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

interface Props {
  size?: Size;
  variant?: StatusVariant;
  label?: string;
}

withDefaults(defineProps<Props>(), {
  size: "md",
  variant: undefined,
  label: "",
});
</script>

<template>
  <span
    :class="[
      'vd-spinner',
      size !== 'md' ? `vd-spinner-${size}` : null,
      variant ? `vd-spinner-${variant}` : null,
    ]"
    role="status"
    :aria-label="label || 'Loading'"
  >
    <span class="vd-visually-hidden">{{ label || "Loading" }}</span>
  </span>
</template>
