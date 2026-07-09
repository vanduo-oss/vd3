<script setup lang="ts">
import { ref } from "vue";
import VdIcon from "./VdIcon.vue";

interface Props {
  code: string;
  language?: string;
  copyable?: boolean;
}

withDefaults(defineProps<Props>(), {
  language: "html",
  copyable: true,
});

const copied = ref(false);

const onCopy = async (code: string): Promise<void> => {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(code);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    /* clipboard may be blocked */
  }
};
</script>

<template>
  <figure class="vd-code-snippet">
    <pre
      :class="['vd-code-snippet-pre', `language-${language}`]"
      :data-language="language"
    ><code>{{ code }}</code></pre>
    <button
      v-if="copyable"
      type="button"
      class="vd-btn vd-btn-ghost vd-btn-sm vd-code-snippet-copy"
      :aria-label="copied ? 'Copied' : 'Copy code'"
      @click="onCopy(code)"
    >
      <VdIcon :name="copied ? 'check' : 'copy'" />
      <span>{{ copied ? "Copied" : "Copy" }}</span>
    </button>
  </figure>
</template>
