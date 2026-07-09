import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdBox from "../../src/components/primitives/VdBox.vue";

describe("VdBox", () => {
  it("renders a div.vd-box with the default fib-8 padding step", () => {
    const wrapper = mount(VdBox);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toContain("vd-box");
    expect(wrapper.attributes("data-pad")).toBe("fib-8");
  });

  it("renders the default slot content", () => {
    const wrapper = mount(VdBox, {
      slots: { default: "<p>Padded content</p>" },
    });
    expect(wrapper.get("p").text()).toBe("Padded content");
  });

  it("renders as the element given by the `as` prop", () => {
    const wrapper = mount(VdBox, { props: { as: "section" } });
    expect(wrapper.element.tagName).toBe("SECTION");
    expect(wrapper.classes()).toContain("vd-box");
  });

  it.each([
    "0",
    "fib-1",
    "fib-2",
    "fib-3",
    "fib-5",
    "fib-8",
    "fib-13",
    "fib-21",
    "fib-34",
    "fib-55",
  ] as const)("maps pad=%s to data-pad", (pad) => {
    const wrapper = mount(VdBox, { props: { pad } });
    expect(wrapper.attributes("data-pad")).toBe(pad);
  });
});
