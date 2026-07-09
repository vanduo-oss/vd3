import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdChip from "../../src/components/VdChip.vue";

const VARIANTS = [
  "primary",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
] as const;

describe("VdChip", () => {
  it("renders a span.vd-chip with role=status and slot content", () => {
    const wrapper = mount(VdChip, { slots: { default: "Tag" } });
    const chip = wrapper.get("span.vd-chip");
    expect(chip.attributes("role")).toBe("status");
    expect(chip.text()).toBe("Tag");
  });

  it("defaults to vd-chip-primary and vd-chip-md without modifier classes", () => {
    const wrapper = mount(VdChip);
    const chip = wrapper.get(".vd-chip");
    expect(chip.classes()).toContain("vd-chip-primary");
    expect(chip.classes()).toContain("vd-chip-md");
    expect(chip.classes()).not.toContain("vd-chip-outline");
    expect(chip.classes()).not.toContain("vd-chip-dismissible");
    expect(chip.classes()).not.toContain("vd-chip-clickable");
  });

  it.each(VARIANTS)("maps variant=%s to vd-chip-%s", (variant) => {
    const wrapper = mount(VdChip, { props: { variant } });
    expect(wrapper.get(".vd-chip").classes()).toContain(`vd-chip-${variant}`);
  });

  it.each(["sm", "md", "lg"] as const)("maps size=%s to vd-chip-%s", (size) => {
    const wrapper = mount(VdChip, { props: { size } });
    expect(wrapper.get(".vd-chip").classes()).toContain(`vd-chip-${size}`);
  });

  it("adds vd-chip-outline / vd-chip-clickable modifier classes", () => {
    const wrapper = mount(VdChip, {
      props: { outline: true, clickable: true },
    });
    const classes = wrapper.get(".vd-chip").classes();
    expect(classes).toContain("vd-chip-outline");
    expect(classes).toContain("vd-chip-clickable");
  });

  it("renders an avatar image with empty alt when avatar is set", () => {
    const wrapper = mount(VdChip, { props: { avatar: "/img/a.png" } });
    const img = wrapper.get("img.vd-chip-avatar");
    expect(img.attributes("src")).toBe("/img/a.png");
    expect(img.attributes("alt")).toBe("");
  });

  it("renders no avatar image by default", () => {
    const wrapper = mount(VdChip);
    expect(wrapper.find("img.vd-chip-avatar").exists()).toBe(false);
  });

  it("renders a dismiss button only when dismissible", async () => {
    const plain = mount(VdChip);
    expect(plain.find("button.vd-chip-close").exists()).toBe(false);

    const wrapper = mount(VdChip, { props: { dismissible: true } });
    expect(wrapper.get(".vd-chip").classes()).toContain("vd-chip-dismissible");
    const close = wrapper.get("button.vd-chip-close");
    expect(close.attributes("type")).toBe("button");
    expect(close.attributes("aria-label")).toBe("Dismiss");

    await close.trigger("click");
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
  });

  it("emits click only when clickable", async () => {
    const inert = mount(VdChip);
    await inert.get(".vd-chip").trigger("click");
    expect(inert.emitted("click")).toBeUndefined();

    const clickable = mount(VdChip, { props: { clickable: true } });
    await clickable.get(".vd-chip").trigger("click");
    expect(clickable.emitted("click")).toHaveLength(1);
    expect(clickable.emitted("click")![0]![0]).toBeInstanceOf(MouseEvent);
  });

  it("stops dismiss clicks from also emitting the chip click", async () => {
    const wrapper = mount(VdChip, {
      props: { clickable: true, dismissible: true },
    });
    await wrapper.get("button.vd-chip-close").trigger("click");
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
    expect(wrapper.emitted("click")).toBeUndefined();
  });
});
