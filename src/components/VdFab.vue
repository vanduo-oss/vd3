<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

/**
 * FAB colour variants supported by fab.css. The base `.vd-fab` is already
 * primary, so `primary` emits no modifier class. `error` is an alias for
 * `danger` (unified status vocabulary).
 */
type Variant = "primary" | "secondary" | "success" | "danger" | "error";
type Size = "sm" | "md" | "lg";
type Position =
  "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";

interface Props {
  variant?: Variant;
  size?: Size;
  extended?: boolean;
  glass?: boolean;
  position?: Position;
  /** Visible text for the extended (pill) mode; also the fallback aria-label. */
  label?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  extended: false,
  glass: false,
  position: undefined,
  label: "",
  ariaLabel: "",
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const slots = defineSlots<{
  /** The icon (button content). */
  default?: () => unknown;
  /** Speed-dial action buttons; presence switches on the menu wrapper. */
  actions?: () => unknown;
}>();

const isMenu = computed(() => Boolean(slots.actions));
const isOpen = ref(false);

const variantClass = computed(() => {
  if (props.variant === "primary") return null;
  const name = props.variant === "error" ? "danger" : props.variant;
  return `vd-fab-${name}`;
});

const sizeClass = computed(() =>
  props.size === "md" ? null : `vd-fab-${props.size}`,
);

const positionClass = computed(() => {
  switch (props.position) {
    case "bottom-right":
      return "vd-fab-fixed";
    case "bottom-left":
      return "vd-fab-bottom-left";
    case "top-right":
      return "vd-fab-top-right";
    case "top-left":
      return "vd-fab-top-left";
    case "center":
      return "vd-fab-center";
    default:
      return null;
  }
});

const buttonClasses = computed(() => [
  "vd-fab",
  variantClass.value,
  sizeClass.value,
  props.extended ? "vd-fab-extended" : null,
  props.glass ? "vd-fab-glass" : null,
  // In menu mode the position class lives on the wrapper.
  isMenu.value ? null : positionClass.value,
]);

const menuClasses = computed(() => [
  "vd-fab-menu",
  positionClass.value,
  { "is-open": isOpen.value },
]);

const resolvedLabel = computed(
  () => props.ariaLabel || props.label || undefined,
);

const root = ref<HTMLElement | null>(null);

const close = (): void => {
  isOpen.value = false;
};

const onTriggerClick = (event: MouseEvent): void => {
  if (isMenu.value) isOpen.value = !isOpen.value;
  emit("click", event);
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape" && isOpen.value) {
    event.preventDefault();
    close();
  }
};

const onDocumentClick = (event: MouseEvent): void => {
  if (!isOpen.value) return;
  if (root.value && !root.value.contains(event.target as Node)) close();
};

onMounted(() => {
  if (typeof window === "undefined") return;
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("click", onDocumentClick, true);
});

onBeforeUnmount(() => {
  if (typeof window === "undefined") return;
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("click", onDocumentClick, true);
});
</script>

<template>
  <div v-if="isMenu" ref="root" :class="menuClasses">
    <button
      type="button"
      :class="buttonClasses"
      :aria-label="resolvedLabel"
      :aria-expanded="isOpen"
      @click="onTriggerClick"
    >
      <slot />
      <span v-if="extended && label">{{ label }}</span>
    </button>
    <div class="vd-fab-actions">
      <slot name="actions" />
    </div>
  </div>

  <button
    v-else
    type="button"
    :class="buttonClasses"
    :aria-label="resolvedLabel"
    @click="onTriggerClick"
  >
    <slot />
    <span v-if="extended && label">{{ label }}</span>
  </button>
</template>
