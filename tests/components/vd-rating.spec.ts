import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdRating from "../../src/components/VdRating.vue";

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdRating, { props: { modelValue: 0, ...props } });

describe("VdRating", () => {
  it("renders a radiogroup of star buttons plus the value span", () => {
    const wrapper = factory({ modelValue: 3 });
    expect(wrapper.classes()).toContain("vd-rating");
    expect(wrapper.attributes("role")).toBe("radiogroup");
    expect(wrapper.attributes("aria-label")).toBe("Rating");

    const stars = wrapper.findAll("button.vd-rating-star");
    expect(stars).toHaveLength(5); // default max
    for (const star of stars) {
      expect(star.attributes("type")).toBe("button");
      expect(star.attributes("role")).toBe("radio");
    }
    expect(stars[0].attributes("aria-label")).toBe("1 star");
    expect(stars[1].attributes("aria-label")).toBe("2 stars");
    expect(wrapper.find(".vd-rating-value").text()).toBe("3");
  });

  it("renders max stars and hides the value when 0", () => {
    const wrapper = factory({ modelValue: 0, max: 3 });
    expect(wrapper.findAll(".vd-rating-star")).toHaveLength(3);
    expect(wrapper.find(".vd-rating-value").text()).toBe("");
  });

  it.each(["sm", "lg"] as const)("maps size=%s to vd-rating-%s", (size) => {
    const wrapper = factory({ size });
    expect(wrapper.classes()).toContain(`vd-rating-${size}`);
  });

  it("has no size class by default", () => {
    const wrapper = factory();
    expect(wrapper.classes()).not.toContain("vd-rating-sm");
    expect(wrapper.classes()).not.toContain("vd-rating-lg");
  });

  it("marks filled stars is-active with aria-checked", () => {
    const wrapper = factory({ modelValue: 3 });
    const stars = wrapper.findAll(".vd-rating-star");
    for (const [i, star] of stars.entries()) {
      expect(star.classes().includes("is-active")).toBe(i < 3);
      expect(star.attributes("aria-checked")).toBe(i < 3 ? "true" : "false");
    }
  });

  it("marks the fractional star is-half", () => {
    const wrapper = factory({ modelValue: 3.5 });
    const stars = wrapper.findAll(".vd-rating-star");
    expect(stars[2].classes()).toContain("is-active");
    expect(stars[3].classes()).toContain("is-half");
    expect(stars[3].classes()).not.toContain("is-active");
    expect(stars[4].classes()).not.toContain("is-half");
  });

  it("emits update:modelValue and change on star click and updates the display", async () => {
    const wrapper = factory({ modelValue: 1 });
    await wrapper.findAll(".vd-rating-star")[3].trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[4]]);
    expect(wrapper.emitted("change")).toEqual([[4]]);
    expect(wrapper.find(".vd-rating-value").text()).toBe("4");
    expect(wrapper.findAll(".vd-rating-star")[3].classes()).toContain(
      "is-active",
    );
  });

  it("syncs the internal value when modelValue changes from outside", async () => {
    const wrapper = factory({ modelValue: 1 });
    await wrapper.setProps({ modelValue: 5 });
    expect(wrapper.find(".vd-rating-value").text()).toBe("5");
    expect(
      wrapper
        .findAll(".vd-rating-star")
        .every((s) => s.classes().includes("is-active")),
    ).toBe(true);
  });

  it("supports arrow-key stepping within bounds", async () => {
    const wrapper = factory({ modelValue: 2 });
    await wrapper.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toEqual([[3]]);

    await wrapper.trigger("keydown", { key: "ArrowLeft" });
    expect(wrapper.emitted("update:modelValue")).toEqual([[3], [2]]);
  });

  it("does not step past max or below 1", async () => {
    const atMax = factory({ modelValue: 5 });
    await atMax.trigger("keydown", { key: "ArrowRight" });
    await atMax.trigger("keydown", { key: "ArrowUp" });
    expect(atMax.emitted("update:modelValue")).toBeUndefined();

    const atMin = factory({ modelValue: 1 });
    await atMin.trigger("keydown", { key: "ArrowLeft" });
    await atMin.trigger("keydown", { key: "ArrowDown" });
    expect(atMin.emitted("update:modelValue")).toBeUndefined();
  });

  it("shows hover fill on mouseenter and clears it on mouseleave", async () => {
    const wrapper = factory({ modelValue: 0 });
    const stars = wrapper.findAll(".vd-rating-star");
    await stars[2].trigger("mouseenter");
    expect(stars[0].classes()).toContain("is-hovered");
    expect(stars[2].classes()).toContain("is-hovered");
    expect(stars[3].classes()).not.toContain("is-hovered");

    await wrapper.trigger("mouseleave");
    expect(
      wrapper
        .findAll(".vd-rating-star")
        .some((s) => s.classes().includes("is-hovered")),
    ).toBe(false);
  });

  it("readonly: adds the class, removes stars from the tab order, ignores input", async () => {
    const wrapper = factory({ modelValue: 2, readonly: true });
    expect(wrapper.classes()).toContain("vd-rating-readonly");
    const stars = wrapper.findAll(".vd-rating-star");
    for (const star of stars) {
      expect(star.attributes("tabindex")).toBe("-1");
    }

    await stars[4].trigger("click");
    await stars[4].trigger("mouseenter");
    await wrapper.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("change")).toBeUndefined();
    expect(stars[0].classes()).not.toContain("is-hovered");
  });

  it("keeps interactive stars in the tab order", () => {
    const wrapper = factory();
    expect(wrapper.find(".vd-rating-star").attributes("tabindex")).toBe("0");
  });
});
