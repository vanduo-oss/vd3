import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdFab from "../../src/components/VdFab.vue";

describe("VdFab", () => {
  it("renders a type=button.vd-fab with slot content", () => {
    const wrapper = mount(VdFab, { slots: { default: "+" } });
    const btn = wrapper.get("button.vd-fab");
    expect(btn.attributes("type")).toBe("button");
    expect(btn.text()).toBe("+");
  });

  it("defaults to the bare vd-fab (primary, md) with no modifier classes", () => {
    const wrapper = mount(VdFab);
    const classes = wrapper.get("button.vd-fab").classes();
    expect(classes).not.toContain("vd-fab-secondary");
    expect(classes).not.toContain("vd-fab-sm");
    expect(classes).not.toContain("vd-fab-lg");
    expect(classes).not.toContain("vd-fab-extended");
    expect(classes).not.toContain("vd-fab-glass");
    expect(classes).not.toContain("vd-fab-fixed");
  });

  it.each(["secondary", "success", "danger"] as const)(
    "maps variant=%s to vd-fab-%s",
    (variant) => {
      const wrapper = mount(VdFab, { props: { variant } });
      expect(wrapper.get("button.vd-fab").classes()).toContain(
        `vd-fab-${variant}`,
      );
    },
  );

  it("aliases variant=error to vd-fab-danger", () => {
    const wrapper = mount(VdFab, { props: { variant: "error" } });
    const classes = wrapper.get("button.vd-fab").classes();
    expect(classes).toContain("vd-fab-danger");
    expect(classes).not.toContain("vd-fab-error");
  });

  it.each(["sm", "lg"] as const)("maps size=%s to vd-fab-%s", (size) => {
    const wrapper = mount(VdFab, { props: { size } });
    expect(wrapper.get("button.vd-fab").classes()).toContain(`vd-fab-${size}`);
  });

  it("adds vd-fab-extended and vd-fab-glass modifier classes", () => {
    const wrapper = mount(VdFab, { props: { extended: true, glass: true } });
    const classes = wrapper.get("button.vd-fab").classes();
    expect(classes).toContain("vd-fab-extended");
    expect(classes).toContain("vd-fab-glass");
  });

  it("renders a label span only in extended mode", () => {
    const plain = mount(VdFab, { props: { label: "Create" } });
    expect(plain.find("span").exists()).toBe(false);

    const ext = mount(VdFab, { props: { extended: true, label: "Create" } });
    expect(ext.get("span").text()).toBe("Create");
  });

  it.each([
    ["bottom-right", "vd-fab-fixed"],
    ["bottom-left", "vd-fab-bottom-left"],
    ["top-right", "vd-fab-top-right"],
    ["top-left", "vd-fab-top-left"],
    ["center", "vd-fab-center"],
  ] as const)("maps position=%s to .%s", (position, expected) => {
    const wrapper = mount(VdFab, { props: { position } });
    expect(wrapper.get("button.vd-fab").classes()).toContain(expected);
  });

  it("uses ariaLabel, then label, for the aria-label attribute", () => {
    expect(
      mount(VdFab, { props: { ariaLabel: "Add item" } })
        .get("button")
        .attributes("aria-label"),
    ).toBe("Add item");
    expect(
      mount(VdFab, { props: { label: "Create" } })
        .get("button")
        .attributes("aria-label"),
    ).toBe("Create");
  });

  it("emits click with the MouseEvent", async () => {
    const wrapper = mount(VdFab);
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
    expect(wrapper.emitted("click")![0]![0]).toBeInstanceOf(MouseEvent);
  });

  describe("speed dial", () => {
    const menu = () =>
      mount(VdFab, {
        attachTo: document.body,
        slots: {
          default: "+",
          actions: [
            '<button class="vd-fab vd-fab-sm">1</button>',
            '<button class="vd-fab vd-fab-sm">2</button>',
          ],
        },
      });

    it("wraps in .vd-fab-menu with an .vd-fab-actions container when actions slot is used", () => {
      const wrapper = menu();
      const root = wrapper.get(".vd-fab-menu");
      expect(root.find(".vd-fab-actions").exists()).toBe(true);
      expect(root.findAll(".vd-fab-actions .vd-fab")).toHaveLength(2);
      wrapper.unmount();
    });

    it("is closed by default: no is-open, aria-expanded=false", () => {
      const wrapper = menu();
      expect(wrapper.get(".vd-fab-menu").classes()).not.toContain("is-open");
      expect(wrapper.get("button.vd-fab").attributes("aria-expanded")).toBe(
        "false",
      );
      wrapper.unmount();
    });

    it("toggles is-open and aria-expanded when the trigger is clicked", async () => {
      const wrapper = menu();
      const trigger = wrapper.get("button.vd-fab");

      await trigger.trigger("click");
      expect(wrapper.get(".vd-fab-menu").classes()).toContain("is-open");
      expect(trigger.attributes("aria-expanded")).toBe("true");
      expect(wrapper.emitted("click")).toHaveLength(1);

      await trigger.trigger("click");
      expect(wrapper.get(".vd-fab-menu").classes()).not.toContain("is-open");
      expect(trigger.attributes("aria-expanded")).toBe("false");
      wrapper.unmount();
    });

    it("closes on Escape", async () => {
      const wrapper = menu();
      await wrapper.get("button.vd-fab").trigger("click");
      expect(wrapper.get(".vd-fab-menu").classes()).toContain("is-open");

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await wrapper.vm.$nextTick();
      expect(wrapper.get(".vd-fab-menu").classes()).not.toContain("is-open");
      wrapper.unmount();
    });

    it("closes on an outside click", async () => {
      const wrapper = menu();
      await wrapper.get("button.vd-fab").trigger("click");
      expect(wrapper.get(".vd-fab-menu").classes()).toContain("is-open");

      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wrapper.vm.$nextTick();
      expect(wrapper.get(".vd-fab-menu").classes()).not.toContain("is-open");
      wrapper.unmount();
    });
  });
});
