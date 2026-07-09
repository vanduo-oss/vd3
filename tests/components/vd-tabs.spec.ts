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
  it("renders a role=tablist with one role=tab button per tab", () => {
    const wrapper = factory();
    expect(wrapper.classes()).toContain("vd-tabs");
    expect(wrapper.attributes("role")).toBe("tablist");
    expect(wrapper.find(".vd-tab-list").exists()).toBe(true);

    const buttons = wrapper.findAll(".vd-tab");
    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => b.text())).toEqual(["One", "Two", "Three"]);
    buttons.forEach((b) => {
      expect(b.attributes("role")).toBe("tab");
      expect(b.attributes("type")).toBe("button");
    });
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
