<script setup lang="ts">
import { computed, useId } from "vue";

type Size = "sm" | "md" | "lg";
// Validation state. `danger` replaces the former `error` spelling.
type Variant = "success" | "danger";

interface Props {
  modelValue: string | number;
  type?: string;
  /** Field label rendered above the input. */
  label?: string;
  /** Helper text below the input (hidden when `error` is set). */
  hint?: string;
  /** Error message; its presence also styles the input as `danger`. */
  error?: string;
  /** Static text/symbol before the input (e.g. a currency sign). */
  prefix?: string;
  /** Static text/symbol after the input (e.g. a unit). */
  suffix?: string;
  placeholder?: string;
  size?: Size;
  variant?: Variant;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  minlength?: number;
  maxlength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  pattern?: string;
  autocomplete?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  label: "",
  hint: "",
  error: "",
  prefix: "",
  suffix: "",
  placeholder: "",
  size: "md",
  variant: undefined,
  disabled: false,
  readonly: false,
  required: false,
  name: "",
  id: "",
  minlength: undefined,
  maxlength: undefined,
  min: undefined,
  max: undefined,
  step: undefined,
  pattern: "",
  autocomplete: "",
});

const emit = defineEmits<{
  // Emits a `number` when `type="number"`, otherwise a `string`.
  "update:modelValue": [value: string | number];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const autoId = useId();
const inputId = computed(() => props.id || props.name || autoId);
const stateClass = computed(() =>
  props.error
    ? "vd-input-danger"
    : props.variant
      ? `vd-input-${props.variant}`
      : null,
);
const describedBy = computed(() =>
  props.error
    ? `${inputId.value}-error`
    : props.hint
      ? `${inputId.value}-hint`
      : undefined,
);

const onInput = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const value =
    props.type === "number" && target.value !== ""
      ? Number(target.value)
      : target.value;
  emit("update:modelValue", value);
};
</script>

<template>
  <div class="vd-form-group">
    <label v-if="label" :for="inputId" class="vd-form-label">{{ label }}</label>
    <div class="vd-input-group">
      <span v-if="prefix" class="vd-input-group-prefix">{{ prefix }}</span>
      <input
        :id="inputId"
        :type="type"
        :name="name"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :minlength="minlength"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        :step="step"
        :pattern="pattern || undefined"
        :autocomplete="autocomplete || undefined"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy"
        class="vd-input"
        :class="[`vd-input-${size}`, stateClass]"
        @input="onInput"
        @blur="(e) => emit('blur', e as FocusEvent)"
        @focus="(e) => emit('focus', e as FocusEvent)"
      />
      <span v-if="suffix" class="vd-input-group-suffix">{{ suffix }}</span>
    </div>
    <span v-if="error" :id="`${inputId}-error`" class="vd-form-error">{{
      error
    }}</span>
    <span v-else-if="hint" :id="`${inputId}-hint`" class="vd-form-help">{{
      hint
    }}</span>
  </div>
</template>
