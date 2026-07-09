import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdCover from "../../src/components/primitives/VdCover.vue";

describe("VdCover", () => {
  it("renders a div.vd-cover with the default fib-610 minimum height", () => {
    const wrapper = mount(VdCover);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toContain("vd-cover");
    expect(wrapper.attributes("data-min")).toBe("fib-610");
  });

  it("omits data-gap unless the gap prop is set", () => {
    const wrapper = mount(VdCover);
    expect(wrapper.attributes("data-gap")).toBeUndefined();
  });

  it("renders the default slot content", () => {
    const wrapper = mount(VdCover, {
      slots: { default: "<h1>Hero</h1>" },
    });
    expect(wrapper.get("h1").text()).toBe("Hero");
  });

  it("renders as the element given by the `as` prop", () => {
    const wrapper = mount(VdCover, { props: { as: "header" } });
    expect(wrapper.element.tagName).toBe("HEADER");
    expect(wrapper.classes()).toContain("vd-cover");
  });

  it.each(["screen", "half", "fib-610", "fib-987"] as const)(
    "maps min=%s to data-min",
    (min) => {
      const wrapper = mount(VdCover, { props: { min } });
      expect(wrapper.attributes("data-min")).toBe(min);
    },
  );

  it.each(["fib-3", "fib-5", "fib-8"] as const)(
    "maps gap=%s to data-gap",
    (gap) => {
      const wrapper = mount(VdCover, { props: { gap } });
      expect(wrapper.attributes("data-gap")).toBe(gap);
    },
  );
});
