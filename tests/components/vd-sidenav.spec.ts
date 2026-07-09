/**
 * VdSidenav — teleported off-canvas navigation drawer.
 * Renders into document.body via <Teleport>, so DOM assertions query the
 * document instead of the wrapper element.
 */
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import VdSidenav from "../../src/components/VdSidenav.vue";

type SidenavProps = InstanceType<typeof VdSidenav>["$props"];

let wrapper: VueWrapper | undefined;

const mountSidenav = (
  props: Partial<SidenavProps> = {},
  slots: Record<string, string> = {},
): VueWrapper => {
  wrapper = mount(VdSidenav, {
    props: { modelValue: true, ...props },
    slots,
  });
  return wrapper;
};

const overlay = (): HTMLElement | null =>
  document.querySelector(".vd-sidenav-overlay");
const panel = (): HTMLElement | null => document.querySelector(".vd-sidenav");

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("VdSidenav", () => {
  it("renders nothing while closed", () => {
    mountSidenav({ modelValue: false });
    expect(overlay()).toBeNull();
    expect(panel()).toBeNull();
  });

  it("teleports overlay and panel to body with the open-state classes", () => {
    mountSidenav({}, { default: "<p class='nav-body'>Links</p>" });

    const ov = overlay();
    expect(ov).not.toBeNull();
    expect(ov!.classList.contains("is-visible")).toBe(true);

    const el = panel();
    expect(el).not.toBeNull();
    expect(el!.tagName).toBe("ASIDE");
    expect(el!.classList.contains("vd-sidenav-left")).toBe(true);
    expect(el!.classList.contains("is-open")).toBe(true);
    expect(el!.getAttribute("aria-label")).toBe("Side navigation");
    expect(el!.querySelector(".vd-sidenav-body .nav-body")!.textContent).toBe(
      "Links",
    );
  });

  it.each(["left", "right", "top", "bottom"] as const)(
    "maps placement=%s to vd-sidenav-%s",
    (placement) => {
      mountSidenav({ placement });
      expect(panel()!.classList.contains(`vd-sidenav-${placement}`)).toBe(true);
      wrapper!.unmount();
      wrapper = undefined;
      document.body.innerHTML = "";
    },
  );

  it("renders header with title, close button, and title as aria-label", () => {
    mountSidenav({ title: "Menu" });

    const el = panel()!;
    expect(el.getAttribute("aria-label")).toBe("Menu");
    const header = el.querySelector("header.vd-sidenav-header");
    expect(header).not.toBeNull();
    expect(header!.querySelector("h3.vd-sidenav-title")!.textContent).toBe(
      "Menu",
    );
    const close = header!.querySelector("button.vd-sidenav-close");
    expect(close).not.toBeNull();
    expect(close!.getAttribute("aria-label")).toBe("Close");
    expect(close!.getAttribute("type")).toBe("button");
  });

  it("omits the header without a title or header slot; renders footer slot", () => {
    mountSidenav({}, { footer: "<span class='foot'>Footer</span>" });

    const el = panel()!;
    expect(el.querySelector(".vd-sidenav-header")).toBeNull();
    expect(
      el.querySelector("footer.vd-sidenav-footer .foot")!.textContent,
    ).toBe("Footer");
  });

  it("renders the header when only the header slot is provided", () => {
    mountSidenav({}, { header: "<b class='hdr'>Hi</b>" });

    const header = panel()!.querySelector(".vd-sidenav-header");
    expect(header).not.toBeNull();
    expect(header!.querySelector(".hdr")).not.toBeNull();
    expect(header!.querySelector(".vd-sidenav-title")).toBeNull();
  });

  it("close button emits update:modelValue=false and close", () => {
    const w = mountSidenav({ title: "Menu" });

    panel()!.querySelector<HTMLButtonElement>(".vd-sidenav-close")!.click();
    expect(w.emitted("update:modelValue")).toEqual([[false]]);
    expect(w.emitted("close")).toHaveLength(1);
  });

  it("backdrop click closes by default", () => {
    const w = mountSidenav();
    overlay()!.click();
    expect(w.emitted("update:modelValue")).toEqual([[false]]);
    expect(w.emitted("close")).toHaveLength(1);
  });

  it("backdrop click is ignored when closeOnBackdrop=false", () => {
    const w = mountSidenav({ closeOnBackdrop: false });
    overlay()!.click();
    expect(w.emitted("update:modelValue")).toBeUndefined();
    expect(w.emitted("close")).toBeUndefined();
  });

  it("Escape closes while open and prevents the default action", () => {
    const w = mountSidenav();
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(w.emitted("update:modelValue")).toEqual([[false]]);
    expect(w.emitted("close")).toHaveLength(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Escape is ignored when closeOnEsc=false", () => {
    const w = mountSidenav({ closeOnEsc: false });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(w.emitted("update:modelValue")).toBeUndefined();
  });

  it("Escape is ignored while closed", () => {
    const w = mountSidenav({ modelValue: false });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(w.emitted("update:modelValue")).toBeUndefined();
  });

  it("locks and unlocks body scroll as modelValue changes", async () => {
    const w = mountSidenav({ modelValue: false });
    expect(document.body.style.overflow).toBe("");

    await w.setProps({ modelValue: true });
    expect(document.body.style.overflow).toBe("hidden");

    await w.setProps({ modelValue: false });
    expect(document.body.style.overflow).toBe("");
  });
});
