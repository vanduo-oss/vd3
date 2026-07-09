import { describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import VdTransfer from "../../src/components/VdTransfer.vue";

const ITEMS = [
  { id: "a", label: "Apple" },
  { id: "b", label: "Banana" },
  { id: "c", label: "Cherry" },
];

const mountTransfer = (): VueWrapper =>
  mount(VdTransfer, { props: { items: ITEMS } });

const sourcePanel = (wrapper: VueWrapper) =>
  wrapper.findAll(".vd-transfer-panel")[0];
const targetPanel = (wrapper: VueWrapper) =>
  wrapper.findAll(".vd-transfer-panel")[1];
const moveRightBtn = (wrapper: VueWrapper) =>
  wrapper.findAll(".vd-transfer-btn")[0];
const moveLeftBtn = (wrapper: VueWrapper) =>
  wrapper.findAll(".vd-transfer-btn")[1];

describe("VdTransfer", () => {
  it("renders the framework transfer DOM: two panels around the actions", () => {
    const wrapper = mountTransfer();
    expect(wrapper.classes()).toContain("vd-transfer");

    const panels = wrapper.findAll(".vd-transfer-panel");
    expect(panels).toHaveLength(2);
    expect(panels[0].get(".vd-transfer-header").text()).toContain("Source");
    expect(panels[1].get(".vd-transfer-header").text()).toContain("Target");

    // Each panel has a search box and a multiselect listbox.
    for (const panel of panels) {
      expect(panel.find(".vd-transfer-search input").exists()).toBe(true);
      const list = panel.get(".vd-transfer-list");
      expect(list.attributes("role")).toBe("listbox");
      expect(list.attributes("aria-multiselectable")).toBe("true");
    }

    const buttons = wrapper.get(".vd-transfer-actions").findAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].attributes("aria-label")).toBe("Move to target");
    expect(buttons[1].attributes("aria-label")).toBe("Move to source");
  });

  it("starts with all items in the source list and live selection counts", () => {
    const wrapper = mountTransfer();
    const items = sourcePanel(wrapper).findAll(".vd-transfer-item");
    expect(items.map((i) => i.text())).toEqual(["Apple", "Banana", "Cherry"]);
    expect(items[0].attributes("role")).toBe("option");
    expect(items[0].attributes("aria-selected")).toBe("false");

    const counts = wrapper.findAll(".vd-transfer-count");
    expect(counts[0].text()).toBe("0/3");
    expect(counts[0].attributes("aria-live")).toBe("polite");
    expect(counts[1].text()).toBe("0/0");
    expect(targetPanel(wrapper).findAll(".vd-transfer-item")).toHaveLength(0);
  });

  it("toggles is-selected / aria-selected / checkbox state on item click", async () => {
    const wrapper = mountTransfer();
    const item = sourcePanel(wrapper).findAll(".vd-transfer-item")[1];

    await item.trigger("click");
    expect(item.classes()).toContain("is-selected");
    expect(item.attributes("aria-selected")).toBe("true");
    expect(
      (item.get("input[type=checkbox]").element as HTMLInputElement).checked,
    ).toBe(true);
    expect(wrapper.findAll(".vd-transfer-count")[0].text()).toBe("1/3");

    await item.trigger("click");
    expect(item.classes()).not.toContain("is-selected");
    expect(item.attributes("aria-selected")).toBe("false");
    expect(wrapper.findAll(".vd-transfer-count")[0].text()).toBe("0/3");
  });

  it("disables the move buttons until the corresponding panel has a selection", async () => {
    const wrapper = mountTransfer();
    expect(moveRightBtn(wrapper).attributes("disabled")).toBeDefined();
    expect(moveLeftBtn(wrapper).attributes("disabled")).toBeDefined();

    await sourcePanel(wrapper).findAll(".vd-transfer-item")[0].trigger("click");
    expect(moveRightBtn(wrapper).attributes("disabled")).toBeUndefined();
    expect(moveLeftBtn(wrapper).attributes("disabled")).toBeDefined();
  });

  it("moves selected items right, clears the selection, and fires transfer:change", async () => {
    const wrapper = mountTransfer();
    const events: CustomEvent[] = [];
    wrapper.element.addEventListener("transfer:change", (e: Event) =>
      events.push(e as CustomEvent),
    );

    const items = sourcePanel(wrapper).findAll(".vd-transfer-item");
    await items[0].trigger("click"); // Apple
    await items[2].trigger("click"); // Cherry
    await moveRightBtn(wrapper).trigger("click");

    expect(
      sourcePanel(wrapper)
        .findAll(".vd-transfer-item")
        .map((i) => i.text()),
    ).toEqual(["Banana"]);
    expect(
      targetPanel(wrapper)
        .findAll(".vd-transfer-item")
        .map((i) => i.text()),
    ).toEqual(["Apple", "Cherry"]);
    // Selection resets after the move.
    expect(wrapper.findAll(".vd-transfer-count")[0].text()).toBe("0/1");
    expect(wrapper.findAll(".vd-transfer-count")[1].text()).toBe("0/2");

    // Documented event detail shape: { selected, available }.
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({
      selected: ["a", "c"],
      available: ["b"],
    });
  });

  it("moves items back left and reports the new detail", async () => {
    const wrapper = mountTransfer();
    const events: CustomEvent[] = [];
    wrapper.element.addEventListener("transfer:change", (e: Event) =>
      events.push(e as CustomEvent),
    );

    await sourcePanel(wrapper).findAll(".vd-transfer-item")[0].trigger("click");
    await moveRightBtn(wrapper).trigger("click");
    await targetPanel(wrapper).findAll(".vd-transfer-item")[0].trigger("click");
    await moveLeftBtn(wrapper).trigger("click");

    expect(sourcePanel(wrapper).findAll(".vd-transfer-item")).toHaveLength(3);
    expect(targetPanel(wrapper).findAll(".vd-transfer-item")).toHaveLength(0);
    expect(events[1].detail).toEqual({
      selected: [],
      available: ["b", "c", "a"],
    });
  });

  it("filters each list from its search input", async () => {
    const wrapper = mountTransfer();
    await sourcePanel(wrapper).get(".vd-transfer-search input").setValue("an");
    expect(
      sourcePanel(wrapper)
        .findAll(".vd-transfer-item")
        .map((i) => i.text()),
    ).toEqual(["Banana"]);

    // Clearing the filter restores the full list.
    await sourcePanel(wrapper).get(".vd-transfer-search input").setValue("");
    expect(sourcePanel(wrapper).findAll(".vd-transfer-item")).toHaveLength(3);
  });

  it("exposes getSelected() returning the target ids", async () => {
    const wrapper = mountTransfer();
    const vm = wrapper.vm as unknown as { getSelected: () => string[] };
    expect(vm.getSelected()).toEqual([]);

    await sourcePanel(wrapper).findAll(".vd-transfer-item")[1].trigger("click");
    await moveRightBtn(wrapper).trigger("click");
    expect(vm.getSelected()).toEqual(["b"]);
  });
});
