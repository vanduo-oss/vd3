import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdBreadcrumb from "../../src/components/VdBreadcrumb.vue";

describe("VdBreadcrumb", () => {
  it("renders the nav landmark and default aria-label", () => {
    const wrapper = mount(VdBreadcrumb, {
      props: { items: [{ label: "Home", href: "/" }] },
    });

    const nav = wrapper.get("nav");
    expect(nav.classes()).toContain("vd-breadcrumbs");
    expect(nav.attributes("aria-label")).toBe("Breadcrumb");
    expect(wrapper.get("ol").classes()).toContain("vd-breadcrumb");
  });

  it("renders items with the last as the current page (no anchor)", () => {
    const wrapper = mount(VdBreadcrumb, {
      props: {
        items: [
          { label: "Home", href: "/" },
          { label: "Library", href: "/library" },
          { label: "Data" },
        ],
      },
    });

    const items = wrapper.findAll(".vd-breadcrumb-item");
    expect(items).toHaveLength(3);

    // First two are links.
    expect(items[0].get("a.vd-breadcrumb-link").attributes("href")).toBe("/");
    expect(items[0].classes()).not.toContain("vd-breadcrumb-current");
    expect(items[1].get("a.vd-breadcrumb-link").attributes("href")).toBe(
      "/library",
    );

    // Last item is current.
    const last = items[2];
    expect(last.classes()).toContain("vd-breadcrumb-current");
    expect(last.attributes("aria-current")).toBe("page");
    expect(last.find("a").exists()).toBe(false);
    expect(last.text()).toBe("Data");
  });

  it("honors an explicit current item over the last item", () => {
    const wrapper = mount(VdBreadcrumb, {
      props: {
        items: [
          { label: "Home", href: "/", current: true },
          { label: "Library", href: "/library" },
        ],
      },
    });

    const items = wrapper.findAll(".vd-breadcrumb-item");
    expect(items[0].classes()).toContain("vd-breadcrumb-current");
    expect(items[0].attributes("aria-current")).toBe("page");
    expect(items[0].find("a").exists()).toBe(false);
    // Last item is NOT current when an explicit current exists.
    expect(items[1].classes()).not.toContain("vd-breadcrumb-current");
    expect(items[1].find("a.vd-breadcrumb-link").exists()).toBe(true);
  });

  it("maps separator and size to list classes", () => {
    const wrapper = mount(VdBreadcrumb, {
      props: {
        items: [{ label: "Home" }],
        separator: "chevron",
        size: "sm",
      },
    });

    const ol = wrapper.get("ol");
    expect(ol.classes()).toContain("vd-breadcrumb-separator-chevron");
    expect(ol.classes()).toContain("vd-breadcrumb-sm");
  });

  it("defaults to the slash separator and no size class", () => {
    const wrapper = mount(VdBreadcrumb, {
      props: { items: [{ label: "Home" }] },
    });

    const ol = wrapper.get("ol");
    expect(ol.classes()).toContain("vd-breadcrumb-separator-slash");
    expect(ol.classes()).not.toContain("vd-breadcrumb-sm");
    expect(ol.classes()).not.toContain("vd-breadcrumb-lg");
  });

  it("supports a custom aria-label", () => {
    const wrapper = mount(VdBreadcrumb, {
      props: { items: [{ label: "Home" }], ariaLabel: "You are here" },
    });
    expect(wrapper.get("nav").attributes("aria-label")).toBe("You are here");
  });

  it("renders the default slot as an escape hatch instead of items", () => {
    const wrapper = mount(VdBreadcrumb, {
      slots: {
        default:
          '<li class="vd-breadcrumb-item"><a href="/">Custom</a></li>' +
          '<li class="vd-breadcrumb-item vd-breadcrumb-current" aria-current="page">Here</li>',
      },
    });

    const items = wrapper.findAll(".vd-breadcrumb-item");
    expect(items).toHaveLength(2);
    expect(items[0].text()).toBe("Custom");
    expect(items[1].classes()).toContain("vd-breadcrumb-current");
  });
});
