<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string;
  options: readonly CustomSelectOption[];
  id?: string;
  name?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  name: "",
  placeholder: "Select...",
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const open = ref(false);
const activeIndex = ref(-1);
const wrapper = ref<HTMLElement | null>(null);
const buttonId = computed(() => props.id || props.name || "custom-select");

const selectableIndexes = computed(() =>
  props.options.flatMap((o, i) => (o.disabled ? [] : [i])),
);

const buttonText = computed(() => {
  const match = props.options.find((o) => o.value === props.modelValue);
  return match ? match.label : props.placeholder;
});

const openDropdown = (): void => {
  open.value = true;
  const selectedIdx = props.options.findIndex(
    (o) => o.value === props.modelValue,
  );
  activeIndex.value =
    selectedIdx >= 0 && !props.options[selectedIdx]?.disabled
      ? selectedIdx
      : (selectableIndexes.value[0] ?? -1);
};

const closeDropdown = (): void => {
  open.value = false;
};

const toggle = (): void => {
  if (open.value) closeDropdown();
  else openDropdown();
};

const selectOption = (option: CustomSelectOption): void => {
  if (option.disabled) return;
  emit("update:modelValue", option.value);
  closeDropdown();
};

const moveActive = (delta: number): void => {
  const list = selectableIndexes.value;
  if (list.length === 0) return;
  const pos = list.indexOf(activeIndex.value);
  const nextPos = pos < 0 ? 0 : (pos + delta + list.length) % list.length;
  activeIndex.value = list[nextPos] ?? -1;
};

// Per-instance typeahead, mirroring select.js
let typeaheadBuffer = "";
let typeaheadTimer: number | null = null;

const onKeydown = (e: KeyboardEvent): void => {
  switch (e.key) {
    case "Enter":
    case " ":
      e.preventDefault();
      if (open.value && activeIndex.value >= 0) {
        const opt = props.options[activeIndex.value];
        if (opt) selectOption(opt);
      } else {
        openDropdown();
      }
      break;
    case "Escape":
      if (open.value) {
        e.preventDefault();
        closeDropdown();
      }
      break;
    case "ArrowDown":
      e.preventDefault();
      if (!open.value) openDropdown();
      else moveActive(1);
      break;
    case "ArrowUp":
      e.preventDefault();
      if (open.value) moveActive(-1);
      break;
    case "Home":
      if (open.value) {
        e.preventDefault();
        activeIndex.value = selectableIndexes.value[0] ?? -1;
      }
      break;
    case "End":
      if (open.value) {
        e.preventDefault();
        const list = selectableIndexes.value;
        activeIndex.value = list[list.length - 1] ?? -1;
      }
      break;
    default:
      if (
        open.value &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if (typeaheadTimer != null) window.clearTimeout(typeaheadTimer);
        typeaheadBuffer += e.key.toLowerCase();
        const match = props.options.findIndex(
          (o) =>
            !o.disabled && o.label.toLowerCase().startsWith(typeaheadBuffer),
        );
        if (match >= 0) activeIndex.value = match;
        typeaheadTimer = window.setTimeout(() => {
          typeaheadBuffer = "";
        }, 500);
      }
  }
};

const onDocumentClick = (e: MouseEvent): void => {
  if (
    open.value &&
    wrapper.value &&
    !wrapper.value.contains(e.target as Node)
  ) {
    closeDropdown();
  }
};

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  if (typeaheadTimer != null) window.clearTimeout(typeaheadTimer);
});
</script>

<template>
  <div ref="wrapper" class="custom-select-wrapper">
    <select
      :id="id || undefined"
      :name="name || undefined"
      :value="modelValue"
      tabindex="-1"
      aria-hidden="true"
    >
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
        :disabled="opt.disabled"
      >
        {{ opt.label }}
      </option>
    </select>
    <button
      type="button"
      class="custom-select-button"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-labelledby="buttonId"
      @click.stop="toggle"
      @keydown="onKeydown"
    >
      {{ buttonText }}
    </button>
    <div
      class="custom-select-dropdown"
      :class="{ 'is-open': open }"
      role="listbox"
    >
      <div
        v-for="(opt, i) in options"
        :key="opt.value"
        class="custom-select-option"
        :class="{
          'is-selected': opt.value === modelValue,
          'is-disabled': opt.disabled,
          'is-active': i === activeIndex,
        }"
        role="option"
        :data-value="opt.value"
        :aria-selected="opt.value === modelValue ? 'true' : 'false'"
        :aria-disabled="opt.disabled ? 'true' : undefined"
        @click="selectOption(opt)"
        @mouseenter="activeIndex = i"
      >
        {{ opt.label }}
      </div>
    </div>
  </div>
</template>
