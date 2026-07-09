import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdCenter from "../../src/components/primitives/VdCenter.vue";

describe("VdCenter", () => {
  it("renders a div.vd-center with the default fib-610 max width", () => {
    const wrapper = mount(VdCenter);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toContain("vd-center");
    expect(wrapper.attributes("data-max")).toBe("fib-610");
  });

  it("omits data-axis unless the axis prop is set", () => {
    const wrapper = mount(VdCenter);
    expect(wrapper.attributes("data-axis")).toBeUndefined();
  });

  it("renders the default slot content", () => {
    const wrapper = mount(VdCenter, {
      slots: { default: "<article>Centered</article>" },
    });
    expect(wrapper.get("article").text()).toBe("Centered");
  });

  it("renders as the element given by the `as` prop", () => {
    const wrapper = mount(VdCenter, { props: { as: "main" } });
    expect(wrapper.element.tagName).toBe("MAIN");
    expect(wrapper.classes()).toContain("vd-center");
  });

  it.each(["fib-377", "fib-610", "fib-987"] as const)(
    "maps max=%s to data-max",
    (max) => {
      const wrapper = mount(VdCenter, { props: { max } });
      expect(wrapper.attributes("data-max")).toBe(max);
    },
  );

  it.each(["both", "horizontal", "vertical"] as const)(
    "maps axis=%s to data-axis",
    (axis) => {
      const wrapper = mount(VdCenter, { props: { axis } });
      expect(wrapper.attributes("data-axis")).toBe(axis);
    },
  );
});
