import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdEmptyState from "../../src/components/VdEmptyState.vue";

describe("VdEmptyState", () => {
  it("renders a vd-empty root", () => {
    const wrapper = mount(VdEmptyState);
    expect(wrapper.classes()).toContain("vd-empty");
    expect(wrapper.find(".vd-empty-icon").exists()).toBe(false);
    expect(wrapper.find(".vd-empty-title").exists()).toBe(false);
    expect(wrapper.find(".vd-empty-description").exists()).toBe(false);
  });

  it("renders icon, title, description, and the action slot", () => {
    const wrapper = mount(VdEmptyState, {
      props: {
        icon: "table",
        title: "No rows",
        description: "Try another filter",
      },
      slots: { action: '<button type="button">Reset</button>' },
    });
    expect(wrapper.get(".vd-empty-icon")).toBeTruthy();
    expect(wrapper.get(".vd-empty-title").text()).toBe("No rows");
    expect(wrapper.get(".vd-empty-description").text()).toBe(
      "Try another filter",
    );
    expect(wrapper.get(".vd-empty-action").text()).toBe("Reset");
  });
});
