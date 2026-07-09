<script setup lang="ts">
import type { StatusVariant } from "../types";

// Status palette + the `ghost` style.
type Variant = StatusVariant | "ghost";
type Size = "sm" | "md" | "lg";

interface Props {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  loading: false,
  disabled: false,
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
    :class="[
      'vd-btn',
      `vd-btn-${variant}`,
      size !== 'md' ? `vd-btn-${size}` : null,
      loading ? 'is-loading' : null,
    ]"
    @click="onClick"
  >
    <span v-if="loading" class="vd-btn-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>
