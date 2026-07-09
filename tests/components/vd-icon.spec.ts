import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdIcon from "../../src/components/VdIcon.vue";

describe("VdIcon", () => {
  it("renders an <i> with the Phosphor outline classes by default", () => {
    const wrapper = mount(VdIcon, { props: { name: "house" } });
    const icon = wrapper.get("i");
    expect(icon.classes()).toContain("ph");
    expect(icon.classes()).toContain("ph-house");
    expect(icon.classes()).not.toContain("ph-fill");
  });

  it("is hidden from assistive technology", () => {
    const wrapper = mount(VdIcon, { props: { name: "house" } });
    expect(wrapper.get("i").attributes("aria-hidden")).toBe("true");
  });

  it("switches to the filled icon family when filled=true", () => {
    const wrapper = mount(VdIcon, { props: { name: "heart", filled: true } });
    const icon = wrapper.get("i");
    expect(icon.classes()).toContain("ph-fill");
    expect(icon.classes()).toContain("ph-heart");
    expect(icon.classes()).not.toContain("ph");
  });

  it.each([
    ["sm", "vd-text-base"],
    ["md", "vd-text-xl"],
    ["lg", "vd-text-2xl"],
  ] as const)("maps size=%s to the %s text class", (size, expected) => {
    const wrapper = mount(VdIcon, { props: { name: "gear", size } });
    expect(wrapper.get("i").classes()).toContain(expected);
  });

  it("defaults to the md text size", () => {
    const wrapper = mount(VdIcon, { props: { name: "gear" } });
    expect(wrapper.get("i").classes()).toContain("vd-text-xl");
  });
});
