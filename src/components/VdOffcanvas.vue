<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useFocusTrap } from "../composables/useFocusTrap";

interface Props {
  modelValue: boolean;
  placement?: "left" | "right" | "top" | "bottom";
  title?: string;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placement: "right",
  title: "",
  closeOnBackdrop: true,
  closeOnEsc: true,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
}>();

const panel = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(panel);

// The element focused before the panel opened, restored on close.
let previouslyFocused: HTMLElement | null = null;

const close = (): void => {
  emit("update:modelValue", false);
  emit("close");
};

const onBackdrop = (): void => {
  if (props.closeOnBackdrop) close();
};

const onKeydown = (event: KeyboardEvent): void => {
  if (!props.modelValue) return;
  if (event.key === "Escape" && props.closeOnEsc) {
    event.preventDefault();
    close();
  }
};

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", onKeydown);
  }
  // Release the body scroll lock — a panel unmounted while open must not
  // leave the page permanently unscrollable.
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
});

watch(
  () => props.modelValue,
  async (open) => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = open ? "hidden" : "";
    }
    if (typeof window === "undefined") return;
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      await nextTick();
      activate();
      if (panel.value && !panel.value.contains(document.activeElement)) {
        panel.value.focus();
      }
    } else {
      deactivate();
      previouslyFocused?.focus();
      previouslyFocused = null;
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="vd-sidenav-overlay is-visible"
      @click="onBackdrop"
    />
    <aside
      v-if="modelValue"
      ref="panel"
      class="vd-offcanvas"
      :class="[`vd-offcanvas-${placement}`, 'is-open']"
      role="dialog"
      aria-modal="true"
      :aria-label="title || 'Off-canvas panel'"
      tabindex="-1"
    >
      <header v-if="title || $slots.header" class="vd-sidenav-header">
        <h3 v-if="title" class="vd-sidenav-title">
          {{ title }}
        </h3>
        <slot name="header" />
        <button
          type="button"
          class="vd-sidenav-close"
          aria-label="Close"
          @click="close"
        >
          &times;
        </button>
      </header>
      <div class="vd-sidenav-body">
        <slot />
      </div>
    </aside>
  </Teleport>
</template>
