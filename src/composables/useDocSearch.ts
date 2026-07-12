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
 * Headless documentation-search engine — the data-driven port of the behavior
 * core of `framework/js/components/doc-search.js` (1016 lines). The donor's
 * DOM-scan index building (`.doc-content section[id]`) is intentionally dropped
 * (it assumed a static docs page); instead the caller supplies a document
 * collection, statically or reactively.
 *
 * It reproduces the donor's ranking (title > category > keyword > content),
 * excerpting around the first content match, HTML-escaped highlighting with a
 * safe-tag whitelist, debounced input, the `minQueryLength` gate, the
 * `maxResults` cap, and the Cmd/Ctrl+K global shortcut that focuses a bound
 * input. It exposes reactive `query` / `results` / `isOpen` / `activeIndex`
 * plus `search` / `open` / `close` / `navigate` / `select`, so `VdDocSearch`
 * is a thin markup shell and headless use stays possible.
 *
 * SSR-safe: reactive state is created eagerly, but the only browser access (the
 * global keydown listener) is registered in `onMounted` and released in
 * `onUnmounted`.
 */

/** A searchable document supplied by the caller. */
export interface DocSearchDoc {
  /** Stable identifier. Falls back to a slug of `title`. */
  id?: string;
  /** Primary label; the highest-weighted match field. */
  title: string;
  /** Body text; matches here are the lowest-weighted and drive the excerpt. */
  content?: string;
  /** Grouping label (also drives the result's category-icon colour). */
  category?: string;
  /** Extra match terms; derived from `title` + `content` when omitted. */
  keywords?: string[];
  /** Destination for the result (defaults to `#<id>`). */
  href?: string;
  /** Explicit Phosphor icon class; falls back to the category icon. */
  icon?: string;
}

/** A ranked, render-ready search result. */
export interface DocSearchResult {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  content: string;
  href: string;
  icon: string;
  /** Relevance score (higher is better); results are sorted by it, descending. */
  score: number;
  /** HTML-escaped title with the matched terms wrapped in the highlight tag. */
  titleHtml: string;
  /** Plain-text excerpt window around the first content match. */
  excerpt: string;
  /** HTML-escaped excerpt with the matched terms wrapped in the highlight tag. */
  excerptHtml: string;
}

export interface UseDocSearchOptions {
  /** Queries shorter than this never search. Donor default `2`. */
  minQueryLength?: number;
  /** Maximum results returned. Donor default `10`. */
  maxResults?: number;
  /** Debounce applied to input before searching, in ms. Donor default `150`. */
  debounceMs?: number;
  /** Wrapper tag for highlighted matches; validated against a safe whitelist
   *  (`mark` | `span` | `strong` | `em`). Donor default `"mark"`. */
  highlightTag?: string;
  /** Enable the Cmd/Ctrl+K shortcut that focuses `input`. Donor default `true`. */
  keyboardShortcut?: boolean;
  /** Input element the Cmd/Ctrl+K shortcut focuses. */
  input?: Ref<HTMLInputElement | HTMLElement | null>;
  /** Category-slug → Phosphor icon class map for results lacking `icon`. */
  categoryIcons?: Record<string, string>;
  /** Invoked by `select` with the chosen result. */
  onSelect?: (result: DocSearchResult) => void;
  /** Invoked after a debounced search settles with the query and its results. */
  onSearch?: (query: string, results: DocSearchResult[]) => void;
  /** Invoked when the results panel opens. */
  onOpen?: () => void;
  /** Invoked when the results panel closes. */
  onClose?: () => void;
}

export interface UseDocSearchController {
  /** Live input value; mutate it (e.g. via `v-model`) to drive a debounced search. */
  query: Ref<string>;
  /** Current ranked results. */
  results: Ref<DocSearchResult[]>;
  /** Whether the results panel is open. */
  isOpen: Ref<boolean>;
  /** Active result index for keyboard navigation, or `-1`. */
  activeIndex: Ref<number>;
  /** Run the ranking synchronously (no debounce). Updates `results`, resets
   *  `activeIndex`, and returns the results. Queries below `minQueryLength`
   *  clear `results` and return `[]`. */
  search(query?: string): DocSearchResult[];
  /** Open the results panel. */
  open(): void;
  /** Close the results panel and clear the active index. */
  close(): void;
  /** Move `activeIndex` by `direction` (wrapping). */
  navigate(direction: number): void;
  /** Select a result (defaults to the active one): closes, clears the query,
   *  invokes `onSelect`, and returns the result. */
  select(index?: number): DocSearchResult | undefined;
  /** Combobox keyboard handler for the bound input (Arrow/Enter/Escape/Tab). */
  handleKeydown(event: KeyboardEvent): void;
  /** HTML-escape `text` and wrap matches for `query` in the highlight tag. */
  highlight(text: string, query?: string): string;
}

const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  "getting-started": "ph-rocket-launch",
  core: "ph-cube",
  components: "ph-puzzle-piece",
  interactive: "ph-cursor-click",
  "data-display": "ph-table",
  feedback: "ph-bell",
  meta: "ph-info",
  default: "ph-file-text",
};

const ALLOWED_HIGHLIGHT_TAGS = new Set(["mark", "span", "strong", "em"]);

const EXCERPT_LENGTH = 100;

function normalizeHighlightTag(tag: string | undefined): string {
  const normalized = typeof tag === "string" ? tag.toLowerCase() : "mark";
  return ALLOWED_HIGHLIGHT_TAGS.has(normalized) ? normalized : "mark";
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function extractKeywordsFromText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function escapeHtml(text: string | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function useDocSearch(
  docs: MaybeRefOrGetter<DocSearchDoc[]>,
  options: UseDocSearchOptions = {},
): UseDocSearchController {
  const minQueryLength = options.minQueryLength ?? 2;
  const maxResults = options.maxResults ?? 10;
  const debounceMs = options.debounceMs ?? 150;
  const highlightTag = normalizeHighlightTag(options.highlightTag);
  const keyboardShortcut = options.keyboardShortcut ?? true;
  const categoryIcons = { ...DEFAULT_CATEGORY_ICONS, ...options.categoryIcons };

  const query = ref("");
  const results = ref<DocSearchResult[]>([]);
  const isOpen = ref(false);
  const activeIndex = ref(-1);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const getCategoryIcon = (categorySlug: string): string =>
    categoryIcons[categorySlug] || categoryIcons.default || "ph-file-text";

  /** Normalized entries built once per `docs` change. */
  interface IndexEntry {
    id: string;
    title: string;
    category: string;
    categorySlug: string;
    content: string;
    keywords: string[];
    href: string;
    icon: string;
  }

  const entries = computed<IndexEntry[]>(() => {
    const source = toValue(docs) || [];
    return source.map((item) => {
      const id = item.id || slugify(item.title || "");
      const category = item.category || "";
      const categorySlug = slugify(category);
      const content = item.content || "";
      return {
        id,
        title: item.title || "",
        category,
        categorySlug,
        content,
        keywords:
          item.keywords ||
          extractKeywordsFromText(`${item.title || ""} ${content}`),
        href: item.href || `#${id}`,
        icon: item.icon || getCategoryIcon(categorySlug),
      };
    });
  });

  const highlight = (text: string, q: string = query.value): string => {
    const terms = toTerms(q);
    if (terms.length === 0) return escapeHtml(text);
    let escaped = escapeHtml(text);
    terms.forEach((term) => {
      // Skip overly long terms to prevent ReDoS (donor guard).
      if (term.length > 50) return;
      const regex = new RegExp(`(${escapeRegExp(term)})`, "gi");
      escaped = escaped.replace(regex, `<${highlightTag}>$1</${highlightTag}>`);
    });
    return escaped;
  };

  const excerptOf = (content: string, terms: string[]): string => {
    const contentLower = content.toLowerCase();
    let matchPos = -1;
    for (const term of terms) {
      const pos = contentLower.indexOf(term);
      if (pos !== -1 && (matchPos === -1 || pos < matchPos)) matchPos = pos;
    }

    if (matchPos === -1) {
      // Metadata-only match (title / category / keyword): the body holds no
      // query term, or was supplied empty. Fall back to the donor's
      // leading-window intent — the start of the body — but append a trailing
      // ellipsis only when the body was actually truncated, and yield an empty
      // excerpt for an empty / whitespace-only body. This avoids the donor's
      // degenerate bare `"..."` (`getExcerpt` always appended it) and never
      // emits a broken fragment.
      if (content.trim() === "") return "";
      const head = content.substring(0, EXCERPT_LENGTH);
      return content.length > EXCERPT_LENGTH ? `${head}...` : head;
    }

    const start = Math.max(0, matchPos - 30);
    const end = Math.min(content.length, matchPos + EXCERPT_LENGTH);
    let excerpt = content.substring(start, end);
    if (start > 0) excerpt = `...${excerpt}`;
    if (end < content.length) excerpt = `${excerpt}...`;
    return excerpt;
  };

  const rank = (rawQuery: string): DocSearchResult[] => {
    const terms = toTerms(rawQuery);
    const scored: DocSearchResult[] = [];

    entries.value.forEach((entry) => {
      let score = 0;
      const titleLower = entry.title.toLowerCase();
      const categoryLower = entry.category.toLowerCase();
      const contentLower = entry.content.toLowerCase();

      terms.forEach((term) => {
        // Title match — highest priority.
        if (titleLower.includes(term)) {
          score += 100;
          if (titleLower === term) score += 50;
          else if (titleLower.startsWith(term)) score += 25;
        }
        // Category match.
        if (categoryLower.includes(term)) score += 50;
        // Keyword match.
        if (entry.keywords.some((k) => k.includes(term))) score += 30;
        // Content match — lowest priority.
        if (contentLower.includes(term)) score += 10;
      });

      if (score > 0) {
        const excerpt = excerptOf(entry.content, terms);
        scored.push({
          id: entry.id,
          title: entry.title,
          category: entry.category,
          categorySlug: entry.categorySlug,
          content: entry.content,
          href: entry.href,
          icon: entry.icon,
          score,
          titleHtml: highlight(entry.title, rawQuery),
          excerpt,
          excerptHtml: highlight(excerpt, rawQuery),
        });
      }
    });

    // Stable sort (ES2019+) keeps document order among equal scores.
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  };

  const open = (): void => {
    if (isOpen.value) return;
    isOpen.value = true;
    options.onOpen?.();
  };

  const close = (): void => {
    if (!isOpen.value) {
      activeIndex.value = -1;
      return;
    }
    isOpen.value = false;
    activeIndex.value = -1;
    options.onClose?.();
  };

  const search = (q: string = query.value): DocSearchResult[] => {
    const trimmed = q.trim();
    if (trimmed.length < minQueryLength) {
      results.value = [];
      activeIndex.value = -1;
      return [];
    }
    const ranked = rank(trimmed);
    results.value = ranked;
    activeIndex.value = -1;
    return ranked;
  };

  const navigate = (direction: number): void => {
    const total = results.value.length;
    if (total === 0) return;
    let next = activeIndex.value + direction;
    if (next < 0) next = total - 1;
    else if (next >= total) next = 0;
    activeIndex.value = next;
  };

  const select = (index_ = activeIndex.value): DocSearchResult | undefined => {
    const result = results.value[index_];
    if (!result) return undefined;
    close();
    query.value = "";
    results.value = [];
    options.onSelect?.(result);
    return result;
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!isOpen.value) {
      if (
        event.key === "ArrowDown" &&
        query.value.trim().length >= minQueryLength
      ) {
        event.preventDefault();
        search();
        open();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        navigate(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        navigate(-1);
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex.value >= 0) select(activeIndex.value);
        else if (results.value.length > 0) select(0);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
    }
  };

  // Debounce live input: typing schedules a settled search.
  watch(query, (value) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed.length < minQueryLength) {
        results.value = [];
        close();
        return;
      }
      search(trimmed);
      open();
      options.onSearch?.(trimmed, results.value);
    }, debounceMs);
  });

  const onGlobalKeydown = (event: KeyboardEvent): void => {
    if (!keyboardShortcut) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      const el = options.input?.value;
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") {
          (el as HTMLInputElement).select();
        }
      }
    }
  };

  onMounted(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("keydown", onGlobalKeydown);
  });

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", onGlobalKeydown);
    }
  });

  return {
    query,
    results,
    isOpen,
    activeIndex,
    search,
    open,
    close,
    navigate,
    select,
    handleKeydown,
    highlight,
  };
}
