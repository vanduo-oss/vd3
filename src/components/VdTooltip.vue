<script setup lang="ts">
import { ref } from "vue";
import { useTooltips } from "../composables/useTooltips";
type Position = "top" | "bottom" | "left" | "right";

interface Props {
  text: string;
  position?: Position;
}

withDefaults(defineProps<Props>(), {
  position: "top",
});
const root = ref<HTMLElement | null>(null);
useTooltips(root);
</script>

<template>
  <span ref="root" :data-tooltip-placement="position" :data-tooltip="text">
    <slot />
  </span>
</template>
