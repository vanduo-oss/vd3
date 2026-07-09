import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdCard from "../../src/components/VdCard.vue";

describe("VdCard", () => {
  it("renders a section.vd-card with the default slot inside vd-card-body", () => {
    const wrapper = mount(VdCard, { slots: { default: "Card body" } });

    expect(wrapper.element.tagName).toBe("SECTION");
    expect(wrapper.classes()).toContain("vd-card");
    expect(wrapper.classes()).not.toContain("vd-card-elevated");
    expect(wrapper.classes()).not.toContain("vd-card-interactive");

    const body = wrapper.get("div.vd-card-body");
    expect(body.text()).toBe("Card body");
    // header/footer are conditional on their slots.
    expect(wrapper.find("header").exists()).toBe(false);
    expect(wrapper.find("footer").exists()).toBe(false);
  });

  it("elevated adds vd-card-elevated", () => {
    const wrapper = mount(VdCard, { props: { elevated: true } });
    expect(wrapper.classes()).toContain("vd-card-elevated");
  });

  it("interactive adds vd-card-interactive", () => {
    const wrapper = mount(VdCard, { props: { interactive: true } });
    expect(wrapper.classes()).toContain("vd-card-interactive");
  });

  it("both modifiers can be combined", () => {
    const wrapper = mount(VdCard, {
      props: { elevated: true, interactive: true },
    });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "vd-card",
        "vd-card-elevated",
        "vd-card-interactive",
      ]),
    );
  });

  it("renders header slot in header.vd-card-header only when provided", () => {
    const wrapper = mount(VdCard, {
      slots: { header: "<h3>Title</h3>", default: "Body" },
    });

    const header = wrapper.get("header.vd-card-header");
    expect(header.find("h3").exists()).toBe(true);
    expect(header.text()).toBe("Title");
  });

  it("renders footer slot in footer.vd-card-footer only when provided", () => {
    const wrapper = mount(VdCard, {
      slots: { footer: "<button>OK</button>", default: "Body" },
    });

    const footer = wrapper.get("footer.vd-card-footer");
    expect(footer.find("button").exists()).toBe(true);
  });

  it("keeps header, body, footer in document order", () => {
    const wrapper = mount(VdCard, {
      slots: { header: "H", default: "B", footer: "F" },
    });

    const children = Array.from(wrapper.element.children).map((el) =>
      (el as Element).className.trim(),
    );
    expect(children).toEqual([
      "vd-card-header",
      "vd-card-body",
      "vd-card-footer",
    ]);
  });
});
