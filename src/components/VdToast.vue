<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { ToastEntry, ToastType } from "../composables/useToast";

const props = defineProps<{ toast: ToastEntry }>();
const emit = defineEmits<{ dismiss: [id: string] }>();

/** Default type icons, copied verbatim from `Toast.getDefaultIcon()`. */
const ICONS: Record<ToastType, string> = {
  success:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  error:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  warning:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
};

const visible = ref(false);
const exiting = ref(false);
const progressPaused = ref(false);

let timeoutId: number | null = null;
let fallbackId: number | null = null;
let startTime = 0;
let remaining = props.toast.duration;

const clearTimer = (): void => {
  if (timeoutId != null) {
    window.clearTimeout(timeoutId);
    timeoutId = null;
  }
};

const startTimer = (): void => {
  progressPaused.value = false;
  if (props.toast.duration > 0 && typeof window !== "undefined") {
    startTime = Date.now();
    timeoutId = window.setTimeout(beginDismiss, remaining);
  }
};

const pauseTimer = (): void => {
  if (timeoutId != null) {
    window.clearTimeout(timeoutId);
    timeoutId = null;
    remaining -= Date.now() - startTime;
    progressPaused.value = true;
  }
};

const beginDismiss = (): void => {
  if (exiting.value) return;
  clearTimer();
  visible.value = false;
  exiting.value = true;
  // Fallback removal if the transition never fires (matches framework).
  fallbackId = window.setTimeout(() => emit("dismiss", props.toast.id), 400);
};

const onTransitionEnd = (): void => {
  if (exiting.value) emit("dismiss", props.toast.id);
};

onMounted(() => {
  // Enter on the next frame so the `.is-visible` transition runs.
  requestAnimationFrame(() => {
    visible.value = true;
    startTimer();
  });
});

onBeforeUnmount(() => {
  clearTimer();
  if (fallbackId != null) window.clearTimeout(fallbackId);
});
</script>

<template>
  <div
    :class="[
      'vd-toast',
      toast.type ? `vd-toast-${toast.type}` : null,
      toast.solid ? 'vd-toast-solid' : null,
      toast.showProgress && toast.duration > 0
        ? 'vd-toast-with-progress'
        : null,
      { 'is-visible': visible, 'is-exiting': exiting },
    ]"
    role="status"
    aria-live="polite"
    @mouseenter="pauseTimer"
    @mouseleave="startTimer"
    @transitionend="onTransitionEnd"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span v-if="toast.type" class="vd-toast-icon" v-html="ICONS[toast.type]" />
    <div class="vd-toast-content">
      <div v-if="toast.title" class="vd-toast-title">{{ toast.title }}</div>
      <div class="vd-toast-message">{{ toast.message }}</div>
    </div>
    <button
      v-if="toast.dismissible"
      type="button"
      class="vd-toast-close"
      aria-label="Close"
      @click="beginDismiss"
    />
    <div
      v-if="toast.showProgress && toast.duration > 0"
      class="vd-toast-progress"
      :style="{
        animationDuration: `${toast.duration}ms`,
        animationPlayState: progressPaused ? 'paused' : 'running',
      }"
    />
  </div>
</template>
