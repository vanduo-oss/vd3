<script setup lang="ts">
import { computed, ref, useId } from "vue";
import {
  useDocSearch,
  type DocSearchDoc,
  type DocSearchResult,
} from "../composables/useDocSearch";
import { useClickOutside } from "../composables/useClickOutside";

/**
 * A thin combobox/listbox shell over `useDocSearch`, rendering the
 * `.vd-doc-search` markup contract from `doc-search.js`. All ranking, debounce,
 * keyboard navigation, and the Cmd/Ctrl+K shortcut come from the composable;
 * this component only maps its reactive state onto the CSS classes and ARIA
 * attributes and forwards its hooks as emits.
 */
interface Props {
  /** Searchable documents (see `DocSearchDoc`). */
  data: DocSearchDoc[];
  /** Queries shorter than this never search. Donor default `2`. */
  minQueryLength?: number;
  /** Maximum results shown. Donor default `10`. */
  maxResults?: number;
  /** Debounce applied to typing, in ms. Donor default `150`. */
  debounceMs?: number;
  /** Wrapper tag for highlighted matches (safe whitelist). Donor default `mark`. */
  highlightTag?: string;
  /** Enable the Cmd/Ctrl+K shortcut and its badge. Donor default `true`. */
  keyboardShortcut?: boolean;
  /** Input placeholder. */
  placeholder?: string;
  /** Empty-state heading. */
  emptyTitle?: string;
  /** Empty-state body. */
  emptyText?: string;
  /** Listbox accessible name. */
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  minQueryLength: 2,
  maxResults: 10,
  debounceMs: 150,
  highlightTag: "mark",
  keyboardShortcut: true,
  placeholder: "Search...",
  emptyTitle: "No results found",
  emptyText: "Try different keywords or check spelling",
  ariaLabel: "Search results",
});

const emit = defineEmits<{
  /** Emitted when a result is chosen (click or Enter). */
  select: [result: DocSearchResult];
  /** Emitted after a settled search with the query and its results. */
  search: [query: string, results: DocSearchResult[]];
  /** Emitted when the results panel opens. */
  open: [];
  /** Emitted when the results panel closes. */
  close: [];
}>();

const containerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const {
  query,
  results,
  isOpen,
  activeIndex,
  handleKeydown,
  search,
  select,
  open,
  close,
} = useDocSearch(() => props.data, {
  minQueryLength: props.minQueryLength,
  maxResults: props.maxResults,
  debounceMs: props.debounceMs,
  highlightTag: props.highlightTag,
  keyboardShortcut: props.keyboardShortcut,
  input: inputRef,
  onSelect: (result) => emit("select", result),
  onSearch: (q, r) => emit("search", q, r),
  onOpen: () => emit("open"),
  onClose: () => emit("close"),
});

const uid = useId();
const resultsId = `${uid}-results`;
const optionId = (index: number): string => `${uid}-result-${index}`;
const activeDescendant = computed(() =>
  isOpen.value && activeIndex.value >= 0
    ? optionId(activeIndex.value)
    : undefined,
);

// Close the panel when a pointerdown lands outside the component.
useClickOutside([containerRef], () => close(), isOpen);

const onFocus = (): void => {
  if (query.value.trim().length >= props.minQueryLength) {
    search();
    open();
  }
};

// Click selection uses the same composable path as Enter.
const onResultClick = (index: number): void => {
  select(index);
};
</script>

<template>
  <div ref="containerRef" class="vd-doc-search">
    <div class="vd-doc-search-input-wrapper">
      <i
        class="vd-doc-search-icon ph ph-magnifying-glass"
        aria-hidden="true"
      ></i>
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        class="vd-doc-search-input"
        role="combobox"
        aria-autocomplete="list"
        :aria-controls="resultsId"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-activedescendant="activeDescendant"
        :placeholder="placeholder"
        @keydown="handleKeydown"
        @focus="onFocus"
      />
      <span
        v-if="keyboardShortcut"
        class="vd-doc-search-shortcut"
        aria-hidden="true"
      >
        <kbd>⌘</kbd><kbd>K</kbd>
      </span>
    </div>

    <div
      :id="resultsId"
      class="vd-doc-search-results"
      :class="{ 'is-open': isOpen }"
      role="listbox"
      :aria-label="ariaLabel"
    >
      <template v-if="isOpen">
        <ul v-if="results.length" class="vd-doc-search-results-list">
          <li
            v-for="(result, index) in results"
            :id="optionId(index)"
            :key="result.id"
            class="vd-doc-search-result"
            :class="{ 'is-active': index === activeIndex }"
            role="option"
            :data-index="index"
            :data-category="result.categorySlug"
            :aria-selected="index === activeIndex ? 'true' : 'false'"
            @click="onResultClick(index)"
            @mousemove="activeIndex = index"
          >
            <div class="vd-doc-search-result-icon">
              <i class="ph" :class="result.icon" aria-hidden="true"></i>
            </div>
            <div class="vd-doc-search-result-content">
              <!-- titleHtml/excerptHtml are HTML-escaped by useDocSearch;
                   only the safe highlight tag is injected. -->
              <div
                class="vd-doc-search-result-title"
                v-html="result.titleHtml"
              />
              <div class="vd-doc-search-result-category">
                {{ result.category }}
              </div>
              <div
                class="vd-doc-search-result-excerpt"
                v-html="result.excerptHtml"
              />
            </div>
          </li>
        </ul>

        <div v-else class="vd-doc-search-empty">
          <div class="vd-doc-search-empty-icon">
            <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
          </div>
          <div class="vd-doc-search-empty-title">{{ emptyTitle }}</div>
          <div class="vd-doc-search-empty-text">{{ emptyText }}</div>
        </div>

        <div v-if="results.length" class="vd-doc-search-footer">
          <span class="vd-doc-search-footer-item">
            <kbd>↑</kbd><kbd>↓</kbd> to navigate
          </span>
          <span class="vd-doc-search-footer-item">
            <kbd>↵</kbd> to select
          </span>
          <span class="vd-doc-search-footer-item">
            <kbd>esc</kbd> to close
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
