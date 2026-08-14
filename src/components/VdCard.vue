<script setup lang="ts">
interface Props {
  elevated?: boolean;
  interactive?: boolean;
  /** Frosted glass panel (`.vd-card-glass`). */
  glass?: boolean;
}

withDefaults(defineProps<Props>(), {
  elevated: false,
  interactive: false,
  glass: false,
});
</script>

<template>
  <section
    class="vd-card"
    :class="[
      elevated ? 'vd-card-elevated' : null,
      interactive ? 'vd-card-interactive' : null,
      glass ? 'vd-card-glass' : null,
    ]"
  >
    <header v-if="$slots.header" class="vd-card-header">
      <slot name="header" />
    </header>
    <div class="vd-card-body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="vd-card-footer">
      <slot name="footer" />
    </footer>
  </section>
</template>
