import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdDataTable from "../../src/components/VdDataTable.vue";
import type { DataTableColumn } from "../../src/components/VdDataTable.vue";

const columns: DataTableColumn[] = [
  { key: "name", label: "Name", sortable: true, variant: "primary" },
  { key: "role", label: "Role", align: "center", width: "8rem" },
];

const rows = [
  { id: "1", name: "Ada", role: "Founder" },
  { id: "2", name: "Grace", role: "Admiral" },
  { id: "3", name: "Alan", role: "Cryptanalyst" },
  { id: "4", name: "Ken", role: "Unix" },
];

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdDataTable, { props: { columns, rows, pageSize: 2, ...props } });

describe("VdDataTable", () => {
  it("renders a vd-table with caption, modifiers, and column variant", () => {
    const wrapper = factory({
      striped: true,
      bordered: true,
      hover: true,
      sm: true,
      caption: "Crew",
    });
    expect(wrapper.classes()).toContain("vd-data-table");
    const table = wrapper.get("table");
    expect(table.classes()).toEqual(
      expect.arrayContaining([
        "vd-table",
        "vd-table-striped",
        "vd-table-bordered",
        "vd-table-hover",
        "vd-table-sm",
      ]),
    );
    expect(wrapper.get("caption").text()).toBe("Crew");
    expect(wrapper.get("th.vd-table-primary").text()).toContain("Name");
  });

  it("sorts on header click and sets aria-sort", async () => {
    const wrapper = factory();
    const sortBtn = wrapper.get("button.vd-data-table-sort");
    expect(wrapper.get("th[aria-sort]").attributes("aria-sort")).toBe("none");

    await sortBtn.trigger("click");
    expect(wrapper.emitted("update:sort")!.at(-1)?.[0]).toEqual({
      key: "name",
      dir: "asc",
    });
    expect(wrapper.get("th[aria-sort='ascending']")).toBeTruthy();
    expect(wrapper.findAll("tbody tr td")[0]!.text()).toBe("Ada");

    await sortBtn.trigger("click");
    expect(wrapper.get("th[aria-sort='descending']")).toBeTruthy();

    await sortBtn.trigger("click");
    expect(wrapper.emitted("update:sort")!.at(-1)?.[0]).toEqual({
      key: "",
      dir: "none",
    });
  });

  it("goes from none back to asc when the parent restores the same key", async () => {
    const wrapper = factory({ sort: { key: "name", dir: "none" } });
    await wrapper.get("button.vd-data-table-sort").trigger("click");
    expect(wrapper.emitted("update:sort")!.at(-1)?.[0]).toEqual({
      key: "name",
      dir: "asc",
    });
  });

  it("does not sort a non-sortable column", async () => {
    const wrapper = factory();
    const roleHeader = wrapper.findAll("th")[1]!;
    expect(roleHeader.attributes("aria-sort")).toBeUndefined();
    await roleHeader.trigger("click");
    expect(wrapper.emitted("update:sort")).toBeUndefined();
  });

  it("selects multiple rows and select-all", async () => {
    const wrapper = factory({ selectable: "multiple" });
    const selectAll = wrapper.get('th input[type="checkbox"]');
    await selectAll.trigger("change");
    expect(wrapper.emitted("update:selected")!.at(-1)?.[0]).toEqual(["1", "2"]);

    const rowBoxes = wrapper.findAll("tbody input[type='checkbox']");
    await rowBoxes[0]!.setValue(false);
    expect(
      (wrapper.emitted("update:selected")!.at(-1)?.[0] as string[]).includes(
        "1",
      ),
    ).toBe(false);
  });

  it("selects a single row at a time", async () => {
    const wrapper = factory({ selectable: "single" });
    expect(wrapper.find('th input[type="checkbox"]').exists()).toBe(false);
    const boxes = wrapper.findAll("tbody input[type='checkbox']");
    await boxes[0]!.setValue(true);
    expect(wrapper.emitted("update:selected")!.at(-1)?.[0]).toEqual(["1"]);
    await boxes[1]!.setValue(true);
    expect(wrapper.emitted("update:selected")!.at(-1)?.[0]).toEqual(["2"]);
    await boxes[1]!.setValue(false);
    expect(wrapper.emitted("update:selected")!.at(-1)?.[0]).toEqual([]);
  });

  it("renders cell and header slots and emits row-click", async () => {
    const wrapper = mount(VdDataTable, {
      props: { columns, rows, pageSize: 10 },
      slots: {
        "cell-name": `<span class="custom-cell">{{ row.name }}*</span>`,
        "header-name": `<span class="custom-head">NOM</span>`,
      },
    });
    expect(wrapper.get(".custom-head").text()).toBe("NOM");
    expect(wrapper.get(".custom-cell").text()).toBe("Ada*");
    await wrapper.findAll("tbody tr")[0]!.trigger("click");
    expect(wrapper.emitted("row-click")![0]![0]).toEqual(rows[0]);
  });

  it("shows search, filters, and paginates", async () => {
    const wrapper = factory({ searchable: true });
    const search = wrapper.get('input[name="table-search"]');
    await search.setValue("Grace");
    expect(wrapper.emitted("update:search")!.at(-1)?.[0]).toBe("Grace");
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
    expect(wrapper.text()).toContain("Grace");
  });

  it("shows empty and loading states", () => {
    const empty = factory({ rows: [] });
    expect(empty.get(".vd-empty-title").text()).toBe("No results");

    const loading = factory({ loading: true });
    expect(loading.find(".vd-skeleton").exists()).toBe(true);

    const loadingSelect = factory({ loading: true, selectable: "multiple" });
    expect(loadingSelect.findAll("tbody tr")[0]!.findAll("td")).toHaveLength(3);
  });

  it("renders toolbar, empty, loading, and footer slots", () => {
    const wrapper = mount(VdDataTable, {
      props: { columns, rows: [], loading: false },
      slots: {
        toolbar: '<span id="tb">Tools</span>',
        empty: '<span id="em">None</span>',
        footer: '<span id="ft">Foot</span>',
      },
    });
    expect(wrapper.get("#tb").text()).toBe("Tools");
    expect(wrapper.get("#em").text()).toBe("None");
    expect(wrapper.get("#ft").text()).toBe("Foot");

    const loading = mount(VdDataTable, {
      props: { columns, rows, loading: true },
      slots: { loading: '<tr id="ld"><td>Wait</td></tr>' },
    });
    expect(loading.get("#ld").text()).toBe("Wait");
  });

  it("uses a function rowKey and stringifies null cells", async () => {
    const wrapper = mount(VdDataTable, {
      props: {
        columns: [{ key: "note", label: "Note" }],
        rows: [{ note: null }, { note: "x" }],
        pageSize: 10,
        rowKey: (_row: Record<string, unknown>, index: number) => `r${index}`,
        selectable: "multiple",
      },
    });
    expect(wrapper.findAll("tbody tr")).toHaveLength(2);
    expect(wrapper.findAll("tbody td")[1]!.text()).toBe("");
    await wrapper.get('th input[type="checkbox"]').trigger("change");
    expect(wrapper.emitted("update:selected")!.at(-1)?.[0]).toEqual([
      "r0",
      "r1",
    ]);
  });

  it("applies maxHeight and falls back to the row index when id is missing", () => {
    const wrapper = mount(VdDataTable, {
      props: {
        columns,
        rows: [{ name: "NoId", role: "X" }],
        pageSize: 10,
        maxHeight: "12rem",
        selectable: "multiple",
      },
    });
    expect(wrapper.get(".vd-data-table-scroll").attributes("style")).toContain(
      "12rem",
    );
    expect(wrapper.get("tbody .vd-form-check-label").text()).toContain(
      "Select row 0",
    );
  });

  it("syncs incoming page, search, sort, and selected props", async () => {
    const wrapper = factory({
      page: 1,
      search: "",
      sort: { key: "", dir: "none" },
      selected: [],
      selectable: "multiple",
      searchable: true,
    });
    await wrapper.get(".vd-pagination-next a").trigger("click");
    await wrapper.setProps({ page: 2 });
    expect(wrapper.find("li.active").text()).toBe("2");

    await wrapper.setProps({ page: 1, selected: ["1"] });
    expect(
      (wrapper.find("tbody input[type='checkbox']").element as HTMLInputElement)
        .checked,
    ).toBe(true);

    await wrapper.setProps({ search: "Ada" });
    expect(wrapper.text()).toContain("Ada");

    await wrapper.get('input[name="table-search"]').setValue("Ken");
    await wrapper.setProps({ search: "Ken" });
    expect(wrapper.text()).toContain("Ken");

    await wrapper.setProps({ sort: { key: "name", dir: "desc" } });
    expect(wrapper.get("th[aria-sort='descending']")).toBeTruthy();
    await wrapper.setProps({ sort: { key: "name", dir: "desc" } });
    await wrapper.setProps({ selected: ["1"] });
  });

  it("counts the select column in the empty-state colspan", () => {
    const wrapper = factory({ rows: [], selectable: "multiple" });
    expect(wrapper.get("td").attributes("colspan")).toBe("3");
  });

  it("renders pagination when there is more than one page", async () => {
    const wrapper = factory();
    expect(wrapper.find(".vd-pagination").exists()).toBe(true);
    await wrapper.get(".vd-pagination-next a").trigger("click");
    expect(wrapper.emitted("update:page")!.at(-1)?.[0]).toBe(2);
  });
});
