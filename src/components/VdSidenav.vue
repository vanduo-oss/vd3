<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import VdTransition, { type TransitionPreset } from "./VdTransition.vue";

interface Props {
  modelValue: boolean;
  placement?: "left" | "right" | "top" | "bottom";
  title?: string;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  /** Whether slide animation is enabled (default true). */
  animated?: boolean;
  /** Custom duration in ms override. */
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  placement: "left",
  title: "",
  closeOnBackdrop: true,
  closeOnEsc: true,
  animated: true,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
}>();

const slidePreset = computed<TransitionPreset>(() => {
  switch (props.placement) {
    case "left":
      return "slide-left";
    case "top":
      return "slide-down";
    case "bottom":
      return "slide-up";
    case "right":
    default:
      return "slide-right";
  }
});

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

// Track whether THIS instance locked body scroll so unmounting a closed
// drawer never releases a lock held by another open drawer/offcanvas.
let bodyLocked = false;

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("keydown", onKeydown);
  if (props.modelValue && typeof document !== "undefined") {
    document.body.style.overflow = "hidden";
    bodyLocked = true;
  }
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", onKeydown);
  }
  if (bodyLocked && typeof document !== "undefined") {
    document.body.style.overflow = "";
    bodyLocked = false;
  }
});

watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    bodyLocked = open;
  },
);
</script>

<template>
  <Teleport to="body">
    <VdTransition name="fade" :animated="animated" :duration="duration">
      <div
        v-if="modelValue"
        class="vd-sidenav-overlay is-visible"
        @click="onBackdrop"
      />
    </VdTransition>
    <VdTransition :name="slidePreset" :animated="animated" :duration="duration">
      <aside
        v-if="modelValue"
        class="vd-sidenav"
        :class="[`vd-sidenav-${placement}`, 'is-open']"
        :aria-label="title || 'Side navigation'"
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
        <footer v-if="$slots.footer" class="vd-sidenav-footer">
          <slot name="footer" />
        </footer>
      </aside>
    </VdTransition>
  </Teleport>
</template>
