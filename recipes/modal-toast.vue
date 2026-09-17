<script setup lang="ts">
import { ref } from "vue";
import { VdButton, VdModal, VdToastContainer, useToast } from "@vanduo-oss/vd3";
import "@vanduo-oss/vd3/css";
const open = ref(false);
const toast = useToast();
function save() {
  open.value = false;
  toast.success("Saved");
}
</script>
<template>
  <VdButton @click="open = true">Edit note</VdButton>
  <VdModal v-model:open="open" title="Edit note">
    <p>Save your changes?</p>
    <VdButton @click="save">Save</VdButton>
  </VdModal>
  <VdToastContainer />
</template>
