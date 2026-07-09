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
  as?: keyof HTMLElementTagNameMap;
  /** Fibonacci padding step (maps to `data-pad`). */
  pad?: Space;
}

withDefaults(defineProps<Props>(), { as: "div", pad: "fib-8" });
</script>

<template>
  <component :is="as" class="vd-box" :data-pad="pad">
    <slot />
  </component>
</template>
