import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type Ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useParallax } from "../../src/composables/useParallax";

// jsdom lacks matchMedia and gives us a controllable rAF; we stub both so the
// reduced-motion gate and the rAF-throttled scroll pump are deterministic.
// With getBoundingClientRect all-zero and innerHeight pinned to 1000, the
// scroll progress is always 1, so offset === 50 * containerSpeed.
let rafCbs: FrameRequestCallback[] = [];
let rafCount = 0;

const flushRaf = (): void => {
  const cbs = rafCbs;
  rafCbs = [];
  cbs.forEach((cb) => cb(0));
};

const stubMatchMedia = (matches: boolean): void => {
  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
};

const mountWith = (root: Ref<HTMLElement | null>): VueWrapper =>
  mount(
    defineComponent({
      setup() {
        useParallax(root);
        return () => h("div");
      },
    }),
  );

interface LayerSpec {
  cls?: string;
  parallaxSpeed?: string;
  speed?: string;
}

// The composable scans `root.querySelectorAll(".vd-parallax")` for DESCENDANT
// containers, so the container must sit inside the root, not be the root.
const buildParallax = (
  containerClasses: string[],
  layers: LayerSpec[],
): { root: HTMLElement; layerEls: HTMLElement[] } => {
  const root = document.createElement("div");
  const container = document.createElement("section");
  container.classList.add("vd-parallax", ...containerClasses);
  const layerEls = layers.map((spec) => {
    const layer = document.createElement("div");
    layer.className = spec.cls ?? "vd-parallax-layer";
    if (spec.parallaxSpeed !== undefined)
      layer.dataset.parallaxSpeed = spec.parallaxSpeed;
    if (spec.speed !== undefined) layer.dataset.speed = spec.speed;
    container.appendChild(layer);
    return layer;
  });
  root.appendChild(container);
  document.body.appendChild(root);
  return { root, layerEls };
};

const originalInnerHeight = Object.getOwnPropertyDescriptor(
  window,
  "innerHeight",
);

describe("useParallax", () => {
  beforeEach(() => {
    rafCbs = [];
    rafCount = 0;
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback): number => {
        rafCbs.push(cb);
        rafCount += 1;
        return rafCount;
      },
    );
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalInnerHeight) {
      Object.defineProperty(window, "innerHeight", originalInnerHeight);
    }
    document.body.innerHTML = "";
  });

  it("applies an initial vertical transform per layer (default speed 1)", () => {
    const { root, layerEls } = buildParallax([], [{}]);
    mountWith(ref(root));
    // offset = (1 - 0.5) * 1 * 100 = 50; layerSpeed 1 -> 50px.
    expect(layerEls[0].style.transform).toBe("translateY(50px)");
  });

  it("scales the offset by the container speed class (slow / fast)", () => {
    const slow = buildParallax(["vd-parallax-slow"], [{}]);
    mountWith(ref(slow.root));
    expect(slow.layerEls[0].style.transform).toBe("translateY(25px)");

    const fast = buildParallax(["vd-parallax-fast"], [{}]);
    mountWith(ref(fast.root));
    expect(fast.layerEls[0].style.transform).toBe("translateY(75px)");
  });

  it("uses translateX for horizontal containers", () => {
    const { root, layerEls } = buildParallax(["vd-parallax-horizontal"], [{}]);
    mountWith(ref(root));
    expect(layerEls[0].style.transform).toBe("translateX(50px)");
  });

  it("reads per-layer data-parallax-speed (and data-speed as fallback)", () => {
    const { root, layerEls } = buildParallax(
      [],
      [{ parallaxSpeed: "2" }, { speed: "0.5" }, {}],
    );
    mountWith(ref(root));
    // base offset 50 * layerSpeed
    expect(layerEls[0].style.transform).toBe("translateY(100px)");
    expect(layerEls[1].style.transform).toBe("translateY(25px)");
    expect(layerEls[2].style.transform).toBe("translateY(50px)");
  });

  it("also targets .vd-parallax-bg layers", () => {
    const { root, layerEls } = buildParallax([], [{ cls: "vd-parallax-bg" }]);
    mountWith(ref(root));
    expect(layerEls[0].style.transform).toBe("translateY(50px)");
  });

  it("is fully disabled under prefers-reduced-motion", () => {
    stubMatchMedia(true);
    const { root, layerEls } = buildParallax([], [{}]);
    mountWith(ref(root));
    expect(layerEls[0].style.transform).toBe("");
    // No scroll listener wired either.
    window.dispatchEvent(new Event("scroll"));
    expect(rafCount).toBe(0);
    expect(layerEls[0].style.transform).toBe("");
  });

  it("rAF-throttles the scroll handler (coalesces bursts into one frame)", () => {
    const { root } = buildParallax([], [{}]);
    mountWith(ref(root));
    // Mount schedules exactly one frame.
    expect(rafCount).toBe(1);

    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    // Still ticking from the mount frame — no extra frames queued.
    expect(rafCount).toBe(1);

    flushRaf(); // clears the ticking flag
    window.dispatchEvent(new Event("scroll"));
    expect(rafCount).toBe(2);
  });

  it("resets transforms and detaches the listener on unmount", () => {
    const { root, layerEls } = buildParallax([], [{}]);
    const wrapper = mountWith(ref(root));
    expect(layerEls[0].style.transform).toBe("translateY(50px)");

    wrapper.unmount();
    expect(layerEls[0].style.transform).toBe("");

    const before = rafCount;
    window.dispatchEvent(new Event("scroll"));
    expect(rafCount).toBe(before); // listener gone
  });

  it("no-ops when the root ref is null", () => {
    expect(() => mountWith(ref(null))).not.toThrow();
  });
});
