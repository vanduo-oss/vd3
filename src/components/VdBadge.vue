<script setup lang="ts">
import type { StatusVariant } from "../types";

type Variant = StatusVariant;
type Size = "sm" | "md" | "lg";

interface Props {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
  outlined?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  pill: false,
  outlined: false,
});
</script>

<template>
  <span
    class="vd-badge"
    :class="[
      `vd-badge-${variant}`,
      size !== 'md' ? `vd-badge-${size}` : null,
      pill ? 'vd-badge-pill' : null,
      outlined ? 'vd-badge-outlined' : null,
    ]"
  >
    <slot />
  </span>
</template>
