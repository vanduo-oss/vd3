<script setup lang="ts">
import type { StatusVariant } from "../types";

// Status palette + ghost (no stroke) + ink (fat outline, scheme-aware fill).
type Variant = StatusVariant | "ghost" | "ink";
type Size = "sm" | "md" | "lg";

interface Props {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  ring?: boolean;
  outline?: boolean;
  block?: boolean;
  icon?: boolean;
  type?: "button" | "submit" | "reset";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  loading: false,
  disabled: false,
  ring: false,
  outline: false,
  block: false,
  icon: false,
  type: "button",
});

const emit = defineEmits<{ click: [event: MouseEvent] }>();

const onClick = (event: MouseEvent): void => {
  if (props.disabled || props.loading) {
    event.preventDefault();
    return;
  }
  emit("click", event);
};
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :class="[
      'vd-btn',
      `vd-btn-${variant}`,
      size !== 'md' ? `vd-btn-${size}` : null,
      ring ? 'vd-btn-ring' : null,
      outline ? 'vd-btn-outline' : null,
      block ? 'vd-btn-block' : null,
      icon ? 'vd-btn-icon' : null,
      loading ? 'is-loading' : null,
    ]"
    @click="onClick"
  >
    <span v-if="loading" class="vd-btn-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>
