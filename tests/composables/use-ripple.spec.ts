import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNode } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useRipple } from "../../src/composables/useRipple";

let mounted: VueWrapper[] = [];

const mountRipple = (
  children: () => VNode[],
  rootProps: Record<string, unknown> = {},
): VueWrapper => {
  const Comp = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      useRipple(root);
      return () => h("div", { ref: root, ...rootProps }, children());
    },
  });
  const wrapper = mount(Comp, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
};

// jsdom reports all-zero rects; give the element a real geometry so wave
// sizing/positioning is observable.
const stubRect = (
  el: HTMLElement,
  rect: { left: number; top: number; width: number; height: number },
): void => {
  el.getBoundingClientRect = () =>
    ({
      x: rect.left,
      y: rect.top,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      toJSON: () => ({}),
    }) as DOMRect;
};

const mousedown = (el: HTMLElement, clientX: number, clientY: number): void => {
  el.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, clientX, clientY }),
  );
};

// jsdom cannot construct TouchEvent; a plain event with a `touches` list is
// enough for the handler, which only reads coordinates.
const touchstart = (
  el: HTMLElement,
  clientX: number,
  clientY: number,
): void => {
  const e = new Event("touchstart", { bubbles: true });
  Object.defineProperty(e, "touches", { value: [{ clientX, clientY }] });
  el.dispatchEvent(e);
};

const waves = (el: HTMLElement): HTMLElement[] =>
  Array.from(el.querySelectorAll<HTMLElement>(".vd-ripple-wave"));

afterEach(() => {
  mounted.forEach((w) => w.unmount());
  mounted = [];
  vi.restoreAllMocks();
});

describe("useRipple", () => {
  it("spawns a wave sized to max(width, height) and centered on the pointer", () => {
    const wrapper = mountRipple(() => [
      h("button", { class: "vd-ripple" }, "Click"),
    ]);
    const btn = wrapper.get("button").element as HTMLElement;
    stubRect(btn, { left: 10, top: 20, width: 100, height: 40 });

    mousedown(btn, 50, 30);

    const all = waves(btn);
    expect(all).toHaveLength(1);
    const wave = all[0];
    expect(wave.tagName).toBe("SPAN");
    expect(wave.style.width).toBe("100px");
    expect(wave.style.height).toBe("100px");
    // left/top place the wave's center (size/2 = 50) at the pointer.
    expect(wave.style.left).toBe("-10px");
    expect(wave.style.top).toBe("-40px");
  });

  it("falls back to the element center when pointer coordinates are unavailable", () => {
    const wrapper = mountRipple(() => [
      h("button", { class: "vd-ripple" }, "Click"),
    ]);
    const btn = wrapper.get("button").element as HTMLElement;
    stubRect(btn, { left: 10, top: 20, width: 100, height: 40 });

    // MouseEvent defaults clientX/clientY to 0 -> framework falls back.
    mousedown(btn, 0, 0);

    const wave = waves(btn)[0];
    expect(wave.style.left).toBe("0px");
    expect(wave.style.top).toBe("-30px");
  });

  it("spawns a wave from touch coordinates via a passive touchstart listener", () => {
    const addSpy = vi.spyOn(HTMLElement.prototype, "addEventListener");
    const wrapper = mountRipple(() => [
      h("button", { class: "vd-ripple" }, "Tap"),
    ]);
    const btn = wrapper.get("button").element as HTMLElement;
    stubRect(btn, { left: 10, top: 20, width: 100, height: 40 });

    touchstart(btn, 30, 40);

    const wave = waves(btn)[0];
    expect(wave.style.left).toBe("-30px");
    expect(wave.style.top).toBe("-30px");

    const touchCall = addSpy.mock.calls.find(([type]) => type === "touchstart");
    expect(touchCall?.[2]).toEqual({ passive: true });
  });

  it("removes the wave on animationend", () => {
    const wrapper = mountRipple(() => [
      h("button", { class: "vd-ripple" }, "Click"),
    ]);
    const btn = wrapper.get("button").element as HTMLElement;
    stubRect(btn, { left: 0, top: 0, width: 100, height: 40 });

    mousedown(btn, 10, 10);
    const wave = waves(btn)[0];
    expect(wave.parentNode).toBe(btn);

    wave.dispatchEvent(new Event("animationend"));
    expect(wave.parentNode).toBeNull();
    expect(waves(btn)).toHaveLength(0);
  });

  it("allows multiple in-flight waves at once", () => {
    const wrapper = mountRipple(() => [
      h("button", { class: "vd-ripple" }, "Click"),
    ]);
    const btn = wrapper.get("button").element as HTMLElement;
    stubRect(btn, { left: 0, top: 0, width: 100, height: 40 });

    mousedown(btn, 10, 10);
    mousedown(btn, 90, 30);
    expect(waves(btn)).toHaveLength(2);
  });

  it("wires .vd-ripple, [data-vd-ripple] descendants and a matching root itself", () => {
    const wrapper = mountRipple(
      () => [
        h("button", { class: "a vd-ripple" }, "A"),
        h("button", { class: "b", "data-vd-ripple": "" }, "B"),
        h("button", { class: "c" }, "C"),
      ],
      { class: "vd-ripple" },
    );
    const root = wrapper.element as HTMLElement;
    const a = wrapper.get(".a").element as HTMLElement;
    const b = wrapper.get(".b").element as HTMLElement;
    const c = wrapper.get(".c").element as HTMLElement;
    [root, a, b, c].forEach((el) =>
      stubRect(el, { left: 0, top: 0, width: 40, height: 40 }),
    );

    mousedown(a, 5, 5);
    mousedown(b, 5, 5);
    expect(waves(a)).toHaveLength(1);
    expect(waves(b)).toHaveLength(1);

    // Unwired element spawns nothing (the mousedown on `c` bubbles to the
    // matching root, which spawns its own wave — the framework behaves the
    // same way for nested ripple surfaces).
    expect(c.querySelectorAll(":scope > .vd-ripple-wave")).toHaveLength(0);

    mousedown(root, 5, 5);
    expect(
      root.querySelectorAll(":scope > .vd-ripple-wave").length,
    ).toBeGreaterThan(0);
  });

  it("removes handlers and lingering waves on unmount", () => {
    const wrapper = mountRipple(() => [
      h("button", { class: "vd-ripple" }, "Click"),
    ]);
    const btn = wrapper.get("button").element as HTMLElement;
    stubRect(btn, { left: 0, top: 0, width: 100, height: 40 });

    mousedown(btn, 10, 10);
    expect(waves(btn)).toHaveLength(1);

    wrapper.unmount();
    mounted = mounted.filter((w) => w !== wrapper);

    expect(waves(btn)).toHaveLength(0);
    mousedown(btn, 10, 10);
    expect(waves(btn)).toHaveLength(0);
  });

  it("keeps sibling instances working after one unmounts", () => {
    const first = mountRipple(() => [
      h("button", { class: "vd-ripple" }, "One"),
    ]);
    const second = mountRipple(() => [
      h("button", { class: "vd-ripple" }, "Two"),
    ]);
    const one = first.get("button").element as HTMLElement;
    const two = second.get("button").element as HTMLElement;
    stubRect(one, { left: 0, top: 0, width: 100, height: 40 });
    stubRect(two, { left: 0, top: 0, width: 100, height: 40 });

    mousedown(two, 10, 10);
    expect(waves(two)).toHaveLength(1);

    first.unmount();
    mounted = mounted.filter((w) => w !== first);

    // The old shim's destroyAll() wiped every instance; the rewrite must not.
    expect(waves(two)).toHaveLength(1);
    mousedown(two, 20, 20);
    expect(waves(two)).toHaveLength(2);
  });
});
