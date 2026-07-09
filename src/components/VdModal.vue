<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import VdIcon from "./VdIcon.vue";

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

watch(
  () => props.open,
  async (open) => {
    if (typeof window === "undefined") return;
    if (open) {
      window.addEventListener("keydown", onKeydown);
      await nextTick();
      panel.value?.focus();
    } else {
      window.removeEventListener("keydown", onKeydown);
    }
  },
  { immediate: true },
);
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
