<script setup lang="ts">
import { ref, watch } from "vue";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type Variant =
  "primary" | "secondary" | "success" | "warning" | "error" | "danger" | "info";
type Shape = "circle" | "rounded" | "square";

interface Props {
  src?: string;
  alt?: string;
  initials?: string;
  size?: Size;
  variant?: Variant;
  shape?: Shape;
  status?: "online" | "offline" | "away" | "busy";
}

const props = withDefaults(defineProps<Props>(), {
  src: "",
  alt: "",
  initials: "",
  size: "md",
  variant: "primary",
  shape: "circle",
  status: undefined,
});

const imgError = ref(false);

watch(
  () => props.src,
  () => {
    imgError.value = false;
  },
);

const showImg = (): boolean => !!props.src && !imgError.value;
</script>

<template>
  <div
    class="vd-avatar"
    :class="[`vd-avatar-${size}`, `vd-avatar-${variant}`, `vd-avatar-${shape}`]"
    :aria-label="alt || initials || 'Avatar'"
    :role="showImg() ? undefined : 'img'"
  >
    <img
      v-if="showImg()"
      :src="src"
      :alt="alt"
      class="vd-avatar-img"
      @error="imgError = true"
    />
    <span v-else-if="initials" class="vd-avatar-initials">
      {{ initials }}
    </span>
    <span v-else class="vd-avatar-initials" aria-hidden="true"> ? </span>
    <span
      v-if="status"
      class="vd-avatar-status"
      :class="`vd-avatar-status-${status}`"
      :aria-label="`Status: ${status}`"
    />
  </div>
</template>
