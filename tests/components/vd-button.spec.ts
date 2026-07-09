import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdButton from "../../src/components/VdButton.vue";

describe("VdButton", () => {
  it("renders a button.vd-btn with defaults: primary, md (no size class), type=button", () => {
    const wrapper = mount(VdButton, { slots: { default: "Save" } });

    expect(wrapper.element.tagName).toBe("BUTTON");
    expect(wrapper.classes()).toContain("vd-btn");
    expect(wrapper.classes()).toContain("vd-btn-primary");
    // md is the default and intentionally emits no size class.
    expect(wrapper.classes()).not.toContain("vd-btn-md");
    expect(wrapper.classes()).not.toContain("is-loading");
    expect(wrapper.attributes("type")).toBe("button");
    expect(wrapper.attributes("disabled")).toBeUndefined();
    expect(wrapper.text()).toBe("Save");
  });

  it.each([
    "primary",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
    "ghost",
  ] as const)("variant=%s maps to vd-btn-%s", (variant) => {
    const wrapper = mount(VdButton, { props: { variant } });
    expect(wrapper.classes()).toContain(`vd-btn-${variant}`);
  });

  it("size sm/lg map to vd-btn-sm/vd-btn-lg; md maps to no size class", () => {
    expect(mount(VdButton, { props: { size: "sm" } }).classes()).toContain(
      "vd-btn-sm",
    );
    expect(mount(VdButton, { props: { size: "lg" } }).classes()).toContain(
      "vd-btn-lg",
    );
    const md = mount(VdButton, { props: { size: "md" } }).classes();
    expect(md).not.toContain("vd-btn-md");
    expect(md.some((c) => c === "vd-btn-sm" || c === "vd-btn-lg")).toBe(false);
  });

  it("forwards the type prop to the native button", () => {
    const wrapper = mount(VdButton, { props: { type: "submit" } });
    expect(wrapper.attributes("type")).toBe("submit");
  });

  it("emits click with the MouseEvent when enabled", async () => {
    const wrapper = mount(VdButton);

    await wrapper.trigger("click");
    const emitted = wrapper.emitted("click");
    expect(emitted).toHaveLength(1);
    expect(emitted?.[0][0]).toBeInstanceOf(MouseEvent);
  });

  it("disabled sets the native disabled attribute and suppresses the click emit", async () => {
    const wrapper = mount(VdButton, { props: { disabled: true } });

    expect(wrapper.attributes("disabled")).toBeDefined();
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeUndefined();
  });

  it("loading adds is-loading, disables the button, renders the spinner, and suppresses click", async () => {
    const wrapper = mount(VdButton, { props: { loading: true } });

    expect(wrapper.classes()).toContain("is-loading");
    expect(wrapper.attributes("disabled")).toBeDefined();

    const spinner = wrapper.get("span.vd-btn-spinner");
    expect(spinner.attributes("aria-hidden")).toBe("true");

    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeUndefined();
  });

  it("does not render the spinner when not loading", () => {
    const wrapper = mount(VdButton);
    expect(wrapper.find(".vd-btn-spinner").exists()).toBe(false);
  });
});
