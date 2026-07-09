import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdFrame from "../../src/components/primitives/VdFrame.vue";

describe("VdFrame", () => {
  it("renders a div with the vd-frame class and the default golden ratio", () => {
    const wrapper = mount(VdFrame);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toEqual(["vd-frame"]);
    expect(wrapper.attributes("data-ratio")).toBe("golden");
  });

  it("renders slot content inside the frame", () => {
    const wrapper = mount(VdFrame, {
      slots: { default: '<img src="a.png" alt="art" />' },
    });
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.element.parentElement).toBe(wrapper.element);
  });

  it.each([
    "golden",
    "golden-portrait",
    "square",
    "16-9",
    "4-3",
    "3-2",
  ] as const)("maps ratio=%s to data-ratio", (ratio) => {
    const wrapper = mount(VdFrame, { props: { ratio } });
    expect(wrapper.classes()).toContain("vd-frame");
    expect(wrapper.attributes("data-ratio")).toBe(ratio);
  });

  it("updates data-ratio reactively when the prop changes", async () => {
    const wrapper = mount(VdFrame, { props: { ratio: "square" } });
    await wrapper.setProps({ ratio: "16-9" });
    expect(wrapper.attributes("data-ratio")).toBe("16-9");
  });
});
