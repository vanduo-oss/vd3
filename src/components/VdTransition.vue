<script setup lang="ts">
import { computed } from "vue";
import { useReducedMotion } from "../composables/useMotion";

export type TransitionPreset =
  "fade" | "scale" | "slide-up" | "slide-down" | "slide-left" | "slide-right";

interface Props {
  /** Transition preset name (default 'fade'). */
  name?: TransitionPreset;
  /** Custom duration in ms override for this transition. */
  duration?: number;
  /** Whether animation is enabled on this instance (default true). */
  animated?: boolean;
  /** Animate on initial mount (default false). */
  appear?: boolean;
  /** Transition mode: 'out-in' or 'in-out'. */
  mode?: "out-in" | "in-out";
}

const props = withDefaults(defineProps<Props>(), {
  name: "fade",
  animated: true,
  appear: false,
});

const emit = defineEmits<{
  "before-enter": [el: Element];
  "after-enter": [el: Element];
  "before-leave": [el: Element];
  "after-leave": [el: Element];
}>();

const { off } = useReducedMotion();

const transitionName = computed(() => {
  if (!props.animated || off.value) return undefined;
  return `vd-${props.name}`;
});

function applyDuration(el: Element): void {
  if (typeof props.duration === "number" && "style" in (el as HTMLElement)) {
    (el as HTMLElement).style.setProperty(
      "--vd-transition-duration",
      `${props.duration}ms`,
    );
  }
}

function clearDuration(el: Element): void {
  if (typeof props.duration === "number" && "style" in (el as HTMLElement)) {
    (el as HTMLElement).style.removeProperty("--vd-transition-duration");
  }
}

function handleBeforeEnter(el: Element): void {
  applyDuration(el);
  emit("before-enter", el);
}

function handleAfterEnter(el: Element): void {
  clearDuration(el);
  emit("after-enter", el);
}

function handleBeforeLeave(el: Element): void {
  applyDuration(el);
  emit("before-leave", el);
}

function handleAfterLeave(el: Element): void {
  clearDuration(el);
  emit("after-leave", el);
}

defineExpose({ transitionName });
</script>

<template>
  <Transition
    :name="transitionName"
    :appear="appear"
    :mode="mode"
    @before-enter="handleBeforeEnter"
    @after-enter="handleAfterEnter"
    @before-leave="handleBeforeLeave"
    @after-leave="handleAfterLeave"
  >
    <slot />
  </Transition>
</template>
