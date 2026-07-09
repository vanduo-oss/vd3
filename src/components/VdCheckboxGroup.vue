<script setup lang="ts">
interface CheckOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  options: readonly CheckOption[];
  modelValue: readonly string[];
  name: string;
  inline?: boolean;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

withDefaults(defineProps<Props>(), {
  inline: false,
  size: "md",
  disabled: false,
});

const isChecked = (options: readonly string[], value: string): boolean =>
  options.includes(value);

const toggle = (current: readonly string[], value: string): string[] => {
  const next = [...current];
  const idx = next.indexOf(value);
  if (idx === -1) next.push(value);
  else next.splice(idx, 1);
  return next;
};

const onChange = (props: Props, value: string): void => {
  emit("update:modelValue", toggle(props.modelValue, value));
};
</script>

<template>
  <div
    class="vd-form-check-group"
    :class="{ 'vd-form-check-group-inline': inline }"
    role="group"
  >
    <div
      v-for="opt in options"
      :key="opt.value"
      class="vd-form-check"
      :class="[`vd-form-check-${size}`, { 'vd-form-check-inline': inline }]"
    >
      <input
        :id="`${name}-${opt.value}`"
        type="checkbox"
        :name="name"
        :value="opt.value"
        :checked="isChecked(modelValue, opt.value)"
        :disabled="disabled || opt.disabled"
        class="vd-form-check-input"
        @change="onChange($props, opt.value)"
      />
      <label :for="`${name}-${opt.value}`" class="vd-form-check-label">
        {{ opt.label }}
      </label>
    </div>
  </div>
</template>
