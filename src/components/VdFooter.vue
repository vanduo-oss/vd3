<script setup lang="ts">
import { computed } from "vue";

interface Props {
  columns?: 2 | 3 | 4;
  dark?: boolean;
  size?: "sm" | "lg";
}

const props = withDefaults(defineProps<Props>(), {
  columns: undefined,
  dark: false,
  size: undefined,
});

const rootClasses = computed(() => [
  "vd-footer",
  props.columns ? `vd-footer-${props.columns}col` : null,
  props.dark ? "vd-footer-dark" : null,
  props.size ? `vd-footer-${props.size}` : null,
]);
</script>

<template>
  <footer :class="rootClasses">
    <div class="vd-footer-container">
      <slot />
      <div v-if="$slots.copyright" class="vd-footer-copyright">
        <slot name="copyright" />
      </div>
    </div>
  </footer>
</template>
