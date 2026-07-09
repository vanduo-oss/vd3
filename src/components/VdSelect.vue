<script setup lang="ts" generic="T extends string">
import { computed } from "vue";
import type { VdSelectProps } from "./form-types";

const props = withDefaults(defineProps<VdSelectProps<T>>(), {
  name: "",
  id: "",
  placeholder: "",
  disabled: false,
  required: false,
});

const emit = defineEmits<{ "update:modelValue": [value: T] }>();

const currentLabel = computed(
  () => props.options.find((o) => o.value === props.modelValue)?.label ?? "",
);

const onChange = (event: Event): void => {
  emit("update:modelValue", (event.target as HTMLSelectElement).value as T);
};
</script>

<template>
  <select
    :id="id || name"
    :name="name"
    :value="modelValue"
    :disabled="disabled"
    :required="required"
    class="vd-input"
    @change="onChange"
  >
    <option v-if="placeholder" value="" disabled>
      {{ placeholder }}
    </option>
    <option
      v-for="opt in options"
      :key="opt.value"
      :value="opt.value"
      :disabled="opt.disabled"
    >
      {{ opt.label }}
    </option>
  </select>
  <span class="vd-visually-hidden">{{ currentLabel }}</span>
</template>
