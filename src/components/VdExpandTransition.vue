<script setup lang="ts">
import {
  useReducedMotion,
  fibDurationForHeight,
} from "../composables/useMotion";

interface Props {
  /** Explicit duration in ms, or { enter?: number, leave?: number }. If omitted, reads CSS var --vd-expand-duration or adaptive fib. */
  duration?: number | { enter?: number; leave?: number };
  /** Whether animation is enabled on this component instance (default true). */
  animated?: boolean;
  /** Whether to animate on initial mount (default false). */
  appear?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  animated: true,
  appear: false,
});

const emit = defineEmits<{
  "before-enter": [el: Element];
  "after-enter": [el: Element];
  "enter-cancelled": [el: Element];
  "before-leave": [el: Element];
  "after-leave": [el: Element];
  "leave-cancelled": [el: Element];
}>();

const { reduced, off } = useReducedMotion();
const activeAnims = new WeakMap<Element, Animation>();

function resolveDuration(
  el: HTMLElement,
  type: "enter" | "leave",
  fallbackHeight: number,
): number {
  if (typeof props.duration === "number") return props.duration;
  if (props.duration && typeof props.duration[type] === "number") {
    return props.duration[type]!;
  }
  const cssVar = getComputedStyle(el)
    .getPropertyValue("--vd-expand-duration")
    .trim();
  if (cssVar) {
    const parsed = parseFloat(cssVar);
    if (!Number.isNaN(parsed)) {
      return cssVar.endsWith("s") && !cssVar.endsWith("ms")
        ? parsed * 1000
        : parsed;
    }
  }
  return fibDurationForHeight(fallbackHeight);
}

function onEnter(el: Element, done: () => void): void {
  const htmlEl = el as HTMLElement;
  if (!props.animated || off.value || typeof htmlEl.animate !== "function") {
    done();
    return;
  }

  const cleanup = (): void => {
    activeAnims.delete(el);
    htmlEl.style.height = "";
    htmlEl.style.overflow = "";
    htmlEl.style.opacity = "";
    done();
  };

  if (reduced.value) {
    const anim = htmlEl.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 89,
      easing: "ease-out",
    });
    activeAnims.set(el, anim);
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
    return;
  }

  const height = htmlEl.scrollHeight;
  const duration = resolveDuration(htmlEl, "enter", height);
  const easing =
    getComputedStyle(htmlEl).getPropertyValue("--vd-ease-out").trim() ||
    "cubic-bezier(0.236, 1, 0.382, 1)";

  const anim = htmlEl.animate(
    [
      { height: "0px", opacity: 0, overflow: "hidden" },
      { height: `${height}px`, opacity: 1, overflow: "hidden" },
    ],
    { duration, easing },
  );

  activeAnims.set(el, anim);
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
}

function onLeave(el: Element, done: () => void): void {
  const htmlEl = el as HTMLElement;
  if (!props.animated || off.value || typeof htmlEl.animate !== "function") {
    done();
    return;
  }

  const cleanup = (): void => {
    activeAnims.delete(el);
    done();
  };

  if (reduced.value) {
    const anim = htmlEl.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 89,
      easing: "ease-in",
    });
    activeAnims.set(el, anim);
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
    return;
  }

  const height = htmlEl.offsetHeight || htmlEl.scrollHeight;
  const duration = resolveDuration(htmlEl, "leave", height);
  const easing =
    getComputedStyle(htmlEl).getPropertyValue("--vd-ease-in").trim() ||
    "cubic-bezier(0.618, 0, 0.764, 0)";

  const anim = htmlEl.animate(
    [
      { height: `${height}px`, opacity: 1, overflow: "hidden" },
      { height: "0px", opacity: 0, overflow: "hidden" },
    ],
    { duration, easing },
  );

  activeAnims.set(el, anim);
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
}

function onEnterCancelled(el: Element): void {
  const anim = activeAnims.get(el);
  if (anim) {
    anim.cancel();
    activeAnims.delete(el);
  }
  emit("enter-cancelled", el);
}

function onLeaveCancelled(el: Element): void {
  const anim = activeAnims.get(el);
  if (anim) {
    anim.cancel();
    activeAnims.delete(el);
  }
  emit("leave-cancelled", el);
}
</script>

<template>
  <Transition
    :css="false"
    :appear="appear"
    @enter="onEnter"
    @leave="onLeave"
    @enter-cancelled="onEnterCancelled"
    @leave-cancelled="onLeaveCancelled"
    @before-enter="emit('before-enter', $event)"
    @after-enter="emit('after-enter', $event)"
    @before-leave="emit('before-leave', $event)"
    @after-leave="emit('after-leave', $event)"
  >
    <slot />
  </Transition>
</template>
