/**
 * VdSpinner — status spinner with a visually-hidden label.
 */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VdSpinner from "../../src/components/VdSpinner.vue";

describe("VdSpinner", () => {
  it("renders a md spinner with role=status and a default aria-label", () => {
    const w = mount(VdSpinner);
    expect(w.element.tagName).toBe("SPAN");
    expect(w.classes()).toContain("vd-spinner");
    // md is the default and omits the size modifier class.
    expect(w.classes()).not.toContain("vd-spinner-md");
    expect(w.attributes("role")).toBe("status");
    expect(w.attributes("aria-label")).toBe("Loading");
  });

  it.each(["xs", "sm", "lg", "xl"] as const)(
    "maps size=%s to vd-spinner-%s",
    (size) => {
      const w = mount(VdSpinner, { props: { size } });
      expect(w.classes()).toContain(`vd-spinner-${size}`);
    },
  );

  it("omits the size class for md (the default)", () => {
    const w = mount(VdSpinner, { props: { size: "md" } });
    expect(w.classes()).not.toContain("vd-spinner-md");
  });

  it.each([
    "primary",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const)("maps variant=%s to vd-spinner-%s", (variant) => {
    const w = mount(VdSpinner, { props: { variant } });
    expect(w.classes()).toContain(`vd-spinner-${variant}`);
  });

  it("uses the label prop as the aria-label", () => {
    const w = mount(VdSpinner, { props: { label: "Saving…" } });
    expect(w.attributes("aria-label")).toBe("Saving…");
  });

  it("renders a visually-hidden label span instead of an icon", () => {
    const w = mount(VdSpinner);
    const hidden = w.find("span.vd-visually-hidden");
    expect(hidden.exists()).toBe(true);
    expect(hidden.text()).toBe("Loading");
    // No icon inside the spinner anymore.
    expect(w.find("i.ph").exists()).toBe(false);
  });

  it("uses the custom label in the visually-hidden span", () => {
    const w = mount(VdSpinner, { props: { label: "Saving…" } });
    expect(w.find("span.vd-visually-hidden").text()).toBe("Saving…");
  });
});
