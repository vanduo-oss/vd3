<script setup lang="ts">
import { ref } from "vue";
import { VdButton, VdTooltip } from "@vanduo-oss/vd3";
import "@vanduo-oss/vd3/css";
const count = ref(0);
</script>
<template>
  <VdTooltip text="Add one item" position="bottom">
    <VdButton @click="count++">Add item</VdButton>
  </VdTooltip>
  <p aria-live="polite">Items: {{ count }}</p>
</template>
