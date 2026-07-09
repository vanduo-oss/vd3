import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdStack from "../../src/components/primitives/VdStack.vue";

describe("VdStack", () => {
  it("renders a div with the vd-stack class and the default fib-8 gap", () => {
    const wrapper = mount(VdStack);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toEqual(["vd-stack"]);
    expect(wrapper.attributes("data-gap")).toBe("fib-8");
  });

  it("renders slot children as direct children of the stack", () => {
    const wrapper = mount(VdStack, {
      slots: { default: "<p>first</p><p>second</p>" },
    });
    const paragraphs = wrapper.findAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].element.parentElement).toBe(wrapper.element);
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
    const wrapper = mount(VdStack, { props: { gap } });
    expect(wrapper.classes()).toContain("vd-stack");
    expect(wrapper.attributes("data-gap")).toBe(gap);
  });

  it.each(["div", "section", "ul", "ol"] as const)(
    "renders as a %s element via the as prop",
    (as) => {
      const wrapper = mount(VdStack, { props: { as } });
      expect(wrapper.element.tagName).toBe(as.toUpperCase());
      expect(wrapper.classes()).toContain("vd-stack");
      expect(wrapper.attributes("data-gap")).toBe("fib-8");
    },
  );

  it("keeps class and gap when rendered as a list with items", () => {
    const wrapper = mount(VdStack, {
      props: { as: "ul", gap: "fib-13" },
      slots: { default: "<li>a</li><li>b</li>" },
    });
    expect(wrapper.element.tagName).toBe("UL");
    expect(wrapper.attributes("data-gap")).toBe("fib-13");
    expect(wrapper.findAll("li")).toHaveLength(2);
  });
});
