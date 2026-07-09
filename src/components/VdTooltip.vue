<script setup lang="ts">
type Position = "top" | "bottom" | "left" | "right";

interface Props {
  text: string;
  position?: Position;
}

withDefaults(defineProps<Props>(), {
  position: "top",
});
</script>

<template>
  <span
    class="vd-tooltip"
    :data-tooltip-position="position"
    :data-tooltip="text"
  >
    <slot />
  </span>
</template>
