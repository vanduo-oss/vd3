import type { Ref } from "vue";

/**
 * Ports framework/js/components/search.js — a small registry that lets
 * consumers plug named data sources into a search overlay. The package does
 * not ship a search UI; overlays (e.g. a global search modal) consume the
 * registry via `register` / `list` / `query`.
 *
 * The registry is a module-scope singleton: sources registered by any caller
 * are visible to every other caller and survive component unmount by design
 * (the old vanilla layer exposed the same registry as a process-global, and
 * app-level code registered sources outside any component lifecycle).
 *
 * SSR caveat (useToast precedent): because the registry lives at module
 * scope it is process-global — under SSR every request shares the same
 * source map. Search overlays are client-only interactions, so at SSG/SSR
 * render time the registry is inert; register sources from client-side code.
 */

/** Result shape returned by a source's `fetch`. */
export interface SearchResult {
  title: string;
  subtitle?: string;
  href: string;
  group?: string;
  icon?: string;
}

/** Second argument passed to a source's `fetch`. */
export interface SearchFetchContext {
  signal?: AbortSignal;
  /** Effective cap for this query: `limitPerSource` override or the source's own `limit`. */
  limit: number;
}

export type SearchFetch = (
  query: string,
  context: SearchFetchContext,
) => SearchResult[] | Promise<SearchResult[]>;

/** Source shape accepted by `register`. */
export interface SearchSource {
  /** Unique key. Required, non-empty. */
  name: string;
  /** Display name in result groups. Defaults to `name`. */
  label?: string;
  /** Optional icon class (e.g. a Phosphor class). Defaults to `null`. */
  icon?: string | null;
  /** Per-source result cap. Defaults to `10`. */
  limit?: number;
  fetch: SearchFetch;
}

/** Frozen record stored in the registry (defaults applied). */
export interface RegisteredSearchSource {
  readonly name: string;
  readonly label: string;
  readonly icon: string | null;
  readonly limit: number;
  readonly fetch: SearchFetch;
}

/** Per-source slice of a query result. */
export interface SearchSourceResults {
  name: string;
  label: string;
  results: SearchResult[];
  /** Present when this source's `fetch` rejected (non-abort). */
  error?: string;
}

export interface SearchQueryOptions {
  signal?: AbortSignal;
  /** Overrides every source's own `limit` for this query. */
  limitPerSource?: number;
}

export interface SearchQueryResult {
  /** The trimmed query text. */
  text: string;
  sources: SearchSourceResults[];
}

/** The registry API returned by `useSearch()`. */
export interface SearchRegistry {
  /** Adds a source. Throws on a missing/empty `name`, a non-function `fetch`, or a duplicate `name`. */
  register(source: SearchSource): void;
  /** Removes a source. Returns whether one was removed. */
  unregister(name: string): boolean;
  /** Returns the registered sources as a frozen array (insertion order). */
  list(): readonly RegisteredSearchSource[];
  /**
   * Searches every source in parallel. Trims `text`; an empty query resolves
   * immediately with empty per-source results without invoking any `fetch`.
   * Per-source errors are captured as `{ results: [], error }` so one failing
   * source never rejects the whole query — except `AbortError`, which is
   * rethrown.
   */
  query(text: string, options?: SearchQueryOptions): Promise<SearchQueryResult>;
}

const DEFAULT_LIMIT = 10;

/** Module-scope singleton — see the SSR caveat in the file doc comment. */
const sources = new Map<string, RegisteredSearchSource>();

function register(source: SearchSource): void {
  // Runtime validation is kept from the vanilla source so plain-JS callers
  // fail loudly, not just TS ones.
  const raw = source as SearchSource | null | undefined;
  if (!raw || typeof raw.name !== "string" || raw.name.length === 0) {
    throw new Error("useSearch.register: source.name is required");
  }
  if (typeof raw.fetch !== "function") {
    throw new Error("useSearch.register: source.fetch must be a function");
  }
  if (sources.has(raw.name)) {
    throw new Error(
      'useSearch.register: source "' + raw.name + '" already registered',
    );
  }
  sources.set(
    raw.name,
    Object.freeze({
      name: raw.name,
      label: raw.label || raw.name,
      icon: raw.icon || null,
      limit: typeof raw.limit === "number" ? raw.limit : DEFAULT_LIMIT,
      fetch: raw.fetch,
    }),
  );
}

function unregister(name: string): boolean {
  return sources.delete(name);
}

function list(): readonly RegisteredSearchSource[] {
  return Object.freeze(Array.from(sources.values()));
}

function query(
  text: string,
  options: SearchQueryOptions = {},
): Promise<SearchQueryResult> {
  const signal = options.signal;
  const limitPerSource =
    typeof options.limitPerSource === "number" ? options.limitPerSource : null;
  const queryText = (text || "").trim();
  const allSources = Array.from(sources.values());

  if (queryText.length === 0) {
    return Promise.resolve({
      text: queryText,
      sources: allSources.map((src): SearchSourceResults => ({
        name: src.name,
        label: src.label,
        results: [],
      })),
    });
  }

  const promises = allSources.map((src) => {
    const effectiveLimit = limitPerSource != null ? limitPerSource : src.limit;
    return Promise.resolve()
      .then(() => src.fetch(queryText, { signal, limit: effectiveLimit }))
      .then((results): SearchSourceResults => ({
        name: src.name,
        label: src.label,
        results: Array.isArray(results) ? results : [],
      }))
      .catch((error: unknown): SearchSourceResults => {
        const named = error as
          { name?: unknown; message?: unknown } | null | undefined;
        if (named && named.name === "AbortError") throw error;
        const message =
          named && typeof named.message === "string" && named.message.length > 0
            ? named.message
            : "fetch failed";
        return {
          name: src.name,
          label: src.label,
          results: [],
          error: message,
        };
      });
  });

  return Promise.all(promises).then((perSource) => ({
    text: queryText,
    sources: perSource,
  }));
}

const registry: SearchRegistry = Object.freeze({
  register,
  unregister,
  list,
  query,
});

/**
 * Returns the process-global search registry.
 *
 * The old shim's `useSearch(root)` call shape keeps working — the `root` ref
 * remains part of the public contract (so future versions could scope
 * registration) but is not consumed today.
 *
 * vd3 extensions:
 * - `root` is now optional (`useSearch()` is valid).
 * - The registry API is returned (the old shim returned `void`); old call
 *   sites that discard the result are unaffected.
 * - No lifecycle hooks are used, so this may also be called from app-level
 *   code outside a component `setup()` — the pure replacement for the old
 *   global-registry access pattern.
 */
export function useSearch(root?: Ref<HTMLElement | null>): SearchRegistry {
  void root;
  return registry;
}
