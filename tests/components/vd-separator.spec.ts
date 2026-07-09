import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdSeparator from "../../src/components/VdSeparator.vue";

describe("VdSeparator", () => {
  it("renders a horizontal hr by default", () => {
    const wrapper = mount(VdSeparator);
    const hr = wrapper.find("hr");
    expect(hr.exists()).toBe(true);
    expect(hr.classes()).toContain("vd-separator");
    expect(hr.classes()).not.toContain("vd-separator-vertical");
    expect(hr.attributes("aria-orientation")).toBe("horizontal");
  });

  it("renders a vertical hr with the vertical class", () => {
    const wrapper = mount(VdSeparator, { props: { vertical: true } });
    const hr = wrapper.find("hr");
    expect(hr.exists()).toBe(true);
    expect(hr.classes()).toContain("vd-separator");
    expect(hr.classes()).toContain("vd-separator-vertical");
    expect(hr.attributes("aria-orientation")).toBe("vertical");
  });

  it("renders a labeled separator div for a horizontal label", () => {
    const wrapper = mount(VdSeparator, { props: { label: "or" } });
    expect(wrapper.find("hr").exists()).toBe(false);

    const div = wrapper.find("div.vd-separator");
    expect(div.exists()).toBe(true);
    expect(div.classes()).toContain("vd-separator-labeled");
    expect(div.attributes("role")).toBe("separator");
    expect(div.attributes("aria-orientation")).toBe("horizontal");
    expect(div.find("span.vd-separator-label").text()).toBe("or");
  });

  it("ignores the label when vertical (labels are horizontal-only)", () => {
    const wrapper = mount(VdSeparator, {
      props: { label: "or", vertical: true },
    });
    expect(wrapper.find("hr.vd-separator-vertical").exists()).toBe(true);
    expect(wrapper.find(".vd-separator-labeled").exists()).toBe(false);
    expect(wrapper.find(".vd-separator-label").exists()).toBe(false);
  });
});
