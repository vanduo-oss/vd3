<script setup lang="ts">
import { useId, type ComponentPublicInstance } from "vue";

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  modelValue: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

// Stable, collision-free id base for the tab/panel ARIA wiring.
const groupId = useId();
const tabButtonId = (id: string): string => `${groupId}-tab-${id}`;
const panelId = `${groupId}-panel`;

// Live references to the tab buttons so arrow-key navigation can move DOM
// focus alongside the roving tabindex.
const tabButtons: HTMLButtonElement[] = [];
const setBtn = (
  el: Element | ComponentPublicInstance | null,
  index: number,
): void => {
  if (el instanceof HTMLElement) tabButtons[index] = el as HTMLButtonElement;
};

const select = (id: string): void => {
  if (id !== props.modelValue) emit("update:modelValue", id);
};

const onKeydown = (event: KeyboardEvent, index: number): void => {
  const count = props.tabs.length;
  if (count === 0) return;
  let next: number;
  switch (event.key) {
    case "ArrowRight":
      next = (index + 1) % count;
      break;
    case "ArrowLeft":
      next = (index - 1 + count) % count;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = count - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  const tab = props.tabs[next];
  if (!tab) return;
  select(tab.id);
  tabButtons[next]?.focus();
};
</script>

<template>
  <div class="vd-tabs">
    <div class="vd-tab-list" role="tablist">
      <button
        v-for="(tab, index) in tabs"
        :id="tabButtonId(tab.id)"
        :key="tab.id"
        :ref="(el) => setBtn(el, index)"
        type="button"
        role="tab"
        :aria-selected="tab.id === modelValue"
        :aria-controls="panelId"
        :tabindex="tab.id === modelValue ? 0 : -1"
        :class="['vd-tab', tab.id === modelValue ? 'is-active' : null]"
        @click="select(tab.id)"
        @keydown="onKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      :id="panelId"
      class="vd-tab-panels"
      role="tabpanel"
      :aria-labelledby="tabButtonId(modelValue)"
    >
      <slot />
    </div>
  </div>
</template>
