<script setup lang="ts">
type Space =
  | "0"
  | "fib-1"
  | "fib-2"
  | "fib-3"
  | "fib-5"
  | "fib-8"
  | "fib-13"
  | "fib-21"
  | "fib-34"
  | "fib-55";

interface Props {
  /** Fibonacci gap between wrapped inline items (maps to `data-gap`). */
  gap?: Space;
}

withDefaults(defineProps<Props>(), { gap: "fib-5" });
</script>

<template>
  <div class="vd-inline" :data-gap="gap">
    <slot />
  </div>
</template>
