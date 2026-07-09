import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdInline from "../../src/components/primitives/VdInline.vue";

describe("VdInline", () => {
  it("renders a div with the vd-inline class and the default fib-5 gap", () => {
    const wrapper = mount(VdInline);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toEqual(["vd-inline"]);
    expect(wrapper.attributes("data-gap")).toBe("fib-5");
  });

  it("renders slot children as direct children of the inline container", () => {
    const wrapper = mount(VdInline, {
      slots: { default: "<button>one</button><button>two</button>" },
    });
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].element.parentElement).toBe(wrapper.element);
    expect(wrapper.text()).toContain("one");
    expect(wrapper.text()).toContain("two");
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
  ] as const)("maps gap=%s to data-gap", (gap) => {
    const wrapper = mount(VdInline, { props: { gap } });
    expect(wrapper.classes()).toContain("vd-inline");
    expect(wrapper.attributes("data-gap")).toBe(gap);
  });

  it("updates data-gap reactively when the prop changes", async () => {
    const wrapper = mount(VdInline, { props: { gap: "fib-3" } });
    await wrapper.setProps({ gap: "fib-21" });
    expect(wrapper.attributes("data-gap")).toBe("fib-21");
  });
});
