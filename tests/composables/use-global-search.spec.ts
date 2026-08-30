import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import {
  useGlobalSearch,
  type GlobalSearchAdapter,
  type GlobalSearchHit,
} from "../../src/composables/useGlobalSearch";

const sampleHits: GlobalSearchHit[] = [
  {
    id: "a",
    title: "Alpha",
    route: "/a",
    icon: "file",
    category: "Pages",
    categoryPath: "Pages",
  },
];

describe("useGlobalSearch", () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("debounces adapter.search and groups results", async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => sampleHits);
    const adapter: GlobalSearchAdapter = { search };

    const scope = effectScope();
    const ctrl = scope.run(() =>
      useGlobalSearch({ adapter, debounceMs: 100, shortcut: false }),
    )!;

    ctrl.open();
    ctrl.query.value = "al";
    await nextTick();
    vi.advanceTimersByTime(120);
    await nextTick();
    expect(search).toHaveBeenCalledWith("al", { ai: false });
    expect(ctrl.ordered.value).toHaveLength(1);
    expect(ctrl.groups.value[0].categoryPath).toBe("Pages");
    scope.stop();
  });

  it("persists AI preference when persistKey is set", () => {
    const adapter: GlobalSearchAdapter = {
      search: async () => [],
      warmup: async () => {},
    };
    const scope = effectScope();
    const ctrl = scope.run(() =>
      useGlobalSearch({
        adapter,
        shortcut: false,
        ai: { persistKey: "test-search", defaultEnabled: false },
      }),
    )!;
    ctrl.setAiEnabled(true);
    expect(JSON.parse(localStorage.getItem("test-search")!)).toEqual({
      aiEnabled: true,
    });
    scope.stop();
  });
});
