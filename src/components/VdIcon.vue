<script setup lang="ts">
interface Props {
  name: string;
  filled?: boolean;
  size?: "sm" | "md" | "lg";
}

const props = withDefaults(defineProps<Props>(), {
  filled: false,
  size: "md",
});

const sizeClass = (): string => {
  switch (props.size) {
    case "sm":
      return "vd-text-base";
    case "lg":
      return "vd-text-2xl";
    default:
      return "vd-text-xl";
  }
};
</script>

<template>
  <i
    :class="[props.filled ? 'ph-fill' : 'ph', `ph-${props.name}`, sizeClass()]"
    aria-hidden="true"
  />
</template>
