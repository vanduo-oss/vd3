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
import VdTransition from "./VdTransition.vue";
import { useFocusTrap } from "../composables/useFocusTrap";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface Props {
  open: boolean;
  title?: string;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  /** Frosted glass panel + backdrop (`.vd-modal-glass` / `.vd-modal-glass-backdrop`). */
  glass?: boolean;
  /** Enforce landscape Golden Ratio (1.618:1) minimum proportion by default (default true). */
  golden?: boolean;
  /** Keep panel height stable when switching tabs so the modal does not jump (default true). */
  stableHeight?: boolean;
  /** Whether animation is enabled (default true). */
  animated?: boolean;
  /** Custom duration in ms override. */
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  size: "md",
  closeOnBackdrop: true,
  glass: false,
  golden: true,
  stableHeight: true,
  animated: true,
});

// Teleport is not a DOM node — fallthrough attrs must be bound on the dialog root.
defineOptions({ inheritAttrs: false });

const emit = defineEmits<{
  "update:open": [value: boolean];
  close: [];
}>();

const panel = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(panel);

// The element focused before the dialog opened, restored on close.
let previouslyFocused: HTMLElement | null = null;

const restoreFocus = (): void => {
  previouslyFocused?.focus();
  previouslyFocused = null;
};

// Track the largest observed panel height while open so dynamic tab content
// (`v-if` / `VdTabs`) never causes the dialog to shrink and jump.
let resizeObserver: ResizeObserver | null = null;
let maxPanelHeight = 0;

const clearStableHeight = (): void => {
  maxPanelHeight = 0;
  panel.value?.style.removeProperty("--vd-modal-stable-min-height");
};

const syncStableHeight = (): void => {
  if (!props.open || !props.stableHeight || !panel.value) return;
  const height = panel.value.offsetHeight;
  if (height > maxPanelHeight) {
    maxPanelHeight = height;
    panel.value.style.setProperty(
      "--vd-modal-stable-min-height",
      `${maxPanelHeight}px`,
    );
  }
};

const onWindowResize = (): void => {
  clearStableHeight();
  syncStableHeight();
};

const stopStableObserver = (clearStyle = true): void => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", onWindowResize);
  }
  if (clearStyle) {
    clearStableHeight();
  }
};

const startStableObserver = (): void => {
  stopStableObserver(true);
  if (!props.open || !props.stableHeight || !panel.value) return;
  syncStableHeight();
  if (typeof window !== "undefined") {
    window.addEventListener("resize", onWindowResize);
  }
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(syncStableHeight);
    resizeObserver.observe(panel.value);
  }
};

const onAfterLeave = (): void => {
  clearStableHeight();
  restoreFocus();
};

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

const cleanup = (): void => {
  removeKeydown();
  stopStableObserver(true);
};

watch(
  () => props.open,
  async (open) => {
    if (typeof window === "undefined") return;
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      window.addEventListener("keydown", onKeydown);
      await nextTick();
      if (!props.open) return;
      activate();
      if (panel.value && !panel.value.contains(document.activeElement)) {
        panel.value.focus();
      }
      startStableObserver();
    } else {
      removeKeydown();
      deactivate();
      stopStableObserver(false);
      restoreFocus();
    }
  },
  { immediate: true },
);

watch(
  () => props.stableHeight,
  async (stable) => {
    if (typeof window === "undefined") return;
    if (!stable) {
      stopStableObserver(true);
    } else if (props.open) {
      await nextTick();
      if (props.open && props.stableHeight) {
        startStableObserver();
      }
    }
  },
);

watch(
  () => props.size,
  async () => {
    if (typeof window === "undefined") return;
    if (props.open && props.stableHeight) {
      clearStableHeight();
      await nextTick();
      syncStableHeight();
    }
  },
);

onBeforeUnmount(cleanup);
onScopeDispose(cleanup);
</script>

<template>
  <Teleport to="body">
    <VdTransition
      name="fade"
      :animated="animated"
      :duration="duration"
      @after-leave="onAfterLeave"
    >
      <div
        v-if="open"
        class="vd-modal vd-modal-open"
        :class="{
          'vd-modal-glass': glass,
          'vd-modal-auto-height': !golden,
          'vd-modal-dynamic-height': !stableHeight,
        }"
        v-bind="$attrs"
        role="dialog"
        aria-modal="true"
        :aria-label="title || 'Dialog'"
        data-vd-modal
      >
        <div
          class="vd-modal-backdrop"
          :class="{ 'vd-modal-glass-backdrop': glass }"
          @click="onBackdrop"
        />
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
    </VdTransition>
  </Teleport>
</template>
