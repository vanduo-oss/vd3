<script setup lang="ts">
import { computed } from "vue";
import { useToastStore, type ToastPosition } from "../composables/useToast";
import VdToast from "./VdToast.vue";

const store = useToastStore();

const POSITIONS: ToastPosition[] = [
  "top-right",
  "top-left",
  "top-center",
  "bottom-right",
  "bottom-left",
  "bottom-center",
];

// One `.vd-toast-container` per position that currently has toasts, mirroring
// `Toast.getContainer()` which lazily creates a positioned container per group.
const groups = computed(() =>
  POSITIONS.map((position) => ({
    position,
    toasts: store.queue.filter((t) => t.position === position),
  })).filter((group) => group.toasts.length > 0),
);
</script>

<template>
  <Teleport to="body">
    <div
      v-for="group in groups"
      :key="group.position"
      :class="['vd-toast-container', `vd-toast-container-${group.position}`]"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      <VdToast
        v-for="toast in group.toasts"
        :key="toast.id"
        :toast="toast"
        @dismiss="store.dismiss"
      />
    </div>
  </Teleport>
</template>
