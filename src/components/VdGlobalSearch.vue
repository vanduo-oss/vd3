<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useId,
  watch,
} from "vue";
import {
  useGlobalSearch,
  type GlobalSearchAdapter,
  type GlobalSearchHit,
  type GlobalSearchShortcutOptions,
  type UseGlobalSearchAiOptions,
} from "../composables/useGlobalSearch";
import VdSwitch from "./VdSwitch.vue";

interface Props {
  adapter: GlobalSearchAdapter;
  /**
   * Read once on mount, like the rest of the composable's options. Re-key the
   * component to change them.
   */
  minQueryLength?: number;
  debounceMs?: number;
  shortcut?: GlobalSearchShortcutOptions;
  ai?: UseGlobalSearchAiOptions;
  /**
   * Bind to take control of the AI toggle: the component then renders from
   * this value and reports changes through `update:aiEnabled` instead of
   * flipping its own state. Leave unbound to let `ai` own the initial value.
   */
  aiEnabled?: boolean;
  showAiToggle?: boolean;
  progressMessage?: string;
  placeholder?: string;
  dialogLabel?: string;
  inputLabel?: string;
  resultsLabel?: string;
  emptyTitle?: string;
  emptyText?: string;
  hintText?: string;
  searchingText?: string;
  aiToggleLabel?: string;
  openEventName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  minQueryLength: 2,
  debounceMs: 350,
  shortcut: true,
  aiEnabled: undefined,
  showAiToggle: true,
  progressMessage: "",
  placeholder: "Search everything…",
  dialogLabel: "Search entire site",
  inputLabel: "Search",
  resultsLabel: "Search results",
  emptyTitle: "No results found",
  emptyText: "Try different keywords or check spelling",
  hintText: "Type to search across all documentation, guides, and pages",
  searchingText: "Searching…",
  aiToggleLabel: "AI search",
  openEventName: "vd:open-search",
});

const emit = defineEmits<{
  select: [hit: GlobalSearchHit];
  search: [query: string, hits: GlobalSearchHit[]];
  open: [];
  close: [];
  "update:aiEnabled": [enabled: boolean];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const aiNoticeId = useId();

// Snapshot to match the composable, which reads its options once. Deriving
// `hasQuery` from the live prop instead would let the two disagree.
const minQueryLength = props.minQueryLength;

const controller = useGlobalSearch({
  adapter: props.adapter,
  minQueryLength,
  debounceMs: props.debounceMs,
  shortcut: false,
  ai: props.ai,
  progressMessage: () => props.progressMessage,
  onSelect: (hit) => emit("select", hit),
  onSearch: (q, hits) => emit("search", q, hits),
  onOpen: () => emit("open"),
  onClose: () => emit("close"),
});

const {
  isOpen,
  query,
  activeIndex,
  groups,
  ordered,
  searching,
  aiEnabled: aiOn,
  open,
  close,
  move,
  setAiEnabled,
  select,
  highlight,
  runNow,
} = controller;

const hasQuery = computed(() => query.value.trim().length >= minQueryLength);

/**
 * Controlled when `aiEnabled` is bound: the parent owns the value and the
 * composable follows it, so search runs with whatever the parent last set.
 */
const isAiControlled = computed(() => props.aiEnabled !== undefined);

const syncAiFromProp = (value: boolean | undefined): void => {
  if (value !== undefined && value !== aiOn.value) setAiEnabled(value);
};

// Deliberately not `immediate`: enabling runs `adapter.warmup`, and an
// immediate watch would fire that during setup — on the server under SSR, and
// on the client before mount. The initial sync happens in `onMounted` instead.
watch(() => props.aiEnabled, syncAiFromProp);

const indexOf = (hit: GlobalSearchHit): number =>
  ordered.value.findIndex((r) => r.id === hit.id);

const openAndFocus = (): void => {
  open();
  void nextTick(() => inputRef.value?.focus());
};

const onSelectRoute = (hit: GlobalSearchHit): void => {
  select(indexOf(hit));
};

const onAiToggle = (enabled: boolean): void => {
  if (!isAiControlled.value) setAiEnabled(enabled);
  emit("update:aiEnabled", enabled);
};

const onInputKeydown = (event: KeyboardEvent): void => {
  const handled =
    event.key === "Escape" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowUp" ||
    event.key === "Enter";
  if (!handled) return;

  // The composable listens on document for the same keys, so this has to stop
  // the event here. Letting it bubble runs both handlers on one keypress and
  // the arrows step two results at a time.
  event.preventDefault();
  event.stopPropagation();

  if (event.key === "Escape") close();
  else if (event.key === "ArrowDown") move(1);
  else if (event.key === "ArrowUp") move(-1);
  else select();
};

const isEditable = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable
  );
};

const onGlobalKeydown = (event: KeyboardEvent): void => {
  const shortcut = props.shortcut;
  if (!shortcut) return;
  const useSlash =
    typeof shortcut === "object" ? shortcut.slash !== false : true;
  const modKey = typeof shortcut === "object" ? (shortcut.key ?? "k") : "k";
  if (
    (event.key.toLowerCase() === modKey.toLowerCase() &&
      (event.metaKey || event.ctrlKey)) ||
    (useSlash && event.key === "/" && !isEditable(event.target))
  ) {
    if (event.key === "/" && isEditable(event.target)) return;
    event.preventDefault();
    openAndFocus();
    return;
  }
  if (!isOpen.value) return;
  if (event.key === "Escape") {
    event.preventDefault();
    close();
  }
};

const onOpenEvent = (): void => {
  openAndFocus();
};

onMounted(() => {
  syncAiFromProp(props.aiEnabled);
  if (typeof window === "undefined") return;
  window.addEventListener("keydown", onGlobalKeydown);
  if (props.openEventName) {
    window.addEventListener(props.openEventName, onOpenEvent);
  }
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("keydown", onGlobalKeydown);
  if (props.openEventName) {
    window.removeEventListener(props.openEventName, onOpenEvent);
  }
});

defineExpose({ open: openAndFocus, close, runNow });
</script>

<template>
  <Teleport to="body">
    <div
      class="vd-global-search-overlay"
      :class="{ 'is-open': isOpen }"
      @click="close"
    ></div>
    <div
      class="vd-global-search-modal"
      :class="{ 'is-open': isOpen }"
      role="dialog"
      aria-modal="true"
      :aria-label="dialogLabel"
      :inert="!isOpen || undefined"
    >
      <div class="vd-global-search-header">
        <i
          class="vd-global-search-icon ph ph-magnifying-glass"
          aria-hidden="true"
        ></i>
        <input
          ref="inputRef"
          v-model="query"
          type="search"
          class="vd-global-search-input"
          :placeholder="placeholder"
          autocomplete="off"
          :aria-label="inputLabel"
          @keydown="onInputKeydown"
        />
        <kbd class="vd-global-search-kbd" @click="close">esc</kbd>
      </div>

      <div class="vd-global-search-results">
        <ul
          v-if="ordered.length > 0"
          class="vd-global-search-results-list"
          role="listbox"
          :aria-label="resultsLabel"
        >
          <template v-for="group in groups" :key="group.categoryPath">
            <li class="vd-global-search-category-label">
              {{ group.categoryPath }}
            </li>
            <li
              v-for="result in group.results"
              :key="result.id"
              class="vd-global-search-result"
              role="option"
              :class="{ 'is-active': indexOf(result) === activeIndex }"
              :aria-selected="indexOf(result) === activeIndex"
              @click="onSelectRoute(result)"
              @mousemove="activeIndex = indexOf(result)"
            >
              <div class="vd-global-search-result-icon">
                <i :class="`ph-bold ph-${result.icon}`" aria-hidden="true"></i>
              </div>
              <div class="vd-global-search-result-content">
                <div
                  class="vd-global-search-result-title"
                  v-html="highlight(result.title)"
                ></div>
                <div class="vd-global-search-result-meta">
                  {{ result.category }}
                </div>
              </div>
            </li>
          </template>
        </ul>
        <div v-else-if="hasQuery && searching" class="vd-global-search-hint">
          <div class="vd-global-search-hint-icon">
            <i class="ph-bold ph-magnifying-glass" aria-hidden="true"></i>
          </div>
          <div class="vd-global-search-hint-text">{{ searchingText }}</div>
        </div>
        <div v-else-if="hasQuery" class="vd-global-search-empty">
          <div class="vd-global-search-empty-icon">
            <i class="ph-bold ph-magnifying-glass" aria-hidden="true"></i>
          </div>
          <div class="vd-global-search-empty-title">{{ emptyTitle }}</div>
          <div class="vd-global-search-empty-text">{{ emptyText }}</div>
        </div>
        <div v-else class="vd-global-search-hint">
          <div class="vd-global-search-hint-icon">
            <i class="ph-bold ph-magnifying-glass" aria-hidden="true"></i>
          </div>
          <div class="vd-global-search-hint-text">{{ hintText }}</div>
        </div>
      </div>

      <div class="vd-global-search-footer">
        <div v-if="showAiToggle" class="vd-global-search-footer-controls">
          <VdSwitch
            :model-value="aiOn"
            :label="aiToggleLabel"
            size="sm"
            :aria-describedby="aiOn ? aiNoticeId : undefined"
            @update:model-value="onAiToggle"
          />
          <p v-if="aiOn" :id="aiNoticeId" class="vd-global-search-ai-notice">
            <slot name="ai-notice">
              <strong>AI-assisted search</strong> runs a local embedding model
              in your browser. Your queries are processed on-device and are not
              sent to Vanduo servers for AI ranking. Under the EU AI Act, this
              is an AI feature you can turn off at any time.
              <strong>Note:</strong> first use downloads a large model and may
              use significant CPU/GPU on some devices.
            </slot>
          </p>
        </div>
        <div class="vd-global-search-footer-hints">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
          <span
            v-if="aiOn && progressMessage"
            class="vd-global-search-footer-status"
            aria-live="polite"
          >
            {{ progressMessage }}
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
