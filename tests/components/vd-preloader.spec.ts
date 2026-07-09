import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdPreloader from "../../src/components/VdPreloader.vue";

describe("VdPreloader", () => {
  it("renders container > preloader > spinner with defaults", () => {
    const wrapper = mount(VdPreloader);
    const container = wrapper.find(".vd-preloader-container");
    expect(container.exists()).toBe(true);
    expect(container.classes()).toContain("vd-preloader-light"); // default theme

    const preloader = container.find(".vd-preloader");
    expect(preloader.exists()).toBe(true);
    expect(preloader.classes()).toContain("vd-preloader-primary"); // default variant
    expect(preloader.classes()).toContain("vd-preloader-md"); // default size
    expect(preloader.find(".vd-preloader-spinner").exists()).toBe(true);
  });

  it("exposes a polite live-region status role", () => {
    const wrapper = mount(VdPreloader);
    const container = wrapper.find(".vd-preloader-container");
    expect(container.attributes("role")).toBe("status");
    expect(container.attributes("aria-live")).toBe("polite");
  });

  // Note: the vd3 preloader's status vocabulary uses "error" (not "danger").
  it.each([
    "primary",
    "secondary",
    "success",
    "warning",
    "error",
    "info",
  ] as const)("maps variant=%s to vd-preloader-%s", (variant) => {
    const wrapper = mount(VdPreloader, { props: { variant } });
    expect(wrapper.find(".vd-preloader").classes()).toContain(
      `vd-preloader-${variant}`,
    );
  });

  it.each(["sm", "md", "lg", "xl"] as const)(
    "maps size=%s to vd-preloader-%s",
    (size) => {
      const wrapper = mount(VdPreloader, { props: { size } });
      expect(wrapper.find(".vd-preloader").classes()).toContain(
        `vd-preloader-${size}`,
      );
    },
  );

  it("maps theme=dark onto the container", () => {
    const wrapper = mount(VdPreloader, { props: { theme: "dark" } });
    const container = wrapper.find(".vd-preloader-container");
    expect(container.classes()).toContain("vd-preloader-dark");
    expect(container.classes()).not.toContain("vd-preloader-light");
  });

  it("renders the text label only when text is set", () => {
    const withText = mount(VdPreloader, { props: { text: "Loading…" } });
    expect(withText.find(".vd-preloader-text").text()).toBe("Loading…");

    const withoutText = mount(VdPreloader);
    expect(withoutText.find(".vd-preloader-text").exists()).toBe(false);
  });
});
