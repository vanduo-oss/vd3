import { describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import VdModal from "../../src/components/VdModal.vue";

// Teleport is stubbed so the modal markup stays inside the wrapper.
const factory = (
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): VueWrapper =>
  mount(VdModal, {
    props: { open: true, ...props },
    slots: { default: "<p>Body content</p>", ...slots },
    global: { stubs: { teleport: true } },
  });

describe("VdModal", () => {
  it("renders nothing when closed", () => {
    const wrapper = factory({ open: false });
    expect(wrapper.find(".vd-modal").exists()).toBe(false);
  });

  it("renders an open dialog with backdrop, panel and body", () => {
    const wrapper = factory({ title: "Settings" });
    const modal = wrapper.get(".vd-modal");

    expect(modal.classes()).toContain("vd-modal-open");
    expect(modal.attributes("role")).toBe("dialog");
    expect(modal.attributes("aria-modal")).toBe("true");
    expect(modal.attributes("aria-label")).toBe("Settings");
    expect(modal.attributes("data-vd-modal")).toBeDefined();

    expect(modal.find(".vd-modal-backdrop").exists()).toBe(true);
    const panel = modal.get(".vd-modal-panel");
    expect(panel.attributes("tabindex")).toBe("-1");
    expect(panel.get(".vd-modal-body").text()).toBe("Body content");
    wrapper.unmount();
  });

  it("falls back to the 'Dialog' aria-label without a title", () => {
    const wrapper = factory();
    expect(wrapper.get(".vd-modal").attributes("aria-label")).toBe("Dialog");
    wrapper.unmount();
  });

  it.each(["sm", "md", "lg"] as const)(
    "maps size=%s to vd-modal-panel-%s",
    (size) => {
      const wrapper = factory({ size });
      expect(wrapper.get(".vd-modal-panel").classes()).toContain(
        `vd-modal-panel-${size}`,
      );
      wrapper.unmount();
    },
  );

  it("defaults the panel to vd-modal-panel-md", () => {
    const wrapper = factory();
    expect(wrapper.get(".vd-modal-panel").classes()).toContain(
      "vd-modal-panel-md",
    );
    wrapper.unmount();
  });

  it("renders the header with title and close button only when titled or slotted", () => {
    const bare = factory();
    expect(bare.find(".vd-modal-header").exists()).toBe(false);
    bare.unmount();

    const titled = factory({ title: "Hello" });
    const header = titled.get("header.vd-modal-header");
    expect(header.get("h2.vd-modal-title").text()).toBe("Hello");
    const close = header.get("button[aria-label='Close']");
    expect(close.classes()).toEqual(
      expect.arrayContaining(["vd-btn", "vd-btn-ghost", "vd-btn-icon"]),
    );
    titled.unmount();

    const slotted = factory({}, { header: "<span id='hx'>Custom</span>" });
    expect(slotted.get(".vd-modal-header").find("#hx").exists()).toBe(true);
    slotted.unmount();
  });

  it("renders the footer slot in a vd-modal-footer", () => {
    const bare = factory();
    expect(bare.find(".vd-modal-footer").exists()).toBe(false);
    bare.unmount();

    const wrapper = factory({}, { footer: "<button id='ok'>OK</button>" });
    expect(wrapper.get("footer.vd-modal-footer").find("#ok").exists()).toBe(
      true,
    );
    wrapper.unmount();
  });

  it("emits update:open=false and close when the close button is clicked", async () => {
    const wrapper = factory({ title: "T" });
    await wrapper.get("button[aria-label='Close']").trigger("click");
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
  });

  it("closes on backdrop click by default", async () => {
    const wrapper = factory();
    await wrapper.get(".vd-modal-backdrop").trigger("click");
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
  });

  it("ignores backdrop clicks when closeOnBackdrop=false", async () => {
    const wrapper = factory({ closeOnBackdrop: false });
    await wrapper.get(".vd-modal-backdrop").trigger("click");
    expect(wrapper.emitted("update:open")).toBeUndefined();
    expect(wrapper.emitted("close")).toBeUndefined();
    wrapper.unmount();
  });

  it("closes on Escape while open", async () => {
    const wrapper = factory();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
  });

  it("ignores other keys and detaches the Escape handler once closed", async () => {
    const wrapper = factory();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(wrapper.emitted("close")).toBeUndefined();

    await wrapper.setProps({ open: false });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("close")).toBeUndefined();
    wrapper.unmount();
  });
});
