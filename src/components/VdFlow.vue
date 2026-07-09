<script setup lang="ts">
import { computed, ref } from "vue";

interface Props {
  modelValue: number;
  total: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{ "update:modelValue": [value: number] }>();

const index = ref(props.modelValue);

const go = (next: number): void => {
  const clamped = Math.max(0, Math.min(props.total - 1, next));
  if (clamped !== index.value) {
    index.value = clamped;
    emit("update:modelValue", clamped);
  }
};

const prev = (): void => go(index.value - 1);
const next = (): void => go(index.value + 1);

defineExpose({ go, prev, next, index });

const slides = computed(() => Array.from({ length: props.total }, (_, i) => i));
</script>

<template>
  <div class="vd-flow" role="region" aria-roledescription="carousel">
    <div
      class="vd-flow-track"
      :style="{ transform: `translateX(-${index * 100}%)` }"
    >
      <div
        v-for="i in slides"
        :key="i"
        class="vd-flow-slide"
        :aria-hidden="i !== index"
      >
        <slot :name="`slide-${i}`" :index="i" />
      </div>
    </div>
    <div v-if="total > 1" class="vd-flow-controls">
      <button
        type="button"
        class="vd-btn vd-btn-ghost vd-btn-icon"
        aria-label="Previous slide"
        :disabled="index === 0"
        @click="prev"
      >
        ‹
      </button>
      <span class="vd-flow-position">{{ index + 1 }} / {{ total }}</span>
      <button
        type="button"
        class="vd-btn vd-btn-ghost vd-btn-icon"
        aria-label="Next slide"
        :disabled="index === total - 1"
        @click="next"
      >
        ›
      </button>
    </div>
  </div>
</template>
