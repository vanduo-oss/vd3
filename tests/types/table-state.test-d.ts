import { describe, expectTypeOf, it } from "vitest";
import {
  useTableState,
  type TableRow,
  type TableSort,
  type TableSortDir,
} from "../../src/composables/useTableState";
import type { DataTableColumn } from "../../src/components/VdDataTable.vue";

describe("table state public API (type lock)", () => {
  it("locks sort and column shapes", () => {
    expectTypeOf<TableSortDir>().toEqualTypeOf<"asc" | "desc" | "none">();
    expectTypeOf<TableSort>().toEqualTypeOf<{
      key: string;
      dir: TableSortDir;
    }>();
    expectTypeOf<DataTableColumn>().toMatchTypeOf<{
      key: string;
      label: string;
      sortable?: boolean;
    }>();
    expectTypeOf<TableRow>().toMatchTypeOf<Record<string, unknown>>();
  });

  it("locks useTableState member set", () => {
    expectTypeOf(useTableState).toBeFunction();
  });
});
