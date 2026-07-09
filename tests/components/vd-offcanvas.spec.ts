import { afterEach, describe, expect, it } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import VdOffcanvas from "../../src/components/VdOffcanvas.vue";

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.style.overflow = "";
});

const factory = (
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
) =>
  mount(VdOffcanvas, {
    props: { modelValue: true, ...props },
    slots,
    global: { stubs: { teleport: true } },
  });

describe("VdOffcanvas", () => {
  it("renders nothing when closed", () => {
    const wrapper = factory({ modelValue: false });
    expect(wrapper.find(".vd-offcanvas").exists()).toBe(false);
    expect(wrapper.find(".vd-sidenav-overlay").exists()).toBe(false);
  });

  it("renders overlay and panel with the class contract when open", () => {
    const wrapper = factory({}, { default: "<p>Body content</p>" });
    const overlay = wrapper.find(".vd-sidenav-overlay");
    expect(overlay.exists()).toBe(true);
    expect(overlay.classes()).toContain("is-visible");

    const panel = wrapper.find("aside.vd-offcanvas");
    expect(panel.exists()).toBe(true);
    expect(panel.classes()).toContain("vd-offcanvas-right"); // default placement
    expect(panel.classes()).toContain("is-open");
    expect(panel.find(".vd-sidenav-body").text()).toContain("Body content");
  });

  it.each(["left", "right", "top", "bottom"] as const)(
    "maps placement=%s to vd-offcanvas-%s",
    (placement) => {
      const wrapper = factory({ placement });
      expect(wrapper.find(".vd-offcanvas").classes()).toContain(
        `vd-offcanvas-${placement}`,
      );
    },
  );

  it("uses the title as aria-label and renders the header", () => {
    const wrapper = factory({ title: "Settings" });
    const panel = wrapper.find(".vd-offcanvas");
    expect(panel.attributes("aria-label")).toBe("Settings");

    const header = wrapper.find("header.vd-sidenav-header");
    expect(header.exists()).toBe(true);
    expect(header.find("h3.vd-sidenav-title").text()).toBe("Settings");
    expect(
      header.find("button.vd-sidenav-close").attributes("aria-label"),
    ).toBe("Close");
  });

  it("falls back to a generic aria-label and omits the header without title/header slot", () => {
    const wrapper = factory();
    expect(wrapper.find(".vd-offcanvas").attributes("aria-label")).toBe(
      "Off-canvas panel",
    );
    expect(wrapper.find(".vd-sidenav-header").exists()).toBe(false);
  });

  it("renders the header slot (with close button) even without a title", () => {
    const wrapper = factory({}, { header: "<span class='hdr'>Custom</span>" });
    const header = wrapper.find(".vd-sidenav-header");
    expect(header.exists()).toBe(true);
    expect(header.find(".hdr").text()).toBe("Custom");
    expect(header.find("h3.vd-sidenav-title").exists()).toBe(false);
    expect(header.find(".vd-sidenav-close").exists()).toBe(true);
  });

  it("emits update:modelValue=false and close on close-button click", async () => {
    const wrapper = factory({ title: "Panel" });
    await wrapper.find(".vd-sidenav-close").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("closes on backdrop click by default", async () => {
    const wrapper = factory();
    await wrapper.find(".vd-sidenav-overlay").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("ignores backdrop click when closeOnBackdrop=false", async () => {
    const wrapper = factory({ closeOnBackdrop: false });
    await wrapper.find(".vd-sidenav-overlay").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("close")).toBeUndefined();
  });

  it("closes on window Escape when open", () => {
    const wrapper = factory();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("ignores Escape when closeOnEsc=false or when closed", () => {
    const noEsc = factory({ closeOnEsc: false });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(noEsc.emitted("update:modelValue")).toBeUndefined();
    noEsc.unmount();

    const closed = factory({ modelValue: false });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(closed.emitted("update:modelValue")).toBeUndefined();
  });

  it("locks and restores body scroll as modelValue toggles", async () => {
    const wrapper = factory({ modelValue: false });
    await wrapper.setProps({ modelValue: true });
    expect(document.body.style.overflow).toBe("hidden");
    await wrapper.setProps({ modelValue: false });
    expect(document.body.style.overflow).toBe("");
  });
});
