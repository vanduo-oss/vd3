import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdSwitcher from "../../src/components/primitives/VdSwitcher.vue";

describe("VdSwitcher", () => {
  it("renders a div with the vd-switcher class and default threshold/gap", () => {
    const wrapper = mount(VdSwitcher);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toEqual(["vd-switcher"]);
    expect(wrapper.attributes("data-threshold")).toBe("fib-610");
    expect(wrapper.attributes("data-gap")).toBe("fib-5");
  });

  it("renders slot children as direct children of the switcher", () => {
    const wrapper = mount(VdSwitcher, {
      slots: { default: "<div>left</div><div>right</div>" },
    });
    const children = wrapper.element.children;
    expect(children).toHaveLength(2);
    expect(children[0].textContent).toBe("left");
    expect(children[1].textContent).toBe("right");
  });

  it.each(["fib-377", "fib-610", "fib-987"] as const)(
    "maps threshold=%s to data-threshold",
    (threshold) => {
      const wrapper = mount(VdSwitcher, { props: { threshold } });
      expect(wrapper.classes()).toContain("vd-switcher");
      expect(wrapper.attributes("data-threshold")).toBe(threshold);
    },
  );

  it.each(["fib-3", "fib-5", "fib-8"] as const)(
    "maps gap=%s to data-gap",
    (gap) => {
      const wrapper = mount(VdSwitcher, { props: { gap } });
      expect(wrapper.attributes("data-gap")).toBe(gap);
    },
  );

  it("applies threshold and gap independently", async () => {
    const wrapper = mount(VdSwitcher, {
      props: { threshold: "fib-987", gap: "fib-3" },
    });
    expect(wrapper.attributes("data-threshold")).toBe("fib-987");
    expect(wrapper.attributes("data-gap")).toBe("fib-3");
    await wrapper.setProps({ threshold: "fib-377" });
    expect(wrapper.attributes("data-threshold")).toBe("fib-377");
    expect(wrapper.attributes("data-gap")).toBe("fib-3");
  });
});
