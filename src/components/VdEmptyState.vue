<script setup lang="ts">
import VdIcon from "./VdIcon.vue";

interface Props {
  icon?: string;
  title?: string;
  description?: string;
}

withDefaults(defineProps<Props>(), {
  icon: "",
  title: "",
  description: "",
});
</script>

<template>
  <div class="vd-empty">
    <VdIcon v-if="icon" :name="icon" size="lg" class="vd-empty-icon" />
    <p v-if="title" class="vd-empty-title">{{ title }}</p>
    <p v-if="description" class="vd-empty-description">{{ description }}</p>
    <div v-if="$slots.action" class="vd-empty-action">
      <slot name="action" />
    </div>
  </div>
</template>
