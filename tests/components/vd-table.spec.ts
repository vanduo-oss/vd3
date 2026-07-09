import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdTable from "../../src/components/VdTable.vue";

const columns = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
] as const;

const rows = [
  { name: "Ada", role: "Founder" },
  { name: "Grace", role: "Admiral" },
];

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdTable, { props: { columns, rows, ...props } });

describe("VdTable", () => {
  it("wraps a table.vd-table inside a .vd-table-responsive container", () => {
    const wrapper = factory();
    expect(wrapper.classes()).toContain("vd-table-responsive");
    const table = wrapper.get("table");
    expect(table.classes()).toContain("vd-table");
  });

  it("renders one header cell per column and one body row per datum", () => {
    const wrapper = factory();
    const headers = wrapper.findAll("thead th");
    expect(headers.map((h) => h.text())).toEqual(["Name", "Role"]);
    headers.forEach((h) => expect(h.attributes("scope")).toBe("col"));

    const bodyRows = wrapper.findAll("tbody tr");
    expect(bodyRows).toHaveLength(2);
    expect(bodyRows[0].findAll("td").map((c) => c.text())).toEqual([
      "Ada",
      "Founder",
    ]);
    expect(bodyRows[1].findAll("td").map((c) => c.text())).toEqual([
      "Grace",
      "Admiral",
    ]);
  });

  it("applies no modifier classes by default", () => {
    expect(factory().get("table").classes()).toEqual(["vd-table"]);
  });

  it.each([
    ["striped", "vd-table-striped"],
    ["bordered", "vd-table-bordered"],
    ["hover", "vd-table-hover"],
  ] as const)("maps the %s prop to the %s class", (prop, cls) => {
    const wrapper = factory({ [prop]: true });
    expect(wrapper.get("table").classes()).toContain(cls);
  });

  it("renders a caption element only when a caption is provided", () => {
    expect(factory().find(".vd-table-caption").exists()).toBe(false);

    const captioned = factory({ caption: "Crew roster" });
    expect(captioned.get("caption.vd-table-caption").text()).toBe(
      "Crew roster",
    );
  });
});
