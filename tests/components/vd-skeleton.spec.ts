/**
 * VdSkeleton — shape/size/width/lines placeholder blocks.
 */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VdSkeleton from "../../src/components/VdSkeleton.vue";

describe("VdSkeleton", () => {
  it("renders a single md text bar by default", () => {
    const w = mount(VdSkeleton);
    expect(w.classes()).toEqual(
      expect.arrayContaining([
        "vd-skeleton",
        "vd-skeleton-text",
        "vd-skeleton-text-md",
      ]),
    );
    // The text shape always binds :style; with no width prop it resolves to
    // the empty string, so the element renders a present-but-empty style attr.
    expect(w.attributes("style")).toBe("");
  });

  it.each(["sm", "md", "lg", "xl"] as const)(
    "maps size=%s onto the text shape",
    (size) => {
      const w = mount(VdSkeleton, { props: { size } });
      expect(w.classes()).toContain(`vd-skeleton-text-${size}`);
    },
  );

  it("applies the width prop as an inline style on the text shape", () => {
    const w = mount(VdSkeleton, { props: { width: "120px" } });
    expect(w.attributes("style")).toBe("width: 120px;");
  });

  it("renders a lines stack with a short last line", () => {
    const w = mount(VdSkeleton, { props: { lines: 3 } });
    expect(w.classes()).toContain("vd-skeleton-lines");

    const lines = w.findAll(".vd-skeleton.vd-skeleton-text");
    expect(lines).toHaveLength(3);
    expect(lines[0].classes()).not.toContain("vd-skeleton-text-short");
    expect(lines[1].classes()).not.toContain("vd-skeleton-text-short");
    expect(lines[2].classes()).toContain("vd-skeleton-text-short");
  });

  it("renders the circle shape with its size class", () => {
    const w = mount(VdSkeleton, { props: { shape: "circle", size: "lg" } });
    expect(w.classes()).toEqual(
      expect.arrayContaining([
        "vd-skeleton",
        "vd-skeleton-circle",
        "vd-skeleton-circle-lg",
      ]),
    );
  });

  it("renders the button shape with its size class", () => {
    const w = mount(VdSkeleton, { props: { shape: "button", size: "sm" } });
    expect(w.classes()).toEqual(
      expect.arrayContaining([
        "vd-skeleton",
        "vd-skeleton-button",
        "vd-skeleton-button-sm",
      ]),
    );
  });

  it("renders the card shape with header and three body text bars", () => {
    const w = mount(VdSkeleton, { props: { shape: "card", size: "xl" } });
    expect(w.classes()).toEqual(
      expect.arrayContaining(["vd-skeleton-card", "vd-skeleton-card-xl"]),
    );
    expect(w.classes()).not.toContain("vd-skeleton");

    expect(w.find(".vd-skeleton.vd-skeleton-card-header").exists()).toBe(true);

    const bodyTexts = w.findAll(".vd-skeleton-card-body .vd-skeleton-text");
    expect(bodyTexts).toHaveLength(3);
    expect(bodyTexts[2].classes()).toContain("vd-skeleton-text-short");
  });
});
