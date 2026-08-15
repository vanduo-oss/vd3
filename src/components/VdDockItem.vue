<script setup lang="ts">
import VdIcon from "./VdIcon.vue";

interface Props {
  icon?: string;
  label: string;
  active?: boolean;
}

withDefaults(defineProps<Props>(), {
  icon: "",
  active: false,
});
</script>

<template>
  <button
    type="button"
    class="vd-dock-item"
    :class="{ 'is-active': active }"
    :aria-current="active ? 'page' : undefined"
    :aria-label="label"
  >
    <VdIcon v-if="icon" :name="icon" size="sm" />
    <span class="vd-dock-label">{{ label }}</span>
  </button>
</template>
