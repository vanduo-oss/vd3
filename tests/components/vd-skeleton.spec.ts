/**
 * VdSkeleton — shape/size/width/lines placeholder blocks.
 */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VdSkeleton from "../../src/components/VdSkeleton.vue";

describe("VdSkeleton", () => {
  it("renders a single md text bar by default with aria-hidden", () => {
    const w = mount(VdSkeleton);
    expect(w.classes()).toEqual(
      expect.arrayContaining([
        "vd-skeleton",
        "vd-skeleton-text",
        "vd-skeleton-text-md",
      ]),
    );
    expect(w.attributes("aria-hidden")).toBe("true");
    // No width prop -> no style attribute emitted.
    expect(w.attributes("style")).toBeUndefined();
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
    expect(w.attributes("aria-hidden")).toBe("true");

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
    expect(w.attributes("aria-hidden")).toBe("true");
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
    expect(w.attributes("aria-hidden")).toBe("true");
  });

  it("renders the rect shape with its size class", () => {
    const w = mount(VdSkeleton, { props: { shape: "rect", size: "lg" } });
    expect(w.classes()).toEqual(
      expect.arrayContaining([
        "vd-skeleton",
        "vd-skeleton-rect",
        "vd-skeleton-rect-lg",
      ]),
    );
    expect(w.attributes("aria-hidden")).toBe("true");
  });

  it("omits the rect size class for md (the default)", () => {
    const w = mount(VdSkeleton, { props: { shape: "rect", size: "md" } });
    expect(w.classes()).toContain("vd-skeleton-rect");
    expect(w.classes()).not.toContain("vd-skeleton-rect-md");
  });

  it("applies the width prop as an inline style on the rect shape", () => {
    const w = mount(VdSkeleton, {
      props: { shape: "rect", width: "200px" },
    });
    expect(w.attributes("style")).toBe("width: 200px;");
  });

  it("renders the card shape with header and three body text bars", () => {
    const w = mount(VdSkeleton, { props: { shape: "card", size: "xl" } });
    expect(w.classes()).toEqual(
      expect.arrayContaining(["vd-skeleton-card", "vd-skeleton-card-xl"]),
    );
    expect(w.classes()).not.toContain("vd-skeleton");
    expect(w.attributes("aria-hidden")).toBe("true");

    expect(w.find(".vd-skeleton.vd-skeleton-card-header").exists()).toBe(true);

    const bodyTexts = w.findAll(".vd-skeleton-card-body .vd-skeleton-text");
    expect(bodyTexts).toHaveLength(3);
    expect(bodyTexts[2].classes()).toContain("vd-skeleton-text-short");
  });
});
