import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdFlow from "../../src/components/VdFlow.vue";

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdFlow, {
    props: { modelValue: 0, total: 3, ...props },
    slots: {
      "slide-0": "<p>First</p>",
      "slide-1": "<p>Second</p>",
      "slide-2": "<p>Third</p>",
    },
  });

describe("VdFlow", () => {
  it("renders a carousel region with a track of slides", () => {
    const wrapper = factory();
    const root = wrapper.get("div.vd-flow");
    expect(root.attributes("role")).toBe("region");
    expect(root.attributes("aria-roledescription")).toBe("carousel");

    const slides = root.findAll(".vd-flow-track > .vd-flow-slide");
    expect(slides).toHaveLength(3);
    expect(slides[0]!.text()).toBe("First");
    expect(slides[2]!.text()).toBe("Third");
  });

  it("hides non-current slides via aria-hidden", () => {
    const wrapper = factory();
    const slides = wrapper.findAll(".vd-flow-slide");
    expect(slides[0]!.attributes("aria-hidden")).toBe("false");
    expect(slides[1]!.attributes("aria-hidden")).toBe("true");
    expect(slides[2]!.attributes("aria-hidden")).toBe("true");
  });

  it("translates the track according to the current index", async () => {
    const wrapper = factory();
    const track = wrapper.get(".vd-flow-track");
    expect(track.attributes("style")).toContain("translateX(-0%)");

    await wrapper.get("button[aria-label='Next slide']").trigger("click");
    expect(track.attributes("style")).toContain("translateX(-100%)");
  });

  it("starts from the given modelValue", () => {
    const wrapper = factory({ modelValue: 1 });
    expect(wrapper.get(".vd-flow-position").text()).toBe("2 / 3");
    expect(
      wrapper.findAll(".vd-flow-slide")[1]!.attributes("aria-hidden"),
    ).toBe("false");
  });

  it("renders prev/next controls with the position indicator", () => {
    const wrapper = factory();
    const controls = wrapper.get(".vd-flow-controls");
    const prev = controls.get("button[aria-label='Previous slide']");
    const next = controls.get("button[aria-label='Next slide']");

    for (const button of [prev, next]) {
      expect(button.classes()).toEqual(
        expect.arrayContaining(["vd-btn", "vd-btn-ghost", "vd-btn-icon"]),
      );
      expect(button.attributes("type")).toBe("button");
    }
    expect(controls.get(".vd-flow-position").text()).toBe("1 / 3");
  });

  it("hides controls for single-slide flows", () => {
    const wrapper = mount(VdFlow, { props: { modelValue: 0, total: 1 } });
    expect(wrapper.find(".vd-flow-controls").exists()).toBe(false);
  });

  it("disables prev on the first slide and next on the last", async () => {
    const wrapper = factory();
    const prev = wrapper.get("button[aria-label='Previous slide']");
    const next = wrapper.get("button[aria-label='Next slide']");

    expect(prev.attributes("disabled")).toBeDefined();
    expect(next.attributes("disabled")).toBeUndefined();

    await next.trigger("click");
    await next.trigger("click");

    expect(wrapper.get(".vd-flow-position").text()).toBe("3 / 3");
    expect(prev.attributes("disabled")).toBeUndefined();
    expect(next.attributes("disabled")).toBeDefined();
  });

  it("emits update:modelValue when navigating", async () => {
    const wrapper = factory();
    const next = wrapper.get("button[aria-label='Next slide']");
    const prev = wrapper.get("button[aria-label='Previous slide']");

    await next.trigger("click");
    await next.trigger("click");
    await prev.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([[1], [2], [1]]);
  });

  it("clamps navigation and does not emit when the index is unchanged", async () => {
    const wrapper = factory({ total: 2 });
    const exposed = wrapper.vm as unknown as {
      go: (n: number) => void;
      next: () => void;
      prev: () => void;
    };

    exposed.prev(); // already at 0 -> clamped, no emit
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    exposed.go(99); // clamped to last slide
    expect(wrapper.emitted("update:modelValue")).toEqual([[1]]);

    exposed.next(); // already at last -> no additional emit
    expect(wrapper.emitted("update:modelValue")).toEqual([[1]]);
  });
});
