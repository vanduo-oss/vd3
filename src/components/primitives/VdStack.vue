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
type Align = "start" | "center" | "end" | "stretch";

interface Props {
  /** Fibonacci gap between stacked children (maps to `data-gap`). */
  gap?: Space;
  as?: keyof HTMLElementTagNameMap;
  /** Cross-axis alignment (maps to `data-align`). */
  align?: Align;
}

withDefaults(defineProps<Props>(), {
  gap: "fib-8",
  as: "div",
  align: undefined,
});
</script>

<template>
  <component :is="as" class="vd-stack" :data-gap="gap" :data-align="align">
    <slot />
  </component>
</template>
