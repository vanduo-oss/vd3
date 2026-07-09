import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdAvatar from "../../src/components/VdAvatar.vue";

describe("VdAvatar", () => {
  it("renders defaults: md size, primary variant, circle shape, fallback glyph", () => {
    const wrapper = mount(VdAvatar);

    expect(wrapper.classes()).toContain("vd-avatar");
    expect(wrapper.classes()).toContain("vd-avatar-md");
    expect(wrapper.classes()).toContain("vd-avatar-primary");
    expect(wrapper.classes()).toContain("vd-avatar-circle");
    expect(wrapper.attributes("aria-label")).toBe("Avatar");

    // No src/initials: the "?" placeholder renders aria-hidden.
    const fallback = wrapper.get("span.vd-avatar-initials");
    expect(fallback.text()).toBe("?");
    expect(fallback.attributes("aria-hidden")).toBe("true");
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("renders an image when src is set and uses alt for the aria-label", () => {
    const wrapper = mount(VdAvatar, {
      props: { src: "/img/user.png", alt: "Jane Doe" },
    });

    const img = wrapper.get("img.vd-avatar-img");
    expect(img.attributes("src")).toBe("/img/user.png");
    expect(img.attributes("alt")).toBe("Jane Doe");
    expect(wrapper.attributes("aria-label")).toBe("Jane Doe");
    expect(wrapper.find(".vd-avatar-initials").exists()).toBe(false);
  });

  it("renders initials when no src is set and labels the avatar with them", () => {
    const wrapper = mount(VdAvatar, { props: { initials: "JD" } });

    const initials = wrapper.get("span.vd-avatar-initials");
    expect(initials.text()).toBe("JD");
    expect(initials.attributes("aria-hidden")).toBeUndefined();
    expect(wrapper.attributes("aria-label")).toBe("JD");
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("src wins over initials", () => {
    const wrapper = mount(VdAvatar, {
      props: { src: "/img/user.png", initials: "JD" },
    });
    expect(wrapper.find("img.vd-avatar-img").exists()).toBe(true);
    expect(wrapper.find(".vd-avatar-initials").exists()).toBe(false);
  });

  it.each(["xs", "sm", "md", "lg", "xl", "2xl"] as const)(
    "size=%s maps to vd-avatar-%s",
    (size) => {
      const wrapper = mount(VdAvatar, { props: { size } });
      expect(wrapper.classes()).toContain(`vd-avatar-${size}`);
    },
  );

  // NOTE: VdAvatar still uses the legacy `error` spelling instead of the
  // shared StatusVariant `danger` (known status-alias follow-up).
  it.each([
    "primary",
    "secondary",
    "success",
    "warning",
    "error",
    "info",
  ] as const)("variant=%s maps to vd-avatar-%s", (variant) => {
    const wrapper = mount(VdAvatar, { props: { variant } });
    expect(wrapper.classes()).toContain(`vd-avatar-${variant}`);
  });

  it.each(["circle", "rounded", "square"] as const)(
    "shape=%s maps to vd-avatar-%s",
    (shape) => {
      const wrapper = mount(VdAvatar, { props: { shape } });
      expect(wrapper.classes()).toContain(`vd-avatar-${shape}`);
    },
  );

  it("omits the status dot by default", () => {
    const wrapper = mount(VdAvatar);
    expect(wrapper.find(".vd-avatar-status").exists()).toBe(false);
  });

  it.each(["online", "offline", "away", "busy"] as const)(
    "status=%s renders a labelled vd-avatar-status-%s dot",
    (status) => {
      const wrapper = mount(VdAvatar, { props: { status } });

      const dot = wrapper.get("span.vd-avatar-status");
      expect(dot.classes()).toContain(`vd-avatar-status-${status}`);
      expect(dot.attributes("aria-label")).toBe(`Status: ${status}`);
    },
  );
});
