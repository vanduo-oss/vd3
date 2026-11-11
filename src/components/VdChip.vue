<script setup lang="ts">
import { ref } from "vue";
import { useReducedMotion } from "../composables/useMotion";
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
  /** Whether animation is enabled (default true). */
  animated?: boolean;
  /** Custom duration in ms override. */
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  outline: false,
  dismissible: false,
  avatar: "",
  clickable: false,
  animated: true,
});

const emit = defineEmits<{
  dismiss: [];
  click: [event: MouseEvent | KeyboardEvent];
}>();

const chipEl = ref<HTMLElement | null>(null);
const { reduced, off } = useReducedMotion();
const dismissing = ref(false);
let dismissHandled = false;

const emitDismiss = (): void => {
  if (dismissHandled) return;
  dismissHandled = true;
  emit("dismiss");
};

const onDismiss = (event: MouseEvent): void => {
  event.stopPropagation();
  if (!props.animated || off.value) {
    emitDismiss();
    return;
  }
  const el = chipEl.value;
  if (!el || typeof el.animate !== "function") {
    emitDismiss();
    return;
  }
  dismissing.value = true;
  const ms = props.duration ?? (reduced.value ? 89 : 144);
  const style = window.getComputedStyle(el);
  const easing =
    style.getPropertyValue("--vd-ease-in").trim() ||
    "cubic-bezier(0.618, 0, 0.764, 0)";

  if (reduced.value) {
    const anim = el.animate([{ opacity: "1" }, { opacity: "0" }], {
      duration: ms,
      easing: "linear",
    });
    anim.onfinish = emitDismiss;
    anim.oncancel = emitDismiss;
    return;
  }

  const anim = el.animate(
    [
      { opacity: "1", transform: "scale(1)" },
      { opacity: "0", transform: "scale(0.85)" },
    ],
    { duration: ms, easing },
  );
  anim.onfinish = emitDismiss;
  anim.oncancel = emitDismiss;
};

const onClick = (event: MouseEvent): void => {
  emit("click", event);
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.target !== event.currentTarget) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("click", event);
  }
};
</script>

<template>
  <span
    ref="chipEl"
    class="vd-chip"
    :class="[
      `vd-chip-${variant}`,
      `vd-chip-${size}`,
      {
        'vd-chip-outline': outline,
        'vd-chip-dismissible': dismissible,
        'vd-chip-clickable': clickable,
        'is-dismissing': dismissing,
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
      :disabled="dismissing"
      @click="onDismiss"
    >
      &times;
    </button>
  </span>
</template>
