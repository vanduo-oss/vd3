<script setup lang="ts">
import { computed, watch } from "vue";
import VdCheckbox from "./VdCheckbox.vue";
import VdEmptyState from "./VdEmptyState.vue";
import VdIcon from "./VdIcon.vue";
import VdInput from "./VdInput.vue";
import VdPagination from "./VdPagination.vue";
import VdSkeleton from "./VdSkeleton.vue";
import {
  useTableState,
  type TableRow,
  type TableSort,
} from "../composables/useTableState";

export type { TableRow, TableSort };

export type DataTableSelectable = "none" | "single" | "multiple";
export type DataTableAlign = "left" | "center" | "right";
export type DataTableVariant =
  "primary" | "secondary" | "success" | "warning" | "error" | "info";

export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: DataTableAlign;
  width?: string;
  variant?: DataTableVariant;
}

interface Props {
  columns: readonly DataTableColumn[];
  rows: readonly TableRow[];
  striped?: boolean;
  bordered?: boolean;
  hover?: boolean;
  sm?: boolean;
  caption?: string;
  rowKey?: string | ((row: TableRow, index: number) => string);
  selectable?: DataTableSelectable;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: TableSort;
  selected?: readonly string[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: readonly string[];
  manual?: boolean;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  maxHeight?: string;
}

const props = withDefaults(defineProps<Props>(), {
  striped: false,
  bordered: false,
  hover: false,
  sm: false,
  caption: "",
  rowKey: "id",
  selectable: "none",
  page: 1,
  pageSize: 10,
  search: "",
  sort: () => ({ key: "", dir: "none" as const }),
  selected: () => [],
  searchable: false,
  searchPlaceholder: "Search",
  searchKeys: undefined,
  manual: false,
  loading: false,
  emptyTitle: "No results",
  emptyDescription: "",
  maxHeight: "",
});

const emit = defineEmits<{
  "update:page": [value: number];
  "update:search": [value: string];
  "update:sort": [value: TableSort];
  "update:selected": [value: string[]];
  "row-click": [row: TableRow];
}>();

const getRowId = (row: TableRow, index: number): string => {
  if (typeof props.rowKey === "function") return props.rowKey(row, index);
  const value = row[props.rowKey];
  return value == null ? String(index) : String(value);
};

const {
  viewRows,
  totalPages,
  page,
  search,
  sort,
  selectedIds,
  toggle,
  toggleAll,
  allVisibleSelected,
  someVisibleSelected,
} = useTableState({
  rows: () => props.rows,
  getRowId,
  pageSize: computed(() => props.pageSize),
  searchKeys: () => props.searchKeys,
  manual: computed(() => props.manual),
});

page.value = props.page;
search.value = props.search;
sort.value = { ...props.sort };
selectedIds.value = [...props.selected];

watch(page, (value) => emit("update:page", value));
watch(search, (value) => emit("update:search", value));
watch(sort, (value) => emit("update:sort", { ...value }), { deep: true });
watch(selectedIds, (value) => emit("update:selected", [...value]));

watch(
  () => props.page,
  (value) => {
    if (value !== page.value) page.value = value;
  },
);
watch(
  () => props.search,
  (value) => {
    if (value !== search.value) search.value = value;
  },
);
watch(
  () => props.sort,
  (value) => {
    if (value.key !== sort.value.key || value.dir !== sort.value.dir) {
      sort.value = { ...value };
    }
  },
  { deep: true },
);
watch(
  () => props.selected,
  (value) => {
    const next = [...value];
    if (
      next.length !== selectedIds.value.length ||
      next.some((id, i) => id !== selectedIds.value[i])
    ) {
      selectedIds.value = next;
    }
  },
);

const colCount = computed(
  () => props.columns.length + (props.selectable === "none" ? 0 : 1),
);
const skeletonCount = computed(() => Math.min(props.pageSize, 8));
const showSelect = computed(() => props.selectable !== "none");
const showSelectAll = computed(() => props.selectable === "multiple");

const ariaSort = (
  key: string,
): "ascending" | "descending" | "none" | undefined => {
  const col = props.columns.find((c) => c.key === key);
  if (!col?.sortable) return undefined;
  if (sort.value.key !== key || sort.value.dir === "none") return "none";
  return sort.value.dir === "desc" ? "descending" : "ascending";
};

const onSort = (key: string): void => {
  if (sort.value.key !== key) {
    sort.value = { key, dir: "asc" };
    return;
  }
  if (sort.value.dir === "asc") sort.value = { key, dir: "desc" };
  else if (sort.value.dir === "desc") sort.value = { key: "", dir: "none" };
  else sort.value = { key, dir: "asc" };
};

const onToggleRow = (id: string): void => {
  if (props.selectable === "single") {
    selectedIds.value = selectedIds.value[0] === id ? [] : [id];
    return;
  }
  toggle(id);
};

const isSelected = (id: string): boolean => selectedIds.value.includes(id);

const cellText = (value: unknown): string =>
  value == null ? "" : String(value);

const cellStyle = (
  col: DataTableColumn,
): Record<string, string> | undefined => {
  const style: Record<string, string> = {};
  if (col.width) style.width = col.width;
  if (col.align) style.textAlign = col.align;
  return Object.keys(style).length ? style : undefined;
};
</script>

<template>
  <div class="vd-data-table">
    <div v-if="$slots.toolbar || searchable" class="vd-data-table-toolbar">
      <slot name="toolbar" />
      <VdInput
        v-if="searchable"
        v-model="search"
        type="search"
        :placeholder="searchPlaceholder"
        label="Search"
        name="table-search"
        class="vd-data-table-search"
      />
    </div>
    <div
      class="vd-table-responsive vd-data-table-scroll"
      :style="maxHeight ? { maxHeight } : undefined"
    >
      <table
        class="vd-table"
        :class="{
          'vd-table-striped': striped,
          'vd-table-bordered': bordered,
          'vd-table-hover': hover,
          'vd-table-sm': sm,
        }"
      >
        <caption v-if="caption" class="vd-table-caption">
          {{
            caption
          }}
        </caption>
        <thead class="vd-table-header">
          <tr>
            <th v-if="showSelect" class="vd-data-table-select" scope="col">
              <input
                v-if="showSelectAll"
                type="checkbox"
                class="vd-form-check-input"
                :checked="allVisibleSelected"
                :indeterminate="someVisibleSelected"
                aria-label="Select all rows"
                @change="toggleAll"
              />
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              :class="col.variant ? `vd-table-${col.variant}` : null"
              :style="cellStyle(col)"
              :aria-sort="ariaSort(col.key)"
            >
              <slot :name="`header-${col.key}`" :column="col">
                <button
                  v-if="col.sortable"
                  type="button"
                  class="vd-data-table-sort"
                  @click="onSort(col.key)"
                >
                  {{ col.label }}
                  <VdIcon
                    :name="
                      ariaSort(col.key) === 'descending'
                        ? 'caret-down'
                        : 'caret-up'
                    "
                    size="sm"
                  />
                </button>
                <template v-else>{{ col.label }}</template>
              </slot>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <slot name="loading">
              <tr v-for="n in skeletonCount" :key="`sk-${n}`">
                <td v-if="showSelect" />
                <td v-for="col in columns" :key="col.key">
                  <VdSkeleton />
                </td>
              </tr>
            </slot>
          </template>
          <tr v-else-if="!viewRows.length">
            <td :colspan="colCount">
              <slot name="empty">
                <VdEmptyState
                  icon="table"
                  :title="emptyTitle"
                  :description="emptyDescription"
                />
              </slot>
            </td>
          </tr>
          <tr
            v-else
            v-for="(row, rowIdx) in viewRows"
            :key="getRowId(row, rowIdx)"
            :class="{ 'vd-table-active': isSelected(getRowId(row, rowIdx)) }"
            @click="emit('row-click', row)"
          >
            <td v-if="showSelect" class="vd-data-table-select">
              <VdCheckbox
                :model-value="isSelected(getRowId(row, rowIdx))"
                :label="`Select row ${getRowId(row, rowIdx)}`"
                @update:model-value="onToggleRow(getRowId(row, rowIdx))"
              />
            </td>
            <td v-for="col in columns" :key="col.key" :style="cellStyle(col)">
              <slot
                :name="`cell-${col.key}`"
                :row="row"
                :column="col"
                :value="row[col.key]"
              >
                {{ cellText(row[col.key]) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="$slots.footer || totalPages > 1" class="vd-data-table-footer">
      <slot name="footer">
        <VdPagination
          v-if="totalPages > 1"
          v-model="page"
          :total="totalPages"
          align="center"
        />
      </slot>
    </div>
  </div>
</template>
