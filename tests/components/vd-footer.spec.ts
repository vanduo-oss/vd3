import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdFooter from "../../src/components/VdFooter.vue";

describe("VdFooter", () => {
  it("renders a footer.vd-footer with an inner .vd-footer-container and default slot", () => {
    const wrapper = mount(VdFooter, {
      slots: {
        default: '<div class="vd-footer-section">Links</div>',
      },
    });

    expect(wrapper.element.tagName).toBe("FOOTER");
    expect(wrapper.classes()).toContain("vd-footer");
    const container = wrapper.get(".vd-footer-container");
    expect(container.find(".vd-footer-section").text()).toBe("Links");
  });

  it("applies no modifier classes by default", () => {
    const wrapper = mount(VdFooter);
    const classes = wrapper.classes();
    expect(classes).toContain("vd-footer");
    expect(classes).not.toContain("vd-footer-dark");
    expect(classes.some((c) => /vd-footer-(2|3|4)col/.test(c))).toBe(false);
    expect(classes).not.toContain("vd-footer-sm");
    expect(classes).not.toContain("vd-footer-lg");
  });

  it.each([
    [2, "vd-footer-2col"],
    [3, "vd-footer-3col"],
    [4, "vd-footer-4col"],
  ] as const)("columns=%i maps to %s", (columns, expected) => {
    const wrapper = mount(VdFooter, { props: { columns } });
    expect(wrapper.classes()).toContain(expected);
  });

  it("maps columns, dark, and size modifiers to classes together", () => {
    const wrapper = mount(VdFooter, {
      props: { columns: 3, dark: true, size: "lg" },
    });
    const classes = wrapper.classes();
    expect(classes).toContain("vd-footer");
    expect(classes).toContain("vd-footer-3col");
    expect(classes).toContain("vd-footer-dark");
    expect(classes).toContain("vd-footer-lg");
  });

  it.each(["sm", "lg"] as const)("size=%s maps to vd-footer-%s", (size) => {
    const wrapper = mount(VdFooter, { props: { size } });
    expect(wrapper.classes()).toContain(`vd-footer-${size}`);
  });

  it("renders the copyright slot inside .vd-footer-copyright after the container content", () => {
    const wrapper = mount(VdFooter, {
      slots: {
        default: '<div class="vd-footer-section">Sections</div>',
        copyright: "2026 Vanduo. MIT License.",
      },
    });

    const copyright = wrapper.get(
      ".vd-footer-container > .vd-footer-copyright",
    );
    expect(copyright.text()).toBe("2026 Vanduo. MIT License.");
    // Copyright is the last child of the container.
    const container = wrapper.get(".vd-footer-container");
    const last = container.element.lastElementChild;
    expect(last?.classList.contains("vd-footer-copyright")).toBe(true);
  });

  it("omits .vd-footer-copyright when no copyright slot is provided", () => {
    const wrapper = mount(VdFooter, {
      slots: { default: "content" },
    });
    expect(wrapper.find(".vd-footer-copyright").exists()).toBe(false);
  });
});
