import { computed, ref, watch, type Ref } from "vue";

export type TableSortDir = "asc" | "desc" | "none";

export interface TableSort {
  key: string;
  dir: TableSortDir;
}

export interface TableRow {
  [key: string]: unknown;
}

export interface UseTableStateOptions<T extends TableRow = TableRow> {
  rows: Ref<readonly T[]> | (() => readonly T[]);
  getRowId: (row: T, index: number) => string;
  pageSize?: Ref<number> | number;
  searchKeys?:
    | readonly string[]
    | Ref<readonly string[] | undefined>
    | (() => readonly string[] | undefined);
  manual?: Ref<boolean> | boolean;
}

export interface UseTableStateReturn<T extends TableRow = TableRow> {
  viewRows: Ref<T[]>;
  total: Ref<number>;
  totalPages: Ref<number>;
  page: Ref<number>;
  search: Ref<string>;
  sort: Ref<TableSort>;
  selectedIds: Ref<string[]>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  allVisibleSelected: Ref<boolean>;
  someVisibleSelected: Ref<boolean>;
}

const unwrapNumber = (value: Ref<number> | number, fallback: number): number =>
  typeof value === "number" ? value : value.value || fallback;

const unwrapBool = (value: Ref<boolean> | boolean | undefined): boolean => {
  if (value === undefined) return false;
  return typeof value === "boolean" ? value : value.value;
};

const readRows = <T>(
  rows: Ref<readonly T[]> | (() => readonly T[]),
): readonly T[] => (typeof rows === "function" ? rows() : rows.value);

const cellText = (value: unknown): string => {
  if (value == null) return "";
  return String(value);
};

const compareValues = (a: unknown, b: unknown): number => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return cellText(a).localeCompare(cellText(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

/**
 * Headless table pipeline: search → sort → page, plus row selection.
 * SSR-safe (no window/document). Pass `manual: true` when the parent
 * already sliced the rows (server-side).
 */
export function useTableState<T extends TableRow = TableRow>(
  options: UseTableStateOptions<T>,
): UseTableStateReturn<T> {
  const page = ref(1);
  const search = ref("");
  const sort = ref<TableSort>({ key: "", dir: "none" });
  const selectedIds = ref<string[]>([]);

  const resolvedPageSize = computed(() =>
    unwrapNumber(options.pageSize ?? 10, 10),
  );

  const filteredSorted = computed(() => {
    const source = [...readRows(options.rows)];
    if (unwrapBool(options.manual)) return source;

    const q = search.value.trim().toLowerCase();
    const rawKeys = options.searchKeys;
    const keys =
      typeof rawKeys === "function"
        ? rawKeys()
        : rawKeys && typeof rawKeys === "object" && "value" in rawKeys
          ? rawKeys.value
          : rawKeys;
    let next = source;
    if (q) {
      next = next.filter((row) => {
        const scan = keys?.length
          ? keys.map((k) => cellText(row[k]))
          : Object.values(row).map(cellText);
        return scan.some((text) => text.toLowerCase().includes(q));
      });
    }

    const { key, dir } = sort.value;
    if (key && dir !== "none") {
      next = [...next].sort((a, b) => {
        const result = compareValues(a[key], b[key]);
        return dir === "desc" ? -result : result;
      });
    }
    return next;
  });

  const total = computed(() => filteredSorted.value.length);
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(total.value / Math.max(1, resolvedPageSize.value))),
  );

  const viewRows = computed(() => {
    if (unwrapBool(options.manual)) return filteredSorted.value as T[];
    const size = Math.max(1, resolvedPageSize.value);
    const current = Math.min(Math.max(1, page.value), totalPages.value);
    const start = (current - 1) * size;
    return filteredSorted.value.slice(start, start + size) as T[];
  });

  const visibleIds = computed(() =>
    viewRows.value.map((row, index) => options.getRowId(row, index)),
  );

  const allVisibleSelected = computed(
    () =>
      visibleIds.value.length > 0 &&
      visibleIds.value.every((id) => selectedIds.value.includes(id)),
  );

  const someVisibleSelected = computed(
    () =>
      !allVisibleSelected.value &&
      visibleIds.value.some((id) => selectedIds.value.includes(id)),
  );

  watch(totalPages, (pages) => {
    if (page.value > pages) page.value = pages;
  });

  const toggle = (id: string): void => {
    const next = [...selectedIds.value];
    const idx = next.indexOf(id);
    if (idx === -1) next.push(id);
    else next.splice(idx, 1);
    selectedIds.value = next;
  };

  const toggleAll = (): void => {
    if (allVisibleSelected.value) {
      selectedIds.value = selectedIds.value.filter(
        (id) => !visibleIds.value.includes(id),
      );
      return;
    }
    const merged = new Set(selectedIds.value);
    for (const id of visibleIds.value) merged.add(id);
    selectedIds.value = [...merged];
  };

  return {
    viewRows,
    total,
    totalPages,
    page,
    search,
    sort,
    selectedIds,
    toggle,
    toggleAll,
    allVisibleSelected,
    someVisibleSelected,
  };
}
