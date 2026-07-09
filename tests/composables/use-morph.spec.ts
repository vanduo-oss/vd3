import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type Ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useMorph } from "../../src/composables/useMorph";

// useMorph runs inside a component scope (onMounted/onUnmounted). We build the
// DOM the composable operates on ourselves, hand it in via a ref, and mount a
// throwaway host whose only job is to invoke the composable.
const mountWith = (root: Ref<HTMLElement | null>): VueWrapper =>
  mount(
    defineComponent({
      setup() {
        useMorph(root);
        return () => h("div");
      },
    }),
  );

const buildMorph = (): HTMLElement => {
  const el = document.createElement("button");
  el.className = "vd-morph";
  const current = document.createElement("span");
  current.className = "vd-morph-current";
  current.textContent = "A";
  const next = document.createElement("span");
  next.className = "vd-morph-next";
  next.textContent = "B";
  el.append(current, next);
  return el;
};

const clickAt = (el: HTMLElement, x: number, y: number): void => {
  el.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y }));
};

let container: HTMLElement;

describe("useMorph", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    container.remove();
  });

  it("creates the wave and shine layers as the first two children (aria-hidden)", () => {
    const el = buildMorph();
    container.appendChild(el);
    mountWith(ref(container));

    const wave = el.querySelector(".vd-morph-wave");
    const shine = el.querySelector(".vd-morph-shine");
    expect(wave).not.toBeNull();
    expect(shine).not.toBeNull();
    expect(wave?.getAttribute("aria-hidden")).toBe("true");
    expect(shine?.getAttribute("aria-hidden")).toBe("true");
    // Inserted at the front: wave first, shine right after it.
    expect(el.firstElementChild).toBe(wave);
    expect(wave?.nextElementSibling).toBe(shine);
  });

  it("does not duplicate layers that already exist", () => {
    const el = buildMorph();
    const existing = document.createElement("span");
    existing.className = "vd-morph-wave";
    el.insertBefore(existing, el.firstChild);
    container.appendChild(el);
    mountWith(ref(container));

    expect(el.querySelectorAll(".vd-morph-wave")).toHaveLength(1);
    expect(el.querySelector(".vd-morph-wave")).toBe(existing);
  });

  it('skips elements marked data-vd-morph="manual" (no layers, no handler)', () => {
    const el = buildMorph();
    el.setAttribute("data-vd-morph", "manual");
    container.appendChild(el);
    mountWith(ref(container));

    expect(el.querySelector(".vd-morph-wave")).toBeNull();
    clickAt(el, 10, 10);
    vi.runAllTimers();
    expect(el.classList.contains("is-morphing")).toBe(false);
    // No swap happened.
    expect(el.querySelector(".vd-morph-current")?.textContent).toBe("A");
  });

  it("on click adds is-morphing and positions the wave at the pointer", () => {
    const el = buildMorph();
    container.appendChild(el);
    mountWith(ref(container));

    clickAt(el, 50, 30);
    expect(el.classList.contains("is-morphing")).toBe(true);
    const wave = el.querySelector<HTMLElement>(".vd-morph-wave");
    // jsdom getBoundingClientRect is all-zero, so px === clientX.
    expect(wave?.style.left).toBe("50px");
    expect(wave?.style.top).toBe("30px");
  });

  it("after the default 750ms window removes is-morphing and swaps current/next", () => {
    const el = buildMorph();
    container.appendChild(el);
    mountWith(ref(container));
    const a = el.querySelector(".vd-morph-current");
    const b = el.querySelector(".vd-morph-next");

    clickAt(el, 5, 5);
    vi.advanceTimersByTime(749);
    expect(el.classList.contains("is-morphing")).toBe(true);
    expect(a?.className).toBe("vd-morph-current");

    vi.advanceTimersByTime(1);
    expect(el.classList.contains("is-morphing")).toBe(false);
    // The two panes traded roles.
    expect(a?.className).toBe("vd-morph-next");
    expect(b?.className).toBe("vd-morph-current");
  });

  it("honours a custom --vd-morph-duration (ms and s units)", () => {
    const el = buildMorph();
    el.style.setProperty("--vd-morph-duration", "0.3s");
    container.appendChild(el);
    mountWith(ref(container));
    const a = el.querySelector(".vd-morph-current");

    clickAt(el, 5, 5);
    vi.advanceTimersByTime(299);
    expect(a?.className).toBe("vd-morph-current");
    vi.advanceTimersByTime(1);
    expect(a?.className).toBe("vd-morph-next");
  });

  it("ignores re-entrant clicks while a morph is in flight (swaps once)", () => {
    const el = buildMorph();
    container.appendChild(el);
    mountWith(ref(container));
    const a = el.querySelector(".vd-morph-current");

    clickAt(el, 5, 5);
    vi.advanceTimersByTime(100);
    clickAt(el, 5, 5); // ignored: still morphing
    vi.advanceTimersByTime(650); // resolves the first (and only) morph
    expect(a?.className).toBe("vd-morph-next"); // one swap, not two
  });

  it("allows a fresh morph after the previous one settles", () => {
    const el = buildMorph();
    container.appendChild(el);
    mountWith(ref(container));
    const a = el.querySelector(".vd-morph-current");

    clickAt(el, 5, 5);
    vi.advanceTimersByTime(750);
    expect(a?.className).toBe("vd-morph-next");
    clickAt(el, 5, 5);
    vi.advanceTimersByTime(750);
    expect(a?.className).toBe("vd-morph-current"); // swapped back
  });

  it("removes the click listener on unmount", () => {
    const el = buildMorph();
    container.appendChild(el);
    const wrapper = mountWith(ref(container));
    wrapper.unmount();

    clickAt(el, 5, 5);
    vi.runAllTimers();
    expect(el.classList.contains("is-morphing")).toBe(false);
    expect(el.querySelector(".vd-morph-current")?.textContent).toBe("A");
  });

  it("no-ops when the root ref is null", () => {
    expect(() => mountWith(ref(null))).not.toThrow();
  });
});
