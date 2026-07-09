/**
 * VdSpinner — status spinner wrapping a phosphor icon.
 */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VdSpinner from "../../src/components/VdSpinner.vue";

describe("VdSpinner", () => {
  it("renders a md spinner with role=status and a default aria-label", () => {
    const w = mount(VdSpinner);
    expect(w.element.tagName).toBe("SPAN");
    expect(w.classes()).toEqual(
      expect.arrayContaining(["vd-spinner", "vd-spinner-md"]),
    );
    expect(w.attributes("role")).toBe("status");
    expect(w.attributes("aria-label")).toBe("Loading");
  });

  it.each(["sm", "md", "lg"] as const)(
    "maps size=%s to vd-spinner-%s",
    (size) => {
      const w = mount(VdSpinner, { props: { size } });
      expect(w.classes()).toContain(`vd-spinner-${size}`);
    },
  );

  it("uses the label prop as the aria-label", () => {
    const w = mount(VdSpinner, { props: { label: "Saving…" } });
    expect(w.attributes("aria-label")).toBe("Saving…");
  });

  it("renders the circle-notch icon hidden from assistive tech", () => {
    const w = mount(VdSpinner);
    const icon = w.find("i.ph.ph-circle-notch");
    expect(icon.exists()).toBe(true);
    expect(icon.attributes("aria-hidden")).toBe("true");
  });
});
