import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdTooltip from "../../src/components/VdTooltip.vue";

describe("VdTooltip", () => {
  it("renders a span.vd-tooltip wrapping the default slot", () => {
    const wrapper = mount(VdTooltip, {
      props: { text: "Hello" },
      slots: { default: "<button>Trigger</button>" },
    });
    expect(wrapper.element.tagName).toBe("SPAN");
    expect(wrapper.classes()).toContain("vd-tooltip");
    expect(wrapper.get("button").text()).toBe("Trigger");
  });

  it("exposes the tooltip text via the data-tooltip attribute", () => {
    const wrapper = mount(VdTooltip, { props: { text: "Copy to clipboard" } });
    expect(wrapper.attributes("data-tooltip")).toBe("Copy to clipboard");
  });

  it("defaults data-tooltip-position to top", () => {
    const wrapper = mount(VdTooltip, { props: { text: "t" } });
    expect(wrapper.attributes("data-tooltip-position")).toBe("top");
  });

  it.each(["top", "bottom", "left", "right"] as const)(
    "maps position=%s to data-tooltip-position",
    (position) => {
      const wrapper = mount(VdTooltip, { props: { text: "t", position } });
      expect(wrapper.attributes("data-tooltip-position")).toBe(position);
    },
  );

  it("updates data-tooltip when the text prop changes", async () => {
    const wrapper = mount(VdTooltip, { props: { text: "before" } });
    await wrapper.setProps({ text: "after" });
    expect(wrapper.attributes("data-tooltip")).toBe("after");
  });
});
