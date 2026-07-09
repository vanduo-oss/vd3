<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from "vue";

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
  if (typeof window === "undefined") return;
  window.removeEventListener("keydown", onKeydown);
});

watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
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
      class="vd-offcanvas"
      :class="[`vd-offcanvas-${placement}`, 'is-open']"
      :aria-label="title || 'Off-canvas panel'"
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
