import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref, type Ref } from "vue";
import {
  useSearch,
  type SearchResult,
  type SearchSource,
} from "../../src/composables/useSearch";

// useSearch exposes a module-scope singleton registry (process-global by
// design, like the vanilla source). Every test drains it so registered
// sources never bleed across specs.
function drainRegistry(): void {
  const api = useSearch();
  for (const src of api.list()) api.unregister(src.name);
}

const mounted: VueWrapper[] = [];

function mountHost<T>(use: (root: Ref<HTMLElement | null>) => T): {
  wrapper: VueWrapper;
  api: T;
} {
  let api!: T;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = use(root);
      return () => h("div", { ref: root });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
}

const result = (title: string): SearchResult => ({ title, href: "#" + title });

beforeEach(() => {
  drainRegistry();
});

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted by the test under test */
    }
  }
  mounted.length = 0;
  drainRegistry();
  vi.restoreAllMocks();
});

describe("useSearch shim signature and singleton", () => {
  it("keeps the old shim call shape: useSearch(root) with a Ref, result discardable", () => {
    const { api } = mountHost((root) => {
      // Old consumer pattern: call and discard the return value.
      useSearch(root);
      return useSearch(root);
    });
    expect(typeof api.register).toBe("function");
    expect(typeof api.unregister).toBe("function");
    expect(typeof api.list).toBe("function");
    expect(typeof api.query).toBe("function");
  });

  it("returns the same registry from every caller, with or without a root", () => {
    const bare = useSearch();
    const withRoot = useSearch(ref<HTMLElement | null>(null));
    const { api } = mountHost((root) => useSearch(root));
    expect(withRoot).toBe(bare);
    expect(api).toBe(bare);
  });

  it("the registry object is frozen", () => {
    expect(Object.isFrozen(useSearch())).toBe(true);
  });
});

describe("useSearch register()", () => {
  it("throws when name is missing or empty", () => {
    const api = useSearch();
    expect(() =>
      api.register({ fetch: () => [] } as unknown as SearchSource),
    ).toThrow(/source\.name is required/);
    expect(() => api.register({ name: "", fetch: () => [] })).toThrow(
      /source\.name is required/,
    );
    expect(api.list()).toHaveLength(0);
  });

  it("throws when fetch is not a function", () => {
    const api = useSearch();
    expect(() =>
      api.register({ name: "docs", fetch: "nope" } as unknown as SearchSource),
    ).toThrow(/source\.fetch must be a function/);
    expect(api.list()).toHaveLength(0);
  });

  it("throws on a duplicate name and keeps the original entry", () => {
    const api = useSearch();
    const first = (): SearchResult[] => [result("first")];
    api.register({ name: "docs", fetch: first });
    expect(() => api.register({ name: "docs", fetch: () => [] })).toThrow(
      /"docs" already registered/,
    );
    const entries = api.list().filter((s) => s.name === "docs");
    expect(entries).toHaveLength(1);
    expect(entries[0].fetch).toBe(first);
  });

  it("applies the vanilla defaults: label=name, icon=null, limit=10", () => {
    const api = useSearch();
    api.register({ name: "docs", fetch: () => [] });
    const [src] = api.list();
    expect(src.label).toBe("docs");
    expect(src.icon).toBeNull();
    expect(src.limit).toBe(10);
  });

  it("keeps explicit label, icon, and limit (including 0)", () => {
    const api = useSearch();
    api.register({
      name: "docs",
      label: "Documentation",
      icon: "ph-book-open",
      limit: 0,
      fetch: () => [],
    });
    const [src] = api.list();
    expect(src.label).toBe("Documentation");
    expect(src.icon).toBe("ph-book-open");
    expect(src.limit).toBe(0);
  });

  it("stores a frozen source record", () => {
    const api = useSearch();
    api.register({ name: "docs", fetch: () => [] });
    expect(Object.isFrozen(api.list()[0])).toBe(true);
  });
});

describe("useSearch unregister() and list()", () => {
  it("unregister returns true when a source was removed, false otherwise", () => {
    const api = useSearch();
    api.register({ name: "docs", fetch: () => [] });
    expect(api.unregister("docs")).toBe(true);
    expect(api.unregister("docs")).toBe(false);
    expect(api.list()).toHaveLength(0);
  });

  it("list returns a frozen array in insertion order, new instance per call", () => {
    const api = useSearch();
    api.register({ name: "b", fetch: () => [] });
    api.register({ name: "a", fetch: () => [] });
    const snapshot = api.list();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(snapshot.map((s) => s.name)).toEqual(["b", "a"]);
    expect(api.list()).not.toBe(snapshot);
  });
});

describe("useSearch query()", () => {
  it("short-circuits an empty/whitespace query without invoking any fetch", async () => {
    const api = useSearch();
    const fetchA = vi.fn(() => [result("a")]);
    const fetchB = vi.fn(() => [result("b")]);
    api.register({ name: "a", label: "Alpha", fetch: fetchA });
    api.register({ name: "b", fetch: fetchB });

    const res = await api.query("   ");
    expect(res.text).toBe("");
    expect(res.sources).toEqual([
      { name: "a", label: "Alpha", results: [] },
      { name: "b", label: "b", results: [] },
    ]);
    expect(fetchA).not.toHaveBeenCalled();
    expect(fetchB).not.toHaveBeenCalled();
  });

  it("trims the text and passes { signal, limit } to each fetch", async () => {
    const api = useSearch();
    const fetch = vi.fn(() => [result("hit")]);
    api.register({ name: "docs", limit: 3, fetch });
    const controller = new AbortController();

    const res = await api.query("  token  ", { signal: controller.signal });
    expect(res.text).toBe("token");
    expect(fetch).toHaveBeenCalledExactlyOnceWith("token", {
      signal: controller.signal,
      limit: 3,
    });
  });

  it("passes the default limit of 10 when the source has none", async () => {
    const api = useSearch();
    const fetch = vi.fn(() => []);
    api.register({ name: "docs", fetch });
    await api.query("q");
    expect(fetch).toHaveBeenCalledWith("q", { signal: undefined, limit: 10 });
  });

  it("limitPerSource overrides every source's own limit (0 included)", async () => {
    const api = useSearch();
    const fetchA = vi.fn(() => []);
    const fetchB = vi.fn(() => []);
    api.register({ name: "a", limit: 3, fetch: fetchA });
    api.register({ name: "b", fetch: fetchB });

    await api.query("q", { limitPerSource: 5 });
    expect(fetchA).toHaveBeenLastCalledWith("q", {
      signal: undefined,
      limit: 5,
    });
    expect(fetchB).toHaveBeenLastCalledWith("q", {
      signal: undefined,
      limit: 5,
    });

    await api.query("q", { limitPerSource: 0 });
    expect(fetchA).toHaveBeenLastCalledWith("q", {
      signal: undefined,
      limit: 0,
    });
  });

  it("aggregates all sources in parallel, preserving registration order", async () => {
    const api = useSearch();
    api.register({
      name: "slow",
      label: "Slow",
      fetch: () =>
        new Promise<SearchResult[]>((resolve) =>
          setTimeout(() => resolve([result("late")]), 0),
        ),
    });
    api.register({ name: "fast", label: "Fast", fetch: () => [result("now")] });

    const res = await api.query("q");
    expect(res.sources.map((s) => s.name)).toEqual(["slow", "fast"]);
    expect(res.sources[0].results).toEqual([result("late")]);
    expect(res.sources[1].results).toEqual([result("now")]);
  });

  it("coerces non-array fetch results to []", async () => {
    const api = useSearch();
    api.register({
      name: "bad",
      fetch: () => "nope" as unknown as SearchResult[],
    });
    const res = await api.query("q");
    expect(res.sources[0].results).toEqual([]);
    expect(res.sources[0].error).toBeUndefined();
  });

  it("isolates per-source failures: one rejection never rejects the whole query", async () => {
    const api = useSearch();
    api.register({ name: "ok", fetch: () => [result("hit")] });
    api.register({
      name: "broken",
      label: "Broken",
      fetch: () => Promise.reject(new Error("boom")),
    });

    const res = await api.query("q");
    expect(res.sources[0]).toEqual({
      name: "ok",
      label: "ok",
      results: [result("hit")],
    });
    expect(res.sources[1]).toEqual({
      name: "broken",
      label: "Broken",
      results: [],
      error: "boom",
    });
  });

  it('falls back to "fetch failed" when the rejection has no message', async () => {
    const api = useSearch();
    api.register({ name: "a", fetch: () => Promise.reject(new Error("")) });
    api.register({ name: "b", fetch: () => Promise.reject({}) });
    const res = await api.query("q");
    expect(res.sources[0].error).toBe("fetch failed");
    expect(res.sources[1].error).toBe("fetch failed");
  });

  it("rethrows AbortError so callers can distinguish cancellation", async () => {
    const api = useSearch();
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    api.register({ name: "ok", fetch: () => [result("hit")] });
    api.register({ name: "aborted", fetch: () => Promise.reject(abortError) });

    await expect(api.query("q")).rejects.toBe(abortError);
  });

  it("throws synchronous fetch errors through the same isolation path", async () => {
    const api = useSearch();
    api.register({
      name: "sync",
      fetch: () => {
        throw new Error("sync boom");
      },
    });
    const res = await api.query("q");
    expect(res.sources[0].error).toBe("sync boom");
  });
});

describe("useSearch registry lifetime", () => {
  it("survives component unmount: sources registered in setup remain visible", async () => {
    const { wrapper } = mountHost((root) => {
      const api = useSearch(root);
      api.register({ name: "from-component", fetch: () => [result("hit")] });
      return api;
    });

    wrapper.unmount();

    const fresh = useSearch();
    expect(fresh.list().map((s) => s.name)).toContain("from-component");
    const res = await fresh.query("q");
    expect(res.sources[0].results).toEqual([result("hit")]);
  });
});
