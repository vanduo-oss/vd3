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
  click: [event: MouseEvent | KeyboardEvent];
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

const onClick = (event: MouseEvent): void => {
  emit("click", event);
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("click", event);
  }
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
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? '0' : undefined"
    @click="clickable && onClick($event)"
    @keydown="clickable && onKeydown($event)"
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
