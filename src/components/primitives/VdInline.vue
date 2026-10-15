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
type Align = "start" | "center" | "end" | "baseline" | "stretch";
type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

interface Props {
  /** Fibonacci gap between wrapped inline items (maps to `data-gap`). */
  gap?: Space;
  as?: keyof HTMLElementTagNameMap;
  /** Cross-axis alignment (maps to `data-align`). */
  align?: Align;
  /** Main-axis distribution (maps to `data-justify`). */
  justify?: Justify;
  /** Disable wrapping (maps to `data-wrap="nowrap"`). */
  wrap?: "nowrap";
}

withDefaults(defineProps<Props>(), {
  gap: "fib-5",
  as: "div",
  align: undefined,
  justify: undefined,
  wrap: undefined,
});
</script>

<template>
  <component
    :is="as"
    class="vd-inline"
    :data-gap="gap"
    :data-align="align"
    :data-justify="justify"
    :data-wrap="wrap"
  >
    <slot />
  </component>
</template>
