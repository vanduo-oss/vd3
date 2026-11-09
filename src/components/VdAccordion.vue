<script setup lang="ts">
import VdExpandTransition from "./VdExpandTransition.vue";

interface Item {
  id: string;
  title: string;
  content?: string;
}

interface Props {
  items: Item[];
  modelValue: string | string[];
  exclusive?: boolean;
  /** Whether unfold/collapse animations are enabled (default true). */
  animated?: boolean;
  /** Explicit duration in ms. If omitted, uses adaptive Fibonacci duration. */
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  exclusive: false,
  animated: true,
});

const emit = defineEmits<{ "update:modelValue": [value: string | string[]] }>();

const isOpen = (id: string): boolean => {
  if (props.exclusive) {
    return props.modelValue === id;
  }
  return Array.isArray(props.modelValue) && props.modelValue.includes(id);
};

const toggle = (id: string): void => {
  if (props.exclusive) {
    emit("update:modelValue", props.modelValue === id ? "" : id);
    return;
  }
  const current = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  const idx = current.indexOf(id);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(id);
  emit("update:modelValue", current);
};
</script>

<template>
  <ul class="vd-accordion">
    <li
      v-for="item in items"
      :key="item.id"
      :class="['vd-accordion-item', isOpen(item.id) ? 'is-open' : null]"
    >
      <button
        type="button"
        class="vd-accordion-header"
        :aria-expanded="isOpen(item.id)"
        :aria-controls="`vd-accordion-panel-${item.id}`"
        @click="toggle(item.id)"
      >
        <span>{{ item.title }}</span>
        <span class="vd-accordion-icon" aria-hidden="true">{{
          isOpen(item.id) ? "−" : "+"
        }}</span>
      </button>
      <VdExpandTransition :animated="animated" :duration="duration">
        <div
          v-show="isOpen(item.id)"
          :id="`vd-accordion-panel-${item.id}`"
          class="vd-accordion-panel"
          role="region"
        >
          <slot :name="item.id" :item="item">
            {{ item.content }}
          </slot>
        </div>
      </VdExpandTransition>
    </li>
  </ul>
</template>
