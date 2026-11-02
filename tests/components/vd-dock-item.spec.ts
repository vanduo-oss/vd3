import { afterEach, describe, expect, it } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import VdDockItem from "../../src/components/VdDockItem.vue";
import { VD_DOCK_KEY } from "../../src/components/dock-context";
import type {
  DockItemLayout,
  DockPlacement,
} from "../../src/composables/useDockOrientation";

function mountItem(
  props: {
    icon?: string;
    label: string;
    active?: boolean;
    activeIconFill?: boolean;
    tooltip?: string | boolean;
    badge?: string | number;
    href?: string;
    as?: string;
  },
  placement: DockPlacement = "bottom",
  itemLayout: DockItemLayout = "stack",
) {
  return mount(VdDockItem, {
    props,
    global: {
      provide: {
        [VD_DOCK_KEY as symbol]: {
          placement: ref(placement),
          itemLayout: computed(() => itemLayout),
        },
      },
    },
  });
}

enableAutoUnmount(afterEach);

describe("VdDockItem", () => {
  it("renders the icon-above-label contract", () => {
    const wrapper = mount(VdDockItem, {
      props: { icon: "house", label: "Home", active: true },
    });
    const button = wrapper.get("button.vd-dock-item");
    expect(button.classes()).toContain("is-active");
    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-current")).toBe("page");
    expect(button.attributes("aria-label")).toBe("Home");
    expect(button.get(".vd-dock-label").text()).toBe("Home");
    expect(button.get("i.ph-house").classes()).toContain("ph-fill");
  });

  it("exposes a badge, link, and dock tooltip", () => {
    const wrapper = mount(VdDockItem, {
      props: {
        icon: "house",
        label: "Home",
        href: "/home",
        badge: 3,
        tooltip: "Go home",
      },
    });
    const link = wrapper.get("a.vd-dock-item");
    expect(link.attributes("href")).toBe("/home");
    expect(link.attributes("data-tooltip")).toBe("Go home");
    expect(link.attributes("data-tooltip-variant")).toBe("dock");
    expect(link.get(".vd-dock-badge").text()).toBe("3");
    expect(link.get("i").classes()).toContain("ph");
    expect(link.get("i").classes()).not.toContain("ph-fill");
  });

  it("uses the label as a vertical auto tooltip and can opt out", () => {
    const shown = mountItem(
      { icon: "compass", label: "Map", tooltip: true },
      "right",
      "auto",
    );
    expect(shown.get("button").attributes("data-tooltip")).toBe("Map");
    expect(shown.get("button").attributes("data-tooltip-placement")).toBe(
      "left",
    );

    const implied = mountItem({ label: "Docs" }, "left", "auto");
    expect(implied.get("button").attributes("data-tooltip")).toBe("Docs");
    expect(implied.get("button").attributes("data-tooltip-placement")).toBe(
      "right",
    );

    const impliedRight = mountItem({ label: "RightDocs" }, "right", "auto");
    expect(impliedRight.get("button").attributes("data-tooltip")).toBe(
      "RightDocs",
    );
    expect(
      impliedRight.get("button").attributes("data-tooltip-placement"),
    ).toBe("left");

    const horizontalAuto = mountItem({ label: "BottomDocs" }, "bottom", "auto");
    expect(
      horizontalAuto.get("button").attributes("data-tooltip"),
    ).toBeUndefined();

    const hidden = mountItem(
      {
        label: "Quiet",
        tooltip: false,
        active: true,
        activeIconFill: false,
        icon: "bell",
      },
      "left",
      "auto",
    );
    expect(hidden.get("button").attributes("data-tooltip")).toBeUndefined();
    expect(hidden.get("i").classes()).not.toContain("ph-fill");

    const custom = mountItem({ label: "Mark", as: "span", badge: "" });
    expect(custom.get("span.vd-dock-item").attributes("type")).toBeUndefined();
    expect(custom.find(".vd-dock-badge").exists()).toBe(false);

    const anchorWithoutHref = mountItem({ label: "EmptyAnchor", as: "a" });
    expect(
      anchorWithoutHref.get("a.vd-dock-item").attributes("href"),
    ).toBeUndefined();

    const unsafeHref = mountItem({
      label: "Unsafe",
      href: "javascript:alert(1)",
    });
    expect(
      unsafeHref.get("button.vd-dock-item").attributes("href"),
    ).toBeUndefined();

    const malformedHref = mountItem({
      label: "Malformed",
      href: "http://[::1",
    });
    expect(
      malformedHref.get("button.vd-dock-item").attributes("href"),
    ).toBeUndefined();

    const mailtoHref = mountItem({
      label: "Contact",
      href: "mailto:hi@vanduo.dev",
    });
    expect(mailtoHref.get("a.vd-dock-item").attributes("href")).toBe(
      "mailto:hi@vanduo.dev",
    );
  });

  it("places tooltips away from top and bottom edges", () => {
    expect(
      mountItem({ label: "Up", tooltip: true }, "top")
        .get("button")
        .attributes("data-tooltip-placement"),
    ).toBe("bottom");
    expect(
      mountItem({ label: "Down", tooltip: true }, "bottom")
        .get("button")
        .attributes("data-tooltip-placement"),
    ).toBe("top");
  });

  it("omits the icon and current page when idle", () => {
    const wrapper = mount(VdDockItem, {
      props: { label: "About" },
    });
    const button = wrapper.get("button.vd-dock-item");
    expect(button.classes()).not.toContain("is-active");
    expect(button.attributes("aria-current")).toBeUndefined();
    expect(wrapper.find("i").exists()).toBe(false);
    expect(button.get(".vd-dock-label").text()).toBe("About");
  });
});
