import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdProgress from "../../src/components/VdProgress.vue";

describe("VdProgress", () => {
  it("renders a progressbar with track and fill", () => {
    const wrapper = mount(VdProgress, { props: { value: 25 } });
    expect(wrapper.classes()).toContain("vd-progress");
    expect(wrapper.classes()).not.toContain("is-indeterminate");
    expect(wrapper.attributes("role")).toBe("progressbar");

    const fill = wrapper.find(".vd-progress-track > .vd-progress-fill");
    expect(fill.exists()).toBe(true);
    expect(fill.attributes("style")).toContain("width: 25%");
  });

  it("sets aria value attributes from props", () => {
    const wrapper = mount(VdProgress, { props: { value: 3, max: 10 } });
    expect(wrapper.attributes("aria-valuemin")).toBe("0");
    expect(wrapper.attributes("aria-valuemax")).toBe("10");
    expect(wrapper.attributes("aria-valuenow")).toBe("3");
    expect(wrapper.attributes("aria-label")).toBe("Progress"); // fallback label
  });

  it("computes the fill width as a percentage of max", () => {
    const wrapper = mount(VdProgress, { props: { value: 3, max: 10 } });
    expect(wrapper.find(".vd-progress-fill").attributes("style")).toContain(
      "width: 30%",
    );
  });

  it("clamps the percentage to the 0–100 range", () => {
    const over = mount(VdProgress, { props: { value: 150, max: 100 } });
    expect(over.find(".vd-progress-fill").attributes("style")).toContain(
      "width: 100%",
    );

    const under = mount(VdProgress, { props: { value: -5 } });
    expect(under.find(".vd-progress-fill").attributes("style")).toContain(
      "width: 0%",
    );
  });

  it("renders the label with a rounded percentage", () => {
    const wrapper = mount(VdProgress, {
      props: { value: 1, max: 3, label: "Upload" },
    });
    expect(wrapper.attributes("aria-label")).toBe("Upload");

    const label = wrapper.find(".vd-progress-label");
    expect(label.exists()).toBe(true);
    expect(label.classes()).toContain("vd-text-sm");
    expect(label.classes()).toContain("vd-muted");
    expect(label.text()).toBe("Upload — 33%");
  });

  it("omits the label span when no label is set", () => {
    const wrapper = mount(VdProgress, { props: { value: 50 } });
    expect(wrapper.find(".vd-progress-label").exists()).toBe(false);
  });

  it("handles indeterminate mode: class, no aria-valuenow, unstyled fill, no label", () => {
    const wrapper = mount(VdProgress, {
      props: { value: 40, indeterminate: true, label: "Sync" },
    });
    expect(wrapper.classes()).toContain("is-indeterminate");
    expect(wrapper.attributes("aria-valuenow")).toBeUndefined();
    expect(wrapper.attributes("aria-valuemax")).toBe("100");
    expect(
      wrapper.find(".vd-progress-fill").attributes("style"),
    ).toBeUndefined();
    expect(wrapper.find(".vd-progress-label").exists()).toBe(false);
  });
});
