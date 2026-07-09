<script setup lang="ts">
import { useId } from "vue";

type Size = "sm" | "md" | "lg";

interface Props {
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
  size?: Size;
  name?: string;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  disabled: false,
  size: "md",
  name: "",
  id: "",
});

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const autoId = useId();
const fieldId = (): string => props.id || props.name || autoId;

const onChange = (event: Event): void => {
  emit("update:modelValue", (event.target as HTMLInputElement).checked);
};
</script>

<template>
  <label
    class="vd-form-switch"
    :class="size !== 'md' ? `vd-form-switch-${size}` : null"
    :for="fieldId()"
  >
    <input
      :id="fieldId()"
      type="checkbox"
      class="vd-form-switch-input"
      role="switch"
      :name="name"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    />
    <span class="vd-form-switch-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>
