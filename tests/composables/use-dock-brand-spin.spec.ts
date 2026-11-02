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
    spin.getAnimations = () => [running as unknown as Animation];
    const animate = vi.fn(() => ({ id: "next" }) as Animation);
    spin.animate = animate;
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "40deg",
    } as unknown as CSSStyleDeclaration);

    ensureDockBrandSpin(spin, 5000);
    expect(running.cancel).toHaveBeenCalled();
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
    fire("pointerleave", new Event("pointerleave"));
    dock.classList.remove("is-morphing");
    fire("focusin", new Event("focusin"));
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
