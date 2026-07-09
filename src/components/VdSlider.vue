<script setup lang="ts">
import { useId } from "vue";

interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  label: "",
  showValue: false,
  disabled: false,
  name: "",
  id: "",
});

const emit = defineEmits<{ "update:modelValue": [value: number] }>();

const autoId = useId();
const fieldId = (): string => props.id || props.name || autoId;

const onInput = (event: Event): void => {
  emit("update:modelValue", Number((event.target as HTMLInputElement).value));
};
</script>

<template>
  <div class="vd-slider-field">
    <label v-if="label" :for="fieldId()" class="vd-form-label">{{
      label
    }}</label>
    <div class="vd-slider-row">
      <input
        :id="fieldId()"
        type="range"
        class="vd-slider"
        :name="name"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :disabled="disabled"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="modelValue"
        @input="onInput"
      />
      <span v-if="showValue" class="vd-slider-value">{{ modelValue }}</span>
    </div>
  </div>
</template>
