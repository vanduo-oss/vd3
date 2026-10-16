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
type Bg = "primary" | "secondary" | "tertiary" | "dark" | "darker";
type Round = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";

interface Props {
  as?: keyof HTMLElementTagNameMap;
  /** Fibonacci padding step (maps to `data-pad`). */
  pad?: Space;
  /** Background surface (maps to `data-bg`). */
  bg?: Bg;
  /** Border radius step (maps to `data-round`). */
  round?: Round;
  /** Show a 1px border (maps to `data-border`). */
  border?: boolean;
}

withDefaults(defineProps<Props>(), {
  as: "div",
  pad: "fib-8",
  bg: undefined,
  round: undefined,
  border: false,
});
</script>

<template>
  <component
    :is="as"
    class="vd-box"
    :data-pad="pad"
    :data-bg="bg"
    :data-round="round"
    :data-border="border || undefined"
  >
    <slot />
  </component>
</template>
