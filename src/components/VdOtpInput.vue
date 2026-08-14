<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";

interface Props {
  modelValue: string;
  length?: number;
  disabled?: boolean;
  name?: string;
  id?: string;
  labelledBy?: string;
}

const props = withDefaults(defineProps<Props>(), {
  length: 6,
  disabled: false,
  name: "",
  id: "",
  labelledBy: "",
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const autoId = useId();
const rootId = computed(() => props.id || props.name || autoId);

const cells = ref<(HTMLInputElement | null)[]>([]);
const digits = ref<string[]>(
  Array.from({ length: props.length }, (_, i) => props.modelValue[i] ?? ""),
);

const setCellRef = (el: Element | null, index: number): void => {
  cells.value[index] = el instanceof HTMLInputElement ? el : null;
};

const emitJoined = (): void => {
  emit("update:modelValue", digits.value.join(""));
};

const focusAt = (index: number): void => {
  cells.value[index]?.focus();
};

watch(
  () => [props.modelValue, props.length] as const,
  ([value, length]) => {
    const next = Array.from({ length }, (_, i) => value[i] ?? "");
    digits.value = next;
  },
);

const onInput = (index: number, event: Event): void => {
  const target = event.target as HTMLInputElement;
  const char = target.value.replace(/\D/g, "").slice(-1);
  const next = [...digits.value];
  next[index] = char;
  digits.value = next;
  target.value = char;
  emitJoined();
  if (char && index < props.length - 1) focusAt(index + 1);
};

const onKeydown = (index: number, event: KeyboardEvent): void => {
  if (event.key !== "Backspace") return;
  if (digits.value[index]) return;
  if (index === 0) return;
  event.preventDefault();
  focusAt(index - 1);
};

const onPaste = (event: ClipboardEvent): void => {
  event.preventDefault();
  const text = event.clipboardData?.getData("text") ?? "";
  const chars = text.replace(/\D/g, "").slice(0, props.length).split("");
  const next = Array.from({ length: props.length }, (_, i) => chars[i] ?? "");
  digits.value = next;
  emitJoined();
  const last = Math.min(chars.length, props.length) - 1;
  if (last >= 0) focusAt(last);
};
</script>

<template>
  <div class="vd-otp" role="group" :aria-labelledby="labelledBy || undefined">
    <input
      v-for="(digit, index) in digits"
      :id="index === 0 ? rootId : `${rootId}-${index}`"
      :key="index"
      :ref="(el) => setCellRef(el as Element | null, index)"
      class="vd-input vd-otp-cell"
      type="text"
      inputmode="numeric"
      maxlength="1"
      :name="index === 0 ? name || undefined : undefined"
      :value="digit"
      :disabled="disabled"
      :autocomplete="index === 0 ? 'one-time-code' : 'off'"
      :spellcheck="false"
      autocapitalize="none"
      :aria-label="`Digit ${index + 1} of ${length}`"
      @input="onInput(index, $event)"
      @keydown="onKeydown(index, $event)"
      @paste="onPaste($event)"
    />
  </div>
</template>
