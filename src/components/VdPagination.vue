<script setup lang="ts">
import { computed, ref } from "vue";

/**
 * Reactive reimplementation of framework/js/components/pagination.js. Reproduces
 * the framework's DOM contract — `.vd-pagination` list of
 * `.vd-pagination-item` (`<a class="vd-pagination-link">`), `.active` /
 * `.disabled` states, prev/next, and ellipses via the framework's exact
 * `calculatePages` algorithm — with a clean `v-model` API. Dispatches a native
 * `pagination:change` ({ page, totalPages }) alongside `update:modelValue`.
 */
type Size = "sm" | "md" | "lg";

interface Props {
  modelValue: number;
  total: number;
  maxVisible?: number;
  size?: Size;
  align?: "left" | "center" | "right";
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 7,
  size: "md",
  align: "left",
  disabled: false,
});

const emit = defineEmits<{ "update:modelValue": [value: number] }>();

const root = ref<HTMLElement | null>(null);

const calculatePages = (
  currentPage: number,
  totalPages: number,
  maxVisible: number,
): (number | "ellipsis")[] => {
  const pages: (number | "ellipsis")[] = [];
  const half = Math.floor(maxVisible / 2);

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  let start = Math.max(2, currentPage - half);
  let end = Math.min(totalPages - 1, currentPage + half);
  if (currentPage <= half + 1) end = Math.min(totalPages - 1, maxVisible - 1);
  if (currentPage >= totalPages - half)
    start = Math.max(2, totalPages - maxVisible + 2);

  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("ellipsis");
  if (totalPages > 1) pages.push(totalPages);
  return pages;
};

const pages = computed(() =>
  calculatePages(props.modelValue, props.total, props.maxVisible),
);

const go = (page: number): void => {
  if (props.disabled) return;
  if (page < 1 || page > props.total || page === props.modelValue) return;
  emit("update:modelValue", page);
  root.value?.dispatchEvent(
    new CustomEvent("pagination:change", {
      bubbles: true,
      detail: { page, totalPages: props.total },
    }),
  );
};
</script>

<template>
  <nav ref="root" aria-label="Pagination">
    <ul
      class="vd-pagination"
      :class="[`vd-pagination-${size}`, `vd-pagination-${align}`]"
    >
      <li
        class="vd-pagination-item vd-pagination-prev"
        :class="{ disabled: disabled || modelValue <= 1 }"
      >
        <a
          class="vd-pagination-link"
          href="#"
          aria-label="Previous"
          @click.prevent="go(modelValue - 1)"
          >Previous</a
        >
      </li>

      <template v-for="(item, idx) in pages" :key="idx">
        <li v-if="item === 'ellipsis'" class="vd-pagination-item">
          <span class="vd-pagination-ellipsis" aria-hidden="true">…</span>
        </li>
        <li
          v-else
          class="vd-pagination-item"
          :class="{ active: item === modelValue }"
          :data-page="item"
        >
          <a
            class="vd-pagination-link"
            href="#"
            :aria-label="`Page ${item}`"
            :aria-current="item === modelValue ? 'page' : undefined"
            @click.prevent="go(item)"
            >{{ item }}</a
          >
        </li>
      </template>

      <li
        class="vd-pagination-item vd-pagination-next"
        :class="{ disabled: disabled || modelValue >= total }"
      >
        <a
          class="vd-pagination-link"
          href="#"
          aria-label="Next"
          @click.prevent="go(modelValue + 1)"
          >Next</a
        >
      </li>
    </ul>
  </nav>
</template>
