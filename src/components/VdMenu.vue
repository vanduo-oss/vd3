<script setup lang="ts">
import { ref } from "vue";
import { useDropdown } from "../composables/useDropdown";

interface MenuItem {
  label: string;
  /** Value emitted on `select` (defaults to `label`). */
  value?: string;
  href?: string;
  disabled?: boolean;
  /** Render a divider instead of an item. */
  divider?: boolean;
}

interface Props {
  label: string;
  items: readonly MenuItem[];
  align?: "start" | "end";
}

const props = withDefaults(defineProps<Props>(), {
  align: "start",
});

const emit = defineEmits<{ select: [value: string] }>();

// Reuses the framework's dropdown runtime (toggle/keyboard/outside-click).
const root = ref<HTMLElement | null>(null);
useDropdown(root);

const onSelect = (item: MenuItem, event: Event): void => {
  if (item.disabled || item.divider) return;
  if (!item.href) event.preventDefault();
  emit("select", item.value ?? item.label);
};
</script>

<template>
  <div ref="root" class="vd-dropdown">
    <button
      type="button"
      class="vd-btn vd-btn-secondary vd-dropdown-toggle"
      aria-haspopup="menu"
    >
      {{ label }}
    </button>
    <div
      class="vd-dropdown-menu"
      :class="align === 'end' ? 'vd-dropdown-menu-end' : null"
      role="menu"
    >
      <template v-for="(item, i) in items" :key="i">
        <div v-if="item.divider" class="vd-dropdown-divider" role="separator" />
        <a
          v-else
          class="vd-dropdown-item"
          :class="{ 'is-disabled': item.disabled }"
          :href="item.href || undefined"
          :aria-disabled="item.disabled || undefined"
          role="menuitem"
          @click="onSelect(item, $event)"
        >
          {{ item.label }}
        </a>
      </template>
    </div>
  </div>
</template>
