import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdTabs from "../../src/components/VdTabs.vue";

const tabs = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
  { id: "three", label: "Three" },
];

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdTabs, {
    props: { tabs, modelValue: "one", ...props },
    slots: { default: '<p class="panel">Panel body</p>' },
  });

describe("VdTabs", () => {
  it("renders role=tablist on the tab buttons' direct parent, not the root", () => {
    const wrapper = factory();
    expect(wrapper.classes()).toContain("vd-tabs");
    // role=tablist belongs on the direct parent of the tabs, not the outer div.
    expect(wrapper.attributes("role")).toBeUndefined();
    const list = wrapper.get(".vd-tab-list");
    expect(list.attributes("role")).toBe("tablist");

    const buttons = wrapper.findAll(".vd-tab");
    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => b.text())).toEqual(["One", "Two", "Three"]);
    buttons.forEach((b) => {
      expect(b.attributes("role")).toBe("tab");
      expect(b.attributes("type")).toBe("button");
    });
  });

  it("wires WAI-ARIA tab/tabpanel relationships and roving tabindex", () => {
    const wrapper = factory({ modelValue: "two" });
    const buttons = wrapper.findAll(".vd-tab");
    const panel = wrapper.get(".vd-tab-panels");

    // The panel is a tabpanel labelled by the active tab; each tab controls it.
    expect(panel.attributes("role")).toBe("tabpanel");
    const activeId = buttons[1].attributes("id");
    expect(activeId).toBeTruthy();
    expect(panel.attributes("aria-labelledby")).toBe(activeId);
    const panelId = panel.attributes("id");
    buttons.forEach((b) => expect(b.attributes("aria-controls")).toBe(panelId));

    // Roving tabindex: only the active tab is a tab stop.
    expect(buttons[0].attributes("tabindex")).toBe("-1");
    expect(buttons[1].attributes("tabindex")).toBe("0");
    expect(buttons[2].attributes("tabindex")).toBe("-1");
  });

  it("moves selection and focus with arrow keys and Home/End", async () => {
    const wrapper = mount(VdTabs, {
      props: { tabs, modelValue: "one" },
      slots: { default: '<p class="panel">Panel body</p>' },
      attachTo: document.body,
    });
    const buttons = () => wrapper.findAll(".vd-tab");

    await buttons()[0].trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["two"]);
    expect(document.activeElement).toBe(buttons()[1].element);

    // ArrowLeft from the first wraps to the last.
    await wrapper.setProps({ modelValue: "one" });
    await buttons()[0].trigger("keydown", { key: "ArrowLeft" });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["three"]);
    expect(document.activeElement).toBe(buttons()[2].element);

    // End jumps to the last, Home to the first.
    await wrapper.setProps({ modelValue: "one" });
    await buttons()[0].trigger("keydown", { key: "End" });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["three"]);

    await wrapper.setProps({ modelValue: "three" });
    await buttons()[2].trigger("keydown", { key: "Home" });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["one"]);

    wrapper.unmount();
  });

  it("marks the modelValue tab active via is-active and aria-selected", () => {
    const buttons = factory({ modelValue: "two" }).findAll(".vd-tab");
    expect(buttons[0].classes()).not.toContain("is-active");
    expect(buttons[0].attributes("aria-selected")).toBe("false");
    expect(buttons[1].classes()).toContain("is-active");
    expect(buttons[1].attributes("aria-selected")).toBe("true");
  });

  it("emits update:modelValue when an inactive tab is clicked (v-model round-trip)", async () => {
    const wrapper = factory({ modelValue: "one" });
    await wrapper.findAll(".vd-tab")[2].trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["three"]]);
  });

  it("does not emit when the already-active tab is clicked", async () => {
    const wrapper = factory({ modelValue: "one" });
    await wrapper.findAll(".vd-tab")[0].trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("renders default slot content inside .vd-tab-panels", () => {
    const panels = factory().get(".vd-tab-panels");
    expect(panels.get(".panel").text()).toBe("Panel body");
  });
});
