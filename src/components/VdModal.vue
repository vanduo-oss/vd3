<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onScopeDispose,
  ref,
  watch,
} from "vue";
import VdIcon from "./VdIcon.vue";
import { useFocusTrap } from "../composables/useFocusTrap";

interface Props {
  open: boolean;
  title?: string;
  size?: "sm" | "md" | "lg";
  closeOnBackdrop?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  size: "md",
  closeOnBackdrop: true,
});

const emit = defineEmits<{
  "update:open": [value: boolean];
  close: [];
}>();

const panel = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(panel);

// The element focused before the dialog opened, restored on close.
let previouslyFocused: HTMLElement | null = null;

const sizeClass = computed(() => `vd-modal-panel-${props.size}`);

const close = (): void => {
  emit("update:open", false);
  emit("close");
};

const onBackdrop = (): void => {
  if (props.closeOnBackdrop) close();
};

const onKeydown = (event: KeyboardEvent): void => {
  if (!props.open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    close();
  }
};

// Detach the global Escape listener unconditionally — a modal unmounted while
// open must not leave a listener that hijacks Escape for the whole page.
const removeKeydown = (): void => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", onKeydown);
  }
};

watch(
  () => props.open,
  async (open) => {
    if (typeof window === "undefined") return;
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      window.addEventListener("keydown", onKeydown);
      await nextTick();
      activate();
      if (panel.value && !panel.value.contains(document.activeElement)) {
        panel.value.focus();
      }
    } else {
      removeKeydown();
      deactivate();
      previouslyFocused?.focus();
      previouslyFocused = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(removeKeydown);
onScopeDispose(removeKeydown);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="vd-modal vd-modal-open"
      role="dialog"
      aria-modal="true"
      :aria-label="title || 'Dialog'"
      data-vd-modal
    >
      <div class="vd-modal-backdrop" @click="onBackdrop" />
      <div ref="panel" :class="['vd-modal-panel', sizeClass]" tabindex="-1">
        <header v-if="title || $slots.header" class="vd-modal-header">
          <h2 v-if="title" class="vd-modal-title">
            {{ title }}
          </h2>
          <slot name="header" />
          <button
            type="button"
            class="vd-btn vd-btn-ghost vd-btn-icon"
            aria-label="Close"
            @click="close"
          >
            <VdIcon name="x" />
          </button>
        </header>
        <div class="vd-modal-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="vd-modal-footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
