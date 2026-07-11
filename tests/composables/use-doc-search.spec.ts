import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type VNode } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import {
  useDocSearch,
  type DocSearchDoc,
  type DocSearchResult,
  type UseDocSearchController,
  type UseDocSearchOptions,
} from "../../src/composables/useDocSearch";

/**
 * Behaviour specs for useDocSearch, the data-driven vd3 port of the core of
 * `framework/js/components/doc-search.js`. A real host component is mounted so
 * the composable's watch / onMounted / onUnmounted lifecycle runs; ranking is
 * exercised through the synchronous `search`, and the debounce + global
 * shortcut through fake timers and real document events.
 */

let active: VueWrapper | null = null;

/** Mount a host that binds a real input ref to the composable. */
function mountSearch(
  docs: DocSearchDoc[],
  options: UseDocSearchOptions = {},
): {
  api: UseDocSearchController;
  input: HTMLInputElement;
  wrapper: VueWrapper;
} {
  let api!: UseDocSearchController;
  let inputEl!: HTMLInputElement;
  const Host = defineComponent({
    setup() {
      const input = ref<HTMLInputElement | null>(null);
      api = useDocSearch(docs, { input, ...options });
      return (): VNode => h("input", { ref: input, type: "search" });
    },
    mounted() {
      inputEl = this.$el as HTMLInputElement;
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  active = wrapper;
  return { api, input: inputEl, wrapper };
}

/**
 * Ranking fixture for the query "vue":
 * - a: exact title match  -> 100 + 50            = 150
 * - b: keyword-only match -> 30                  =  30
 * - c/d/e: content-only matches (keywords: [])   =  10 each
 */
const rankingDocs: DocSearchDoc[] = [
  { id: "a", title: "Vue", keywords: [] },
  { id: "b", title: "Framework", keywords: ["vue"], content: "" },
  { id: "c", title: "Guide C", keywords: [], content: "about vue here" },
  { id: "d", title: "Guide D", keywords: [], content: "more vue text" },
  { id: "e", title: "Guide E", keywords: [], content: "even vue words" },
];

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (active) {
    active.unmount();
    active = null;
  }
});

describe("useDocSearch ranking + cap", () => {
  it("orders title > keyword > content and caps at maxResults", () => {
    const { api } = mountSearch(rankingDocs, { maxResults: 3 });
    const results = api.search("vue");

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id)).toEqual(["a", "b", "c"]);
    // Highest is the title match, then the keyword match.
    expect(results[0]!.id).toBe("a");
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
    expect(results[1]!.id).toBe("b");
    expect(results[1]!.score).toBeGreaterThan(results[2]!.score);
  });

  it("keeps document order among equal-scored content matches", () => {
    const { api } = mountSearch(rankingDocs, { maxResults: 10 });
    const results = api.search("vue");
    expect(results.map((r) => r.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("caps hard at maxResults", () => {
    const { api } = mountSearch(rankingDocs, { maxResults: 2 });
    expect(api.search("vue").map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("also mutates the reactive results ref and resets activeIndex", () => {
    const { api } = mountSearch(rankingDocs, { maxResults: 3 });
    api.activeIndex.value = 2;
    api.search("vue");
    expect(api.results.value.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(api.activeIndex.value).toBe(-1);
  });
});

describe("useDocSearch minQueryLength gate", () => {
  it("does not search a query below minQueryLength (direct)", () => {
    const { api } = mountSearch(rankingDocs, { minQueryLength: 2 });
    expect(api.search("v")).toEqual([]);
    expect(api.results.value).toEqual([]);
    expect(api.isOpen.value).toBe(false);
  });

  it("leaves results empty and panel closed after a debounced short query", async () => {
    vi.useFakeTimers();
    const { api } = mountSearch(rankingDocs, {
      minQueryLength: 2,
      debounceMs: 150,
    });
    api.query.value = "v";
    await nextTick();
    vi.advanceTimersByTime(200);
    await nextTick();
    expect(api.results.value).toEqual([]);
    expect(api.isOpen.value).toBe(false);
  });

  it("runs a debounced search once the query is long enough", async () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    const { api } = mountSearch(rankingDocs, { debounceMs: 150, onSearch });
    api.query.value = "vue";
    await nextTick();
    // Not yet — still within the debounce window.
    expect(api.results.value).toEqual([]);
    vi.advanceTimersByTime(200);
    await nextTick();
    expect(api.results.value.length).toBeGreaterThan(0);
    expect(api.isOpen.value).toBe(true);
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("vue", api.results.value);
  });
});

describe("useDocSearch highlight escaping", () => {
  it("escapes source HTML and only wraps matches in the highlight tag", () => {
    const { api } = mountSearch([
      { id: "x", title: "Hello <b>World", keywords: [] },
    ]);
    const [result] = api.search("hello");
    const html = result!.titleHtml;

    expect(html).toContain("<mark>Hello</mark>");
    // The literal <b> is escaped, not a live element.
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>");
  });

  it("honours a whitelisted highlightTag", () => {
    const { api } = mountSearch([{ id: "x", title: "Hello", keywords: [] }], {
      highlightTag: "strong",
    });
    expect(api.search("hello")[0]!.titleHtml).toBe("<strong>Hello</strong>");
  });

  it("falls back to <mark> for a non-whitelisted tag", () => {
    const { api } = mountSearch([{ id: "x", title: "Hello", keywords: [] }], {
      highlightTag: "script",
    });
    expect(api.search("hello")[0]!.titleHtml).toBe("<mark>Hello</mark>");
  });

  it("exposes highlight() as a standalone helper", () => {
    const { api } = mountSearch([{ id: "x", title: "Hi" }]);
    expect(api.highlight("a b", "b")).toBe("a <mark>b</mark>");
  });
});

describe("useDocSearch excerpt", () => {
  it("windows around the first content match", () => {
    const long = `${"lorem ".repeat(20)}needle ${"ipsum ".repeat(20)}`;
    const { api } = mountSearch([
      { id: "x", title: "Doc", keywords: [], content: long },
    ]);
    const [result] = api.search("needle");
    expect(result!.excerpt).toContain("needle");
    expect(result!.excerpt.startsWith("...")).toBe(true);
    expect(result!.excerptHtml).toContain("<mark>needle</mark>");
  });
});

describe("useDocSearch navigation", () => {
  it("wraps activeIndex forward and backward", () => {
    const { api } = mountSearch(rankingDocs, { maxResults: 3 });
    api.search("vue"); // 3 results, activeIndex = -1
    expect(api.activeIndex.value).toBe(-1);

    api.navigate(1);
    expect(api.activeIndex.value).toBe(0);
    api.navigate(1);
    api.navigate(1);
    expect(api.activeIndex.value).toBe(2);
    api.navigate(1); // wrap to first
    expect(api.activeIndex.value).toBe(0);
    api.navigate(-1); // wrap to last
    expect(api.activeIndex.value).toBe(2);
  });

  it("navigate is a no-op with no results", () => {
    const { api } = mountSearch(rankingDocs);
    api.navigate(1);
    expect(api.activeIndex.value).toBe(-1);
  });
});

describe("useDocSearch open/close/select", () => {
  it("select returns the result, invokes onSelect, closes and clears", () => {
    const onSelect = vi.fn();
    const { api } = mountSearch(rankingDocs, { maxResults: 3, onSelect });
    api.search("vue");
    api.open();
    api.navigate(1); // activeIndex 0

    const selected = api.select();
    expect(selected?.id).toBe("a");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    expect(api.isOpen.value).toBe(false);
    expect(api.query.value).toBe("");
    expect(api.results.value).toEqual([]);
  });

  it("select is a no-op for an out-of-range index", () => {
    const onSelect = vi.fn();
    const { api } = mountSearch(rankingDocs, { onSelect });
    expect(api.select(5)).toBeUndefined();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("open/close toggle isOpen and fire their hooks", () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const { api } = mountSearch(rankingDocs, { onOpen, onClose });
    api.open();
    expect(api.isOpen.value).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
    api.close();
    expect(api.isOpen.value).toBe(false);
    expect(api.activeIndex.value).toBe(-1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("useDocSearch handleKeydown", () => {
  it("Enter selects the active result", () => {
    const onSelect = vi.fn();
    const { api } = mountSearch(rankingDocs, { maxResults: 3, onSelect });
    api.search("vue");
    api.open();
    api.navigate(1); // active 0
    api.handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    expect(api.isOpen.value).toBe(false);
  });

  it("Escape closes an open panel", () => {
    const { api } = mountSearch(rankingDocs);
    api.search("vue");
    api.open();
    api.handleKeydown(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(api.isOpen.value).toBe(false);
  });

  it("ArrowDown on a closed panel opens it when the query is long enough", () => {
    const { api } = mountSearch(rankingDocs);
    api.query.value = "vue";
    expect(api.isOpen.value).toBe(false);
    api.handleKeydown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(api.isOpen.value).toBe(true);
    expect(api.results.value.length).toBeGreaterThan(0);
  });
});

describe("useDocSearch keyboard shortcut", () => {
  it("Cmd/Ctrl+K focuses the bound input and prevents default", () => {
    const { input } = mountSearch(rankingDocs, { keyboardShortcut: true });
    (document.activeElement as HTMLElement | null)?.blur();

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(input);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not attach the shortcut when keyboardShortcut is false", () => {
    mountSearch(rankingDocs, { keyboardShortcut: false });
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("detaches the global listener on unmount", () => {
    const { wrapper } = mountSearch(rankingDocs, { keyboardShortcut: true });
    wrapper.unmount();
    active = null;

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    // No live handler remains, so nothing prevented the default.
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("useDocSearch result metadata", () => {
  it("derives category slug, href and category icon", () => {
    const docs: DocSearchDoc[] = [
      { id: "btn", title: "Button", category: "Components" },
    ];
    const { api } = mountSearch(docs);
    const [result] = api.search("button") as DocSearchResult[];
    expect(result!.categorySlug).toBe("components");
    expect(result!.href).toBe("#btn");
    expect(result!.icon).toBe("ph-puzzle-piece");
  });

  it("prefers an explicit icon over the category default", () => {
    const { api } = mountSearch([
      { id: "x", title: "Xyz", category: "Components", icon: "ph-star" },
    ]);
    expect(api.search("xyz")[0]!.icon).toBe("ph-star");
  });
});
