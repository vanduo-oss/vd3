<script setup lang="ts">
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

const select = (id: string): void => {
  if (id !== props.modelValue) emit("update:modelValue", id);
};
</script>

<template>
  <div class="vd-tabs" role="tablist">
    <div class="vd-tab-list" role="presentation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="tab.id === modelValue"
        :class="['vd-tab', tab.id === modelValue ? 'is-active' : null]"
        @click="select(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="vd-tab-panels">
      <slot />
    </div>
  </div>
</template>
