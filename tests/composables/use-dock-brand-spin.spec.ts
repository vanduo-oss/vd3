import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  ensureDockBrandSpin,
  settleDockBrandSpin,
  useDockBrandSpin,
} from "../../src/composables/useDockBrandSpin";

describe("dock brand spin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts and settles a spin from the current angle", () => {
    const spin = document.createElement("div");
    const running = { id: "vd-dock-brand-spin", cancel: vi.fn() };
    const settleAnim = { id: "vd-dock-brand-settle", cancel: vi.fn() };
    const otherAnim = { id: "other", cancel: vi.fn() };
    spin.getAnimations = () => [
      running as unknown as Animation,
      settleAnim as unknown as Animation,
      otherAnim as unknown as Animation,
    ];
    const animate = vi.fn(() => ({ id: "next" }) as Animation);
    spin.animate = animate;
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "40deg",
    } as unknown as CSSStyleDeclaration);

    ensureDockBrandSpin(spin, 5000);
    expect(running.cancel).toHaveBeenCalled();
    expect(settleAnim.cancel).toHaveBeenCalled();
    expect(otherAnim.cancel).not.toHaveBeenCalled();
    expect(animate).toHaveBeenCalled();
    expect(spin.style.getPropertyValue("--vd-dock-brand-angle")).toBe("40deg");

    settleDockBrandSpin(spin, false);
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("snaps upright when motion is reduced or animation is unavailable", () => {
    const spin = document.createElement("div");
    settleDockBrandSpin(spin, true);
    expect(spin.style.getPropertyValue("--vd-dock-brand-angle")).toBe("0deg");

    const plain = document.createElement("div");
    expect(ensureDockBrandSpin(plain, 900)).toBeNull();
  });

  it("handles reduced motion and missing brand mark in useDockBrandSpin", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));

    const EmptyHost = defineComponent({
      setup() {
        const dock = ref<HTMLElement | null>(null);
        const enabled = ref(true);
        useDockBrandSpin(dock, enabled);
        return () => h("div", { ref: dock, class: "vd-dock" });
      },
    });
    const emptyWrapper = mount(EmptyHost);
    emptyWrapper.unmount();

    const ReducedHost = defineComponent({
      setup() {
        const dock = ref<HTMLElement | null>(null);
        const enabled = ref(true);
        useDockBrandSpin(dock, enabled);
        return () =>
          h("div", { ref: dock, class: "vd-dock" }, [
            h("button", { class: "vd-dock-brand" }, [
              h("span", { class: "vd-dock-brand-spin" }),
            ]),
          ]);
      },
    });
    const reducedWrapper = mount(ReducedHost, { attachTo: document.body });
    const brand = reducedWrapper.get(".vd-dock-brand").element;
    brand.dispatchEvent(new Event("pointerenter"));
    expect(
      (
        reducedWrapper.get(".vd-dock-brand-spin").element as HTMLElement
      ).style.getPropertyValue("--vd-dock-brand-angle"),
    ).toBe("0deg");
    reducedWrapper.unmount();
  });

  it("spins on pointer and morph, then settles on leave", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const animate = vi.fn(() => ({ id: "spin" }) as Animation);
    const listeners = new Map<string, EventListener>();
    const original = HTMLElement.prototype.addEventListener;
    HTMLElement.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (
        this.classList.contains("vd-dock-brand") &&
        typeof listener === "function"
      ) {
        listeners.set(type, listener);
      }
      return original.call(
        this,
        type,
        listener as EventListenerOrEventListenerObject,
        options,
      );
    };

    const enabled = ref(true);
    const Host = defineComponent({
      setup() {
        const dock = ref<HTMLElement | null>(null);
        useDockBrandSpin(dock, enabled);
        return () =>
          h("div", { ref: dock, class: "vd-dock" }, [
            h("button", { class: "vd-dock-brand" }, [
              h("span", { class: "vd-dock-brand-spin" }),
            ]),
          ]);
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    const spin = wrapper.get("span").element as HTMLElement;
    const dock = wrapper.element as HTMLElement;
    spin.animate = animate;
    spin.getAnimations = () => [];

    const fire = (type: string, event: Event): void => {
      listeners.get(type)?.call(wrapper.get("button").element, event);
    };

    expect(listeners.has("pointerenter")).toBe(true);
    fire("pointerenter", new Event("pointerenter"));
    expect(
      spin.style.getPropertyValue("--vd-dock-brand-angle") || "spin",
    ).not.toBe("");
    expect(animate).toHaveBeenCalled();

    dock.classList.add("is-morphing");
    await nextTick();
    // Leave while morphing -> stays spinning until morph finishes, then settles
    fire("pointerleave", new Event("pointerleave"));
    dock.classList.remove("is-morphing");
    await nextTick();
    // Morph while engaged, then finish morph while still engaged -> resumes hover spin
    fire("focusin", new Event("focusin"));
    dock.classList.add("is-morphing");
    await nextTick();
    dock.classList.remove("is-morphing");
    await nextTick();
    fire("pointerup", new PointerEvent("pointerup", { pointerType: "touch" }));
    fire("pointerdown", new Event("pointerdown"));
    fire(
      "pointercancel",
      new PointerEvent("pointercancel", { pointerType: "mouse" }),
    );
    fire("focusout", new Event("focusout"));
    enabled.value = false;
    await nextTick();
    HTMLElement.prototype.addEventListener = original;
    wrapper.unmount();
  });
});
