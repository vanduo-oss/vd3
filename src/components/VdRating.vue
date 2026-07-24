<script setup lang="ts">
import { computed, ref, watch, type ComponentPublicInstance } from "vue";

interface Props {
  modelValue: number;
  max?: number;
  size?: "sm" | "lg";
  readonly?: boolean;
  name?: string;
}

const props = withDefaults(defineProps<Props>(), {
  max: 5,
  size: undefined,
  readonly: false,
  name: "",
});

const emit = defineEmits<{
  "update:modelValue": [value: number];
  change: [value: number];
}>();

const current = ref(props.modelValue);
const hovered = ref(-1);

watch(
  () => props.modelValue,
  (v) => {
    current.value = v;
  },
);

const stars = computed(() =>
  Array.from({ length: props.max }, (_, i) => i + 1),
);

// The single roving tab stop: the selected star, or the first star when
// nothing is selected yet.
const focusStar = computed(() => {
  const c = Math.round(current.value);
  return c >= 1 && c <= props.max ? c : 1;
});

// Live references to the star buttons so arrow keys can move DOM focus.
const starButtons: HTMLButtonElement[] = [];
const setStar = (
  el: Element | ComponentPublicInstance | null,
  index: number,
): void => {
  if (el instanceof HTMLElement) starButtons[index] = el as HTMLButtonElement;
};

// Mirrors rating.js updateStars: empty buttons styled via CSS ::before; the
// fill state is conveyed entirely by is-active / is-half / is-hovered.
const starClass = (starNum: number): Record<string, boolean> => ({
  "is-active": starNum <= Math.floor(current.value),
  "is-half":
    starNum > Math.floor(current.value) && starNum - 0.5 <= current.value,
  "is-hovered": hovered.value >= 0 && starNum <= hovered.value,
});

const select = (starNum: number): void => {
  if (props.readonly) return;
  current.value = starNum;
  emit("update:modelValue", starNum);
  emit("change", starNum);
};

const onKeydown = (e: KeyboardEvent): void => {
  if (props.readonly) return;
  let next: number;
  if (
    (e.key === "ArrowRight" || e.key === "ArrowUp") &&
    current.value < props.max
  ) {
    next = current.value + 1;
  } else if (
    (e.key === "ArrowLeft" || e.key === "ArrowDown") &&
    current.value > 1
  ) {
    next = current.value - 1;
  } else {
    return;
  }
  e.preventDefault();
  select(next);
  // Move DOM focus to the newly-active star (roving focus).
  starButtons[Math.round(next) - 1]?.focus();
};
</script>

<template>
  <div
    class="vd-rating"
    :class="[
      size ? `vd-rating-${size}` : null,
      { 'vd-rating-readonly': readonly },
    ]"
    role="radiogroup"
    aria-label="Rating"
    @keydown="onKeydown"
    @mouseleave="hovered = -1"
  >
    <button
      v-for="starNum in stars"
      :key="starNum"
      :ref="(el) => setStar(el, starNum - 1)"
      type="button"
      class="vd-rating-star"
      :class="starClass(starNum)"
      role="radio"
      :aria-checked="starNum === current ? 'true' : 'false'"
      :aria-label="`${starNum} star${starNum > 1 ? 's' : ''}`"
      :tabindex="readonly ? -1 : starNum === focusStar ? 0 : -1"
      @mouseenter="readonly ? null : (hovered = starNum)"
      @click="select(starNum)"
    />
    <span class="vd-rating-value">{{ current > 0 ? current : "" }}</span>
  </div>
</template>
