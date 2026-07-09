<script setup lang="ts">
import VdIcon from "./VdIcon.vue";
import type { StatusVariant } from "../types";

type Variant = StatusVariant;

interface Props {
  variant?: Variant;
  dismissible?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "info",
  dismissible: false,
  title: "",
});

const emit = defineEmits<{ dismiss: [] }>();

const onDismiss = (): void => {
  emit("dismiss");
};

const iconName = (): string => {
  switch (props.variant) {
    case "success":
      return "check-circle";
    case "warning":
      return "warning";
    case "danger":
      return "x-circle";
    default:
      return "info";
  }
};
</script>

<template>
  <div :class="['vd-alert', `vd-alert-${variant}`]" role="alert">
    <VdIcon :name="iconName()" class="vd-alert-icon" />
    <div class="vd-alert-body">
      <p v-if="title" class="vd-alert-title">
        {{ title }}
      </p>
      <div class="vd-alert-content">
        <slot />
      </div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="vd-alert-dismiss"
      aria-label="Dismiss"
      @click="onDismiss"
    >
      <VdIcon name="x" />
    </button>
  </div>
</template>
