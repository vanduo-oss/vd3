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
  /** Fibonacci gap between stacked children (maps to `data-gap`). */
  gap?: Space;
  as?: "div" | "section" | "ul" | "ol";
}

withDefaults(defineProps<Props>(), { gap: "fib-8", as: "div" });
</script>

<template>
  <component :is="as" class="vd-stack" :data-gap="gap">
    <slot />
  </component>
</template>
