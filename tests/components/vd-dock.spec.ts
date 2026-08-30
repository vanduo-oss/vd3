import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import VdDock from "../../src/components/VdDock.vue";
import { DOCK_MORPH_MS } from "../../src/composables/useDockOrientation";

enableAutoUnmount(afterEach);

let narrowViewport = false;

function stubMatchMedia(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches:
      query === "(max-width: 520px)"
        ? narrowViewport
        : query === "(prefers-reduced-motion: reduce)"
          ? false
          : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

const slots = {
  brand: '<span class="brand-mark">u</span>',
  default: '<button class="item">Home</button>',
  actions: '<button class="act">Theme</button>',
};

describe("VdDock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    narrowViewport = false;
    stubMatchMedia();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders the slot-driven class contract", () => {
    const wrapper = mount(VdDock, { slots });
    const nav = wrapper.get("nav.vd-dock");
    expect(nav.classes()).toEqual(
      expect.arrayContaining([
        "vd-dock",
        "vd-dock-fixed",
        "vd-dock-dark",
        "vd-glass",
        "vd-glass-34",
        "vd-glass-contrast",
        "vd-dock-items-stack",
        "vd-dock-edge-bottom",
        "is-horizontal",
      ]),
    );
    expect(nav.attributes("aria-label")).toBe("Primary");
    expect(nav.attributes("style")).toContain("--vd-dock-radius: 1.25rem");
    expect(nav.get(".vd-dock-brand").text()).toContain("u");
    expect(nav.get(".vd-dock-links .item").text()).toBe("Home");
    expect(nav.get(".vd-dock-actions .act").text()).toBe("Theme");
  });

  it("uses contained positioning and inline items", () => {
    const wrapper = mount(VdDock, {
      props: { position: "contained", itemLayout: "inline", dark: false },
      slots,
    });
    const nav = wrapper.get("nav.vd-dock");
    expect(nav.classes()).toContain("vd-dock-contained");
    expect(nav.classes()).not.toContain("vd-dock-fixed");
    expect(nav.classes()).toContain("vd-dock-items-inline");
    expect(nav.classes()).not.toContain("vd-dock-dark");
  });

  it("applies tint, glass, and pill radius", () => {
    const wrapper = mount(VdDock, {
      props: { tint: "violet", glass: 8, radius: "9999" },
      slots,
    });
    const nav = wrapper.get("nav.vd-dock");
    expect(nav.classes()).toContain("vd-dock-tint-violet");
    expect(nav.classes()).toContain("vd-glass-8");
    expect(nav.attributes("style")).toContain("--vd-dock-radius: 9999px");
  });

  it("keeps the hue but drops the tinted surface in accent tint mode", () => {
    const wrapper = mount(VdDock, {
      props: { tint: "blue", tintMode: "accent" },
      slots,
    });
    const nav = wrapper.get("nav.vd-dock");
    // The hue class still sets --vd-dock-tint for items and the brand slot;
    // the accent class is what the CSS uses to keep the pill ink.
    expect(nav.classes()).toContain("vd-dock-tint-blue");
    expect(nav.classes()).toContain("vd-dock-tint-accent");
  });

  it("defaults to surface tint mode and ignores accent without a tint", () => {
    const surface = mount(VdDock, { props: { tint: "blue" }, slots });
    expect(surface.get("nav.vd-dock").classes()).toContain("vd-dock-tint-blue");
    expect(surface.get("nav.vd-dock").classes()).not.toContain(
      "vd-dock-tint-accent",
    );

    // Accent is meaningless with nothing to accent with.
    const untinted = mount(VdDock, { props: { tintMode: "accent" }, slots });
    expect(untinted.get("nav.vd-dock").classes()).not.toContain(
      "vd-dock-tint-accent",
    );
  });

  it("falls back to surface for an invalid tint mode", () => {
    const wrapper = mount(VdDock, {
      props: {
        tint: "blue",
        tintMode: "translucent" as unknown as "accent",
      },
      slots,
    });
    expect(wrapper.get("nav.vd-dock").classes()).not.toContain(
      "vd-dock-tint-accent",
    );
  });

  it("falls back for invalid glass, radius, and tint", () => {
    const wrapper = mount(VdDock, {
      props: {
        glass: 99 as unknown as 34,
        radius: "nope",
        tint: "chartreuse" as unknown as "red",
      },
      slots,
    });
    const nav = wrapper.get("nav.vd-dock");
    expect(nav.classes()).toContain("vd-glass-34");
    expect(nav.classes().some((c) => c.startsWith("vd-dock-tint-"))).toBe(
      false,
    );
    expect(nav.attributes("style")).toContain("--vd-dock-radius: 1.25rem");
  });

  it("toggles orientation from the brand and emits v-model", async () => {
    const wrapper = mount(VdDock, { slots });
    await wrapper.get(".vd-dock-brand").trigger("click");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    await nextTick();
    expect(wrapper.emitted("update:orientation")?.at(-1)).toEqual(["vertical"]);
    expect(wrapper.emitted("update:placement")?.at(-1)).toEqual(["left"]);
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-vertical");
    expect(wrapper.get("nav.vd-dock").classes()).toContain("vd-dock-edge-left");
    expect(wrapper.get(".vd-dock-brand").attributes("aria-pressed")).toBe(
      "true",
    );
  });

  it("cycles all four edges when cycle is edges", async () => {
    const wrapper = mount(VdDock, {
      props: { cycle: "edges" },
      slots,
    });
    const walked: string[] = [];
    for (let i = 0; i < 4; i++) {
      await wrapper.get(".vd-dock-brand").trigger("click");
      vi.advanceTimersByTime(DOCK_MORPH_MS.shrink + DOCK_MORPH_MS.grow);
      await nextTick();
      walked.push(wrapper.emitted("update:placement")?.at(-1)?.[0] as string);
    }
    expect(walked).toEqual(["left", "top", "right", "bottom"]);
    expect(wrapper.get("nav.vd-dock").classes()).toContain(
      "vd-dock-edge-bottom",
    );
  });

  it("does not toggle when brandToggles is false", async () => {
    const wrapper = mount(VdDock, {
      props: { brandToggles: false },
      slots,
    });
    const brand = wrapper.get(".vd-dock-brand");
    expect(brand.attributes("aria-disabled")).toBe("true");
    await brand.trigger("click");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink + DOCK_MORPH_MS.grow);
    expect(wrapper.emitted("update:orientation")).toBeUndefined();
  });

  it("does not toggle when the viewport is narrow", async () => {
    narrowViewport = true;
    stubMatchMedia();
    const wrapper = mount(VdDock, { slots });
    await nextTick();
    const brand = wrapper.get(".vd-dock-brand");
    expect(brand.attributes("aria-disabled")).toBe("true");
    await brand.trigger("click");
    expect(wrapper.emitted("update:orientation")).toBeUndefined();
  });

  it("plays to a parent-driven orientation", async () => {
    const wrapper = mount(VdDock, {
      props: { orientation: "horizontal" },
      slots,
    });
    await wrapper.setProps({ orientation: "vertical" });
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-vertical");
  });

  it("ignores a parent orientation that already matches", async () => {
    const wrapper = mount(VdDock, {
      props: { orientation: "horizontal" },
      slots,
    });
    await wrapper.get(".vd-dock-brand").trigger("click");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    await nextTick();
    await wrapper.setProps({ orientation: "vertical" });
    await wrapper.setProps({ orientation: undefined });
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-vertical");
  });

  it("omits brand and actions when those slots are empty", () => {
    const wrapper = mount(VdDock, {
      slots: { default: '<span class="only">Nav</span>' },
    });
    expect(wrapper.find(".vd-dock-brand").exists()).toBe(false);
    expect(wrapper.find(".vd-dock-actions").exists()).toBe(false);
    expect(wrapper.get(".vd-dock-links .only").text()).toBe("Nav");
  });

  it("exposes the morph API", async () => {
    const wrapper = mount(VdDock, { slots });
    const exposed = wrapper.vm as unknown as {
      playTo: (target: "horizontal" | "vertical") => void;
      snapTo: (target: "horizontal" | "vertical") => void;
      toggle: () => void;
    };
    exposed.snapTo("vertical");
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-vertical");
    exposed.playTo("horizontal");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink + DOCK_MORPH_MS.grow);
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-horizontal");
    exposed.toggle();
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-vertical");
  });

  it("does not persist by default", async () => {
    const wrapper = mount(VdDock, { slots });
    await wrapper.get(".vd-dock-brand").trigger("click");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    expect(localStorage.getItem("vanduo-dock-orient")).toBeNull();
  });

  it("persists when asked", async () => {
    const wrapper = mount(VdDock, {
      props: { persist: true, storageKey: "demo-dock" },
      slots,
    });
    await wrapper.get(".vd-dock-brand").trigger("click");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    expect(localStorage.getItem("demo-dock")).toBe("left");
  });

  it("applies placement and morphs the top pair to the right", async () => {
    const wrapper = mount(VdDock, {
      props: { placement: "top" },
      slots,
    });
    expect(wrapper.get("nav.vd-dock").classes()).toContain("vd-dock-edge-top");
    await wrapper.setProps({ placement: "right" });
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain(
      "vd-dock-edge-right",
    );
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-vertical");
    expect(wrapper.emitted("update:placement")?.at(-1)).toEqual(["right"]);
  });

  it("ignores a parent placement that already matches", async () => {
    const wrapper = mount(VdDock, {
      props: { placement: "bottom" },
      slots,
    });
    await wrapper.get(".vd-dock-brand").trigger("click");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain("vd-dock-edge-left");
    await wrapper.setProps({ placement: "left" });
    await wrapper.setProps({ placement: undefined });
    expect(wrapper.get("nav.vd-dock").classes()).toContain("vd-dock-edge-left");
  });

  it("does not snap back when placement lands before orientation", async () => {
    const wrapper = mount(VdDock, {
      props: { placement: "bottom", orientation: "horizontal" },
      slots,
    });
    await wrapper.get(".vd-dock-brand").trigger("click");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    await nextTick();
    expect(wrapper.emitted("update:placement")?.at(-1)).toEqual(["left"]);
    await wrapper.setProps({ placement: "left", orientation: "horizontal" });
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain("vd-dock-edge-left");
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-vertical");
  });

  it("prefers placement when orientation still says vertical", async () => {
    const wrapper = mount(VdDock, {
      props: { placement: "left", orientation: "vertical" },
      slots,
    });
    expect(wrapper.get("nav.vd-dock").classes()).toContain("vd-dock-edge-left");
    await wrapper.setProps({ placement: "bottom", orientation: "vertical" });
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain(
      "vd-dock-edge-bottom",
    );
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-horizontal");
    expect(wrapper.emitted("update:orientation")?.at(-1)).toEqual([
      "horizontal",
    ]);
  });

  it("snaps a parent placement while a morph is in flight", async () => {
    const wrapper = mount(VdDock, { slots });
    await wrapper.get(".vd-dock-brand").trigger("click");
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-square");
    await wrapper.setProps({ placement: "top" });
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain("vd-dock-edge-top");
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-horizontal");
    expect(wrapper.get("nav.vd-dock").classes()).not.toContain("is-square");
  });

  it("snaps a parent orientation while a morph is in flight", async () => {
    const wrapper = mount(VdDock, {
      props: { orientation: "horizontal" },
      slots,
    });
    await wrapper.get(".vd-dock-brand").trigger("click");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-morphing");
    await wrapper.setProps({ orientation: "vertical" });
    await wrapper.setProps({ orientation: "horizontal" });
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-horizontal");
    expect(wrapper.get("nav.vd-dock").classes()).toContain(
      "vd-dock-edge-bottom",
    );
  });

  it("reasserts placement when the visual phase is stale", async () => {
    const wrapper = mount(VdDock, {
      props: { placement: "bottom", orientation: "horizontal" },
      slots,
    });
    await wrapper.get(".vd-dock-brand").trigger("click");
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-square");
    await wrapper.setProps({ orientation: "vertical" });
    await nextTick();
    expect(wrapper.get("nav.vd-dock").classes()).toContain(
      "vd-dock-edge-bottom",
    );
    expect(wrapper.get("nav.vd-dock").classes()).toContain("is-horizontal");
  });
});
