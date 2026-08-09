import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type Ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useLiquidGradient } from "../../src/composables/useLiquidGradient";

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
        useLiquidGradient(root);
        return () => h("div");
      },
    }),
  );

const buildHost = (
  active = true,
): { root: HTMLElement; host: HTMLElement; canvas: HTMLCanvasElement } => {
  const root = document.createElement("div");
  const host = document.createElement("div");
  host.className = active
    ? "vd-liquid-gradient vd-liquid-gradient-active"
    : "vd-liquid-gradient";
  const canvas = document.createElement("canvas");
  canvas.className = "vd-liquid-gradient-canvas";
  host.appendChild(canvas);
  root.appendChild(host);
  document.body.appendChild(root);
  return { root, host, canvas };
};

describe("useLiquidGradient", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback): number => {
        cb(0);
        return 1;
      },
    );
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("does not throw when WebGL is unavailable", async () => {
    const { root, canvas } = buildHost(true);
    vi.spyOn(canvas, "getContext").mockReturnValue(null);
    const rootRef = ref<HTMLElement | null>(root);
    expect(() => mountWith(rootRef)).not.toThrow();
    await nextTick();
    rootRef.value = null;
  });

  it("creates a canvas when missing and cleans up on unmount", async () => {
    const root = document.createElement("div");
    const host = document.createElement("div");
    host.className = "vd-liquid-gradient vd-liquid-gradient-active";
    root.appendChild(host);
    document.body.appendChild(root);

    const rootRef = ref<HTMLElement | null>(root);
    const wrapper = mountWith(rootRef);
    await nextTick();

    expect(host.querySelector("canvas.vd-liquid-gradient-canvas")).not.toBeNull();

    const removeSpy = vi.spyOn(window, "removeEventListener");
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalled();
  });

  it("ignores hosts outside the scanned root", async () => {
    const outside = document.createElement("div");
    outside.className = "vd-liquid-gradient vd-liquid-gradient-active";
    document.body.appendChild(outside);

    const { root } = buildHost(false);
    const rootRef = ref<HTMLElement | null>(root);
    expect(() => mountWith(rootRef)).not.toThrow();
    await nextTick();
  });
});
