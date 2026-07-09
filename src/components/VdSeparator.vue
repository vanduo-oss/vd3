<script setup lang="ts">
interface Props {
  /** Render a vertical divider (for use inside a flex row). */
  vertical?: boolean;
  /** Optional centered label (horizontal only). */
  label?: string;
}

withDefaults(defineProps<Props>(), {
  vertical: false,
  label: "",
});
</script>

<template>
  <div
    v-if="label && !vertical"
    class="vd-separator vd-separator-labeled"
    role="separator"
    aria-orientation="horizontal"
  >
    <span class="vd-separator-label">{{ label }}</span>
  </div>
  <hr
    v-else
    class="vd-separator"
    :class="vertical ? 'vd-separator-vertical' : null"
    :aria-orientation="vertical ? 'vertical' : 'horizontal'"
  />
</template>
