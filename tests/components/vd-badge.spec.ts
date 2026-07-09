import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdBadge from "../../src/components/VdBadge.vue";

describe("VdBadge", () => {
  it("renders a span.vd-badge with slot content and the primary default variant", () => {
    const wrapper = mount(VdBadge, { slots: { default: "New" } });

    expect(wrapper.element.tagName).toBe("SPAN");
    expect(wrapper.classes()).toContain("vd-badge");
    expect(wrapper.classes()).toContain("vd-badge-primary");
    expect(wrapper.classes()).not.toContain("vd-badge-pill");
    expect(wrapper.text()).toBe("New");
  });

  it.each([
    "primary",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const)("variant=%s maps to vd-badge-%s", (variant) => {
    const wrapper = mount(VdBadge, { props: { variant } });
    expect(wrapper.classes()).toContain(`vd-badge-${variant}`);
  });

  it("adds vd-badge-pill when pill is true", () => {
    const wrapper = mount(VdBadge, { props: { pill: true } });
    expect(wrapper.classes()).toContain("vd-badge-pill");
    // Variant class is still applied alongside the pill modifier.
    expect(wrapper.classes()).toContain("vd-badge-primary");
  });
});
