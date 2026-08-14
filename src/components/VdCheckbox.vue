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
  <div
    class="vd-form-check"
    :class="size !== 'md' ? `vd-form-check-${size}` : null"
  >
    <input
      :id="fieldId()"
      type="checkbox"
      class="vd-form-check-input"
      :name="name"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    />
    <label :for="fieldId()" class="vd-form-check-label">
      <slot>{{ label }}</slot>
    </label>
  </div>
</template>
