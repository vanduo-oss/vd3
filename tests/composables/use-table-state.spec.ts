import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { useTableState } from "../../src/composables/useTableState";

type Row = { id: string; name: string; age: number; note?: string | null };

const eight: Row[] = [
  { id: "1", name: "Zoe", age: 40 },
  { id: "2", name: "Ada", age: 36 },
  { id: "3", name: "Grace", age: 85 },
  { id: "4", name: "Alan", age: 41 },
  { id: "5", name: "Edsger", age: 72 },
  { id: "6", name: "Barbara", age: 66 },
  { id: "7", name: "Donald", age: 88 },
  { id: "8", name: "Ken", age: 70 },
];

describe("useTableState", () => {
  it("filters, then sorts, then pages", () => {
    const rows = ref(eight);
    const state = useTableState({
      rows,
      getRowId: (row) => row.id,
      pageSize: 2,
      searchKeys: ["name"],
    });
    state.search.value = "a";
    state.sort.value = { key: "name", dir: "asc" };
    state.page.value = 1;
    // Ada, Alan, Barbara, Barbara? names containing "a": Ada, Grace, Alan, Barbara, Donald
    expect(state.viewRows.value.map((r) => r.name)).toEqual(["Ada", "Alan"]);
    expect(state.total.value).toBe(5);
    expect(state.totalPages.value).toBe(3);
  });

  it("skips the pipeline in manual mode even when search/sort change", () => {
    const rows = ref(eight.slice(0, 3));
    const manual = ref(true);
    const state = useTableState({
      rows,
      getRowId: (row) => row.id,
      pageSize: 1,
      manual,
    });
    state.search.value = "zzzz";
    state.sort.value = { key: "name", dir: "desc" };
    expect(state.viewRows.value).toHaveLength(3);
    expect(state.viewRows.value[0]!.name).toBe("Zoe");
  });

  it("toggles selection and toggleAll on the visible page", () => {
    const state = useTableState({
      rows: () => eight,
      getRowId: (row) => row.id,
      pageSize: 2,
    });
    expect(state.allVisibleSelected.value).toBe(false);
    state.toggle("1");
    expect(state.selectedIds.value).toEqual(["1"]);
    expect(state.someVisibleSelected.value).toBe(true);
    state.toggle("1");
    expect(state.selectedIds.value).toEqual([]);

    state.toggleAll();
    expect(state.selectedIds.value).toEqual(["1", "2"]);
    expect(state.allVisibleSelected.value).toBe(true);
    state.toggleAll();
    expect(state.selectedIds.value).toEqual([]);
  });

  it("keeps off-page selection when toggleAll selects only visible rows", () => {
    const state = useTableState({
      rows: ref(eight),
      getRowId: (row) => row.id,
      pageSize: 2,
    });
    state.selectedIds.value = ["8"];
    state.toggleAll();
    expect(state.selectedIds.value).toEqual(["8", "1", "2"]);
  });

  it("sorts numbers and stringifies nullish cells", () => {
    const rows = ref<Row[]>([
      { id: "a", name: "a", age: 2, note: null },
      { id: "b", name: "b", age: 10, note: "hi" },
    ]);
    const state = useTableState({
      rows,
      getRowId: (row) => row.id,
      pageSize: 10,
    });
    state.sort.value = { key: "age", dir: "desc" };
    expect(state.viewRows.value.map((r) => r.id)).toEqual(["b", "a"]);
    state.search.value = "hi";
    expect(state.viewRows.value.map((r) => r.id)).toEqual(["b"]);
  });

  it("clamps page when the filtered set shrinks", async () => {
    const state = useTableState({
      rows: ref(eight),
      getRowId: (row) => row.id,
      pageSize: 2,
    });
    state.page.value = 4;
    expect(state.viewRows.value).toHaveLength(2);
    state.search.value = "Zoe";
    await nextTick();
    expect(state.page.value).toBe(1);
  });

  it("treats a zero pageSize ref as the fallback and still pages", () => {
    const pageSize = ref(0);
    const state = useTableState({
      rows: ref(eight),
      getRowId: (row) => row.id,
      pageSize,
    });
    expect(state.viewRows.value.length).toBeGreaterThan(0);
  });

  it("accepts searchKeys as a ref or getter", () => {
    const keys = ref<string[]>(["name"]);
    const fromRef = useTableState({
      rows: ref(eight),
      getRowId: (row) => row.id,
      searchKeys: keys,
      pageSize: 10,
    });
    fromRef.search.value = "Ken";
    expect(fromRef.viewRows.value).toHaveLength(1);

    const fromFn = useTableState({
      rows: ref(eight),
      getRowId: (row) => row.id,
      searchKeys: () => ["name"],
      pageSize: 10,
    });
    fromFn.search.value = "Ken";
    expect(fromFn.viewRows.value).toHaveLength(1);
  });

  it("does not sort when dir is none", () => {
    const state = useTableState({
      rows: ref(eight),
      getRowId: (row) => row.id,
      pageSize: 10,
    });
    state.sort.value = { key: "name", dir: "none" };
    expect(state.viewRows.value[0]!.name).toBe("Zoe");
  });

  it("boolean manual false uses the client pipeline", () => {
    const state = useTableState({
      rows: ref(eight),
      getRowId: (row) => row.id,
      pageSize: 3,
      manual: false,
    });
    expect(state.viewRows.value).toHaveLength(3);
  });

  it("defaults pageSize to 10 when omitted", () => {
    const state = useTableState({
      rows: ref(eight),
      getRowId: (row) => row.id,
    });
    expect(state.viewRows.value).toHaveLength(8);
    expect(state.totalPages.value).toBe(1);
  });
});
