<script setup lang="ts">
import VdIcon from "./VdIcon.vue";

type Size = "sm" | "md" | "lg";

interface Props {
  size?: Size;
  label?: string;
}

withDefaults(defineProps<Props>(), {
  size: "md",
  label: "",
});
</script>

<template>
  <span
    :class="['vd-spinner', `vd-spinner-${size}`]"
    role="status"
    :aria-label="label || 'Loading'"
  >
    <VdIcon name="circle-notch" />
  </span>
</template>
