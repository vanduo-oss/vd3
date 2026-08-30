import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";

/**
 * Headless global command-palette search — engine-agnostic overlay modal.
 * Pass a `GlobalSearchAdapter` to wire HybridSearch, a REST API, or in-memory data.
 *
 * SSR-safe: global keydown listeners register in `onMounted`.
 */

export interface GlobalSearchHit {
  id: string;
  title: string;
  route: string;
  icon: string;
  category: string;
  categoryPath: string;
  score?: number;
  source?: "fuzzy" | "semantic";
}

export interface GlobalSearchGroup {
  category: string;
  categoryPath: string;
  results: GlobalSearchHit[];
}

export interface GlobalSearchAdapter {
  search(query: string, ctx: { ai: boolean }): Promise<GlobalSearchHit[]>;
  warmup?(ai: boolean): Promise<void>;
}

export type GlobalSearchShortcutOptions =
  | boolean
  | {
      key?: string;
      slash?: boolean;
    };

export interface UseGlobalSearchAiOptions {
  enabled?: boolean;
  defaultEnabled?: boolean;
  persistKey?: string;
}

export interface UseGlobalSearchOptions {
  adapter: GlobalSearchAdapter;
  minQueryLength?: number;
  debounceMs?: number;
  shortcut?: GlobalSearchShortcutOptions;
  ai?: UseGlobalSearchAiOptions;
  groupBy?: (hit: GlobalSearchHit) => string;
  progressMessage?: MaybeRefOrGetter<string>;
  onSelect?: (hit: GlobalSearchHit) => void;
  onSearch?: (query: string, hits: GlobalSearchHit[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface UseGlobalSearchController {
  isOpen: Ref<boolean>;
  query: Ref<string>;
  activeIndex: Ref<number>;
  results: Ref<GlobalSearchHit[]>;
  groups: Ref<GlobalSearchGroup[]>;
  ordered: Ref<GlobalSearchHit[]>;
  searching: Ref<boolean>;
  aiEnabled: Ref<boolean>;
  progressMessage: Ref<string>;
  open(): void;
  close(): void;
  move(delta: number): void;
  setAiEnabled(enabled: boolean): void;
  select(index?: number): GlobalSearchHit | undefined;
  handleGlobalKeydown(event: KeyboardEvent): void;
  highlight(text: string, query?: string): string;
  /** Flush debounce immediately (tests). */
  runNow(): Promise<void>;
}

function loadAiPref(key: string | undefined, defaultEnabled: boolean): boolean {
  if (typeof window === "undefined" || !key) return defaultEnabled;
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as { aiEnabled?: boolean }) : null;
    return parsed?.aiEnabled === true;
  } catch {
    return defaultEnabled;
  }
}

function persistAiPref(key: string | undefined, enabled: boolean): void {
  if (typeof window === "undefined" || !key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ aiEnabled: enabled }));
  } catch {
    /* storage unavailable */
  }
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function defaultGroupBy(hit: GlobalSearchHit): string {
  return hit.categoryPath || hit.category || "Other";
}

function groupHits(
  hits: GlobalSearchHit[],
  groupBy: (hit: GlobalSearchHit) => string,
): GlobalSearchGroup[] {
  const map = new Map<string, GlobalSearchGroup>();
  for (const hit of hits) {
    const path = groupBy(hit);
    let group = map.get(path);
    if (!group) {
      group = {
        category: hit.category,
        categoryPath: path,
        results: [],
      };
      map.set(path, group);
    }
    group.results.push(hit);
  }
  return [...map.values()];
}

export function useGlobalSearch(
  options: UseGlobalSearchOptions,
): UseGlobalSearchController {
  const minQueryLength = options.minQueryLength ?? 2;
  const debounceMs = options.debounceMs ?? 350;
  const groupBy = options.groupBy ?? defaultGroupBy;
  const aiOpts = options.ai ?? {};
  const defaultAi = aiOpts.defaultEnabled ?? false;
  const persistKey = aiOpts.persistKey;

  const isOpen = ref(false);
  const query = ref("");
  const activeIndex = ref(0);
  const results = ref<GlobalSearchHit[]>([]);
  const searching = ref(false);
  const aiEnabled = ref(aiOpts.enabled ?? loadAiPref(persistKey, defaultAi));
  const progressMessage = ref("");

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let searchSeq = 0;

  const groups = computed(() => groupHits(results.value, groupBy));
  const ordered = computed(() => groups.value.flatMap((g) => g.results));

  watch(
    () => toValue(options.progressMessage),
    (msg) => {
      progressMessage.value = String(msg ?? "");
    },
    { immediate: true },
  );

  async function runSearch(raw: string): Promise<void> {
    const q = raw.trim();
    if (q.length < minQueryLength) {
      results.value = [];
      searching.value = false;
      return;
    }

    const seq = ++searchSeq;
    searching.value = true;
    try {
      const hits = await options.adapter.search(q, { ai: aiEnabled.value });
      if (seq !== searchSeq) return;
      results.value = hits;
      options.onSearch?.(q, hits);
    } catch (err) {
      if (seq !== searchSeq) return;
      console.warn("[useGlobalSearch] search failed:", err);
      results.value = [];
    } finally {
      if (seq === searchSeq) searching.value = false;
    }
  }

  function scheduleSearch(raw: string): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    searchSeq += 1;
    const q = raw.trim();
    if (q.length < minQueryLength) {
      results.value = [];
      searching.value = false;
      return;
    }
    debounceTimer = setTimeout(() => {
      void runSearch(raw);
    }, debounceMs);
  }

  watch(query, (value) => {
    activeIndex.value = 0;
    if (!isOpen.value) return;
    scheduleSearch(value);
  });

  watch(aiEnabled, (enabled) => {
    persistAiPref(persistKey, enabled);
  });

  function open(): void {
    isOpen.value = true;
    activeIndex.value = 0;
    options.onOpen?.();
    if (aiEnabled.value) {
      void options.adapter.warmup?.(true);
    }
    if (query.value.trim().length >= minQueryLength) {
      scheduleSearch(query.value);
    }
  }

  function close(): void {
    isOpen.value = false;
    query.value = "";
    activeIndex.value = 0;
    results.value = [];
    searching.value = false;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    searchSeq += 1;
    options.onClose?.();
  }

  function move(delta: number): void {
    const count = ordered.value.length;
    if (count === 0) return;
    activeIndex.value = (activeIndex.value + delta + count) % count;
  }

  function setAiEnabled(enabled: boolean): void {
    aiEnabled.value = enabled;
    persistAiPref(persistKey, enabled);
    if (!enabled) {
      progressMessage.value = "";
      if (query.value.trim().length >= minQueryLength && isOpen.value) {
        scheduleSearch(query.value);
      }
      return;
    }
    void Promise.resolve(options.adapter.warmup?.(true)).then(() => {
      if (query.value.trim().length >= minQueryLength && isOpen.value) {
        scheduleSearch(query.value);
      }
    });
  }

  function select(index?: number): GlobalSearchHit | undefined {
    const idx = index ?? activeIndex.value;
    const hit = ordered.value[idx];
    if (!hit) return undefined;
    options.onSelect?.(hit);
    close();
    return hit;
  }

  function highlight(text: string, q?: string): string {
    const term = (q ?? query.value).trim();
    if (term.length < minQueryLength) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, idx)) +
      "<mark>" +
      escapeHtml(text.slice(idx, idx + term.length)) +
      "</mark>" +
      escapeHtml(text.slice(idx + term.length))
    );
  }

  function shortcutEnabled(): GlobalSearchShortcutOptions {
    return options.shortcut ?? true;
  }

  function handleGlobalKeydown(event: KeyboardEvent): void {
    const shortcut = shortcutEnabled();
    if (shortcut) {
      const useSlash =
        typeof shortcut === "object" ? shortcut.slash !== false : true;
      const modKey = typeof shortcut === "object" ? (shortcut.key ?? "k") : "k";
      if (
        (event.key.toLowerCase() === modKey.toLowerCase() &&
          (event.metaKey || event.ctrlKey)) ||
        (useSlash && event.key === "/" && !isEditableTarget(event.target))
      ) {
        if (event.key === "/" && isEditableTarget(event.target)) return;
        event.preventDefault();
        open();
        return;
      }
    }

    if (!isOpen.value) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      select();
    }
  }

  onMounted(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("keydown", handleGlobalKeydown);
  });

  onUnmounted(() => {
    if (typeof document === "undefined") return;
    document.removeEventListener("keydown", handleGlobalKeydown);
  });

  return {
    isOpen,
    query,
    activeIndex,
    results,
    groups,
    ordered,
    searching,
    aiEnabled,
    progressMessage,
    open,
    close,
    move,
    setAiEnabled,
    select,
    handleGlobalKeydown,
    highlight,
    runNow: async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await runSearch(query.value);
    },
  };
}
