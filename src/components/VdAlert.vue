<script setup lang="ts">
import { ref } from "vue";
import VdIcon from "./VdIcon.vue";
import { useReducedMotion } from "../composables/useMotion";
import type { StatusVariant } from "../types";

type Variant = StatusVariant;

interface Props {
  variant?: Variant;
  dismissible?: boolean;
  title?: string;
  /** Whether dismiss animation is enabled (default true). */
  animated?: boolean;
  /** Custom duration in ms override. */
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "info",
  dismissible: false,
  title: "",
  animated: true,
});

const emit = defineEmits<{ dismiss: [] }>();

const alertEl = ref<HTMLElement | null>(null);
const { reduced, off } = useReducedMotion();
const dismissing = ref(false);
let dismissHandled = false;

const emitDismiss = (): void => {
  if (dismissHandled) return;
  dismissHandled = true;
  emit("dismiss");
};

const onDismiss = (): void => {
  if (!props.animated || off.value) {
    emitDismiss();
    return;
  }
  const el = alertEl.value;
  if (!el || typeof el.animate !== "function") {
    emitDismiss();
    return;
  }
  dismissing.value = true;
  const ms = props.duration ?? (reduced.value ? 89 : 233);
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

  const h = el.offsetHeight;
  const anim = el.animate(
    [
      {
        height: `${h}px`,
        opacity: "1",
        marginBottom: style.marginBottom,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        overflow: "hidden",
      },
      {
        height: "0px",
        opacity: "0",
        marginBottom: "0px",
        paddingTop: "0px",
        paddingBottom: "0px",
        overflow: "hidden",
      },
    ],
    { duration: ms, easing },
  );
  anim.onfinish = emitDismiss;
  anim.oncancel = emitDismiss;
};

const iconName = (): string => {
  switch (props.variant) {
    case "success":
      return "check-circle";
    case "warning":
      return "warning";
    case "danger":
      return "x-circle";
    default:
      return "info";
  }
};
</script>

<template>
  <div
    ref="alertEl"
    :class="[
      'vd-alert',
      `vd-alert-${variant}`,
      { 'is-dismissing': dismissing },
    ]"
    role="alert"
  >
    <VdIcon :name="iconName()" class="vd-alert-icon" />
    <div class="vd-alert-body">
      <p v-if="title" class="vd-alert-title">
        {{ title }}
      </p>
      <div class="vd-alert-content">
        <slot />
      </div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="vd-alert-dismiss"
      aria-label="Dismiss"
      :disabled="dismissing"
      @click="onDismiss"
    >
      <VdIcon name="x" />
    </button>
  </div>
</template>
