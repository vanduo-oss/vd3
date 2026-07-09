<script setup lang="ts">
type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type Variant =
  "primary" | "secondary" | "success" | "warning" | "error" | "info";
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

withDefaults(defineProps<Props>(), {
  src: "",
  alt: "",
  initials: "",
  size: "md",
  variant: "primary",
  shape: "circle",
  status: undefined,
});
</script>

<template>
  <div
    class="vd-avatar"
    :class="[`vd-avatar-${size}`, `vd-avatar-${variant}`, `vd-avatar-${shape}`]"
    :aria-label="alt || initials || 'Avatar'"
  >
    <img v-if="src" :src="src" :alt="alt" class="vd-avatar-img" />
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
