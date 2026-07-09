<script setup lang="ts" generic="T extends string">
import VdIcon from "./VdIcon.vue";
import type { VdRadioGroupProps } from "./form-types";

const emit = defineEmits<{ "update:modelValue": [value: T] }>();

withDefaults(defineProps<VdRadioGroupProps<T>>(), {
  inline: false,
  size: "md",
  disabled: false,
});
</script>

<template>
  <div
    class="vd-form-radio-group"
    :class="{ 'vd-form-radio-group-inline': inline }"
    role="radiogroup"
  >
    <div
      v-for="opt in options"
      :key="opt.value"
      class="vd-form-radio"
      :class="[`vd-form-radio-${size}`, { 'vd-form-radio-inline': inline }]"
    >
      <input
        :id="`${name}-${opt.value}`"
        type="radio"
        :name="name"
        :value="opt.value"
        :checked="modelValue === opt.value"
        :disabled="disabled || opt.disabled"
        class="vd-form-radio-input"
        @change="emit('update:modelValue', opt.value)"
      />
      <label :for="`${name}-${opt.value}`" class="vd-form-radio-label">
        <VdIcon v-if="opt.icon" :name="opt.icon" class="vd-form-radio-icon" />
        {{ opt.label }}
      </label>
    </div>
  </div>
</template>
