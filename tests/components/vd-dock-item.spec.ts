import { afterEach, describe, expect, it } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import VdDockItem from "../../src/components/VdDockItem.vue";

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
    expect(button.get("i.ph-house").classes()).toContain("ph-house");
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
