<script setup lang="ts">
import type { StatusVariant } from "../types";

type Variant = StatusVariant;

interface Props {
  variant?: Variant;
  pill?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: "primary",
  pill: false,
});
</script>

<template>
  <span
    class="vd-badge"
    :class="[`vd-badge-${variant}`, pill ? 'vd-badge-pill' : null]"
  >
    <slot />
  </span>
</template>
