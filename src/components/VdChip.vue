<script setup lang="ts">
import type { StatusVariant } from "../types";

type Size = "sm" | "md" | "lg";
type Variant = StatusVariant;

interface Props {
  variant?: Variant;
  size?: Size;
  outline?: boolean;
  dismissible?: boolean;
  avatar?: string;
  clickable?: boolean;
}

const emit = defineEmits<{
  dismiss: [];
  click: [event: MouseEvent];
}>();

withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  outline: false,
  dismissible: false,
  avatar: "",
  clickable: false,
});

const onDismiss = (event: MouseEvent): void => {
  event.stopPropagation();
  emit("dismiss");
};
</script>

<template>
  <span
    class="vd-chip"
    :class="[
      `vd-chip-${variant}`,
      `vd-chip-${size}`,
      {
        'vd-chip-outline': outline,
        'vd-chip-dismissible': dismissible,
        'vd-chip-clickable': clickable,
      },
    ]"
    role="status"
    @click="clickable && emit('click', $event)"
  >
    <img v-if="avatar" :src="avatar" class="vd-chip-avatar" alt="" />
    <slot />
    <button
      v-if="dismissible"
      type="button"
      class="vd-chip-close"
      aria-label="Dismiss"
      @click="onDismiss"
    >
      &times;
    </button>
  </span>
</template>
