import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { enableAutoUnmount, mount, type VueWrapper } from "@vue/test-utils";
import {
  DOCK_MORPH_MS,
  DOCK_NARROW_QUERY,
  useDockOrientation,
  type DockOrientation,
  type DockPlacement,
} from "../../src/composables/useDockOrientation";
import { setStoragePrefix } from "../../src/composables/useTheme";

enableAutoUnmount(afterEach);

interface DockApi {
  placement: { value: DockPlacement };
  orientation: { value: DockOrientation };
  visualPhase: { value: string };
  isMorphing: { value: boolean };
  isNarrow: { value: boolean };
  dockClasses: { value: Record<string, boolean> };
  orientClass: { value: string };
  brandLabel: { value: string };
  brandPressed: { value: boolean };
  canToggle: { value: boolean };
  toggle: () => void;
  playTo: (target: DockOrientation) => void;
  playToPlacement: (
    target: DockPlacement,
    options?: { interrupt?: boolean },
  ) => void;
  snapTo: (target: DockOrientation) => void;
  snapToPlacement: (target: DockPlacement) => void;
}

const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();

function dispatchMedia(query: string, matches: boolean): void {
  listeners.get(query)?.forEach((cb) => {
    cb({ matches } as MediaQueryListEvent);
  });
}

function stubMatchMedia(opts: {
  narrow?: boolean;
  reducedMotion?: boolean;
}): void {
  listeners.clear();
  vi.stubGlobal("matchMedia", (query: string) => {
    const matches =
      query === DOCK_NARROW_QUERY
        ? Boolean(opts.narrow)
        : query === "(prefers-reduced-motion: reduce)"
          ? Boolean(opts.reducedMotion)
          : false;
    return {
      matches,
      media: query,
      addEventListener: (
        _type: string,
        cb: (event: MediaQueryListEvent) => void,
      ) => {
        const set = listeners.get(query) ?? new Set();
        set.add(cb);
        listeners.set(query, set);
      },
      removeEventListener: (
        _type: string,
        cb: (event: MediaQueryListEvent) => void,
      ) => {
        listeners.get(query)?.delete(cb);
      },
    };
  });
}

function mountDock(options: Parameters<typeof useDockOrientation>[0] = {}): {
  wrapper: VueWrapper;
  api: DockApi;
} {
  let api!: DockApi;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useDockOrientation(options) as DockApi;
        return () => h("div");
      },
    }),
  );
  return { wrapper, api };
}

describe("useDockOrientation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    setStoragePrefix("vanduo-");
    stubMatchMedia({ narrow: false, reducedMotion: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setStoragePrefix("vanduo-");
  });

  it("starts horizontal at rest", () => {
    const { api } = mountDock();
    expect(api.placement.value).toBe("bottom");
    expect(api.orientation.value).toBe("horizontal");
    expect(api.visualPhase.value).toBe("horizontal");
    expect(api.isMorphing.value).toBe(false);
    expect(api.dockClasses.value).toEqual({
      "is-horizontal": true,
      "is-square": false,
      "is-vertical": false,
      "is-morphing": false,
      "vd-dock-edge-bottom": true,
    });
    expect(api.orientClass.value).toBe("vd-dock-orient-horizontal");
    expect(api.brandLabel.value).toBe("Use vertical dock");
    expect(api.brandPressed.value).toBe(false);
    expect(api.canToggle.value).toBe(true);
  });

  it("plays through the square waypoint", () => {
    const { api } = mountDock();
    api.playTo("vertical");
    expect(api.isMorphing.value).toBe(true);
    expect(api.visualPhase.value).toBe("square");
    expect(api.orientation.value).toBe("horizontal");
    expect(api.dockClasses.value["is-square"]).toBe(true);
    expect(api.dockClasses.value["is-morphing"]).toBe(true);

    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    expect(api.placement.value).toBe("left");
    expect(api.orientation.value).toBe("vertical");
    expect(api.visualPhase.value).toBe("vertical");
    expect(api.dockClasses.value["vd-dock-edge-left"]).toBe(true);
    expect(api.isMorphing.value).toBe(true);
    expect(api.orientClass.value).toBe("vd-dock-orient-vertical");
    expect(api.brandLabel.value).toBe("Use horizontal dock");
    expect(api.brandPressed.value).toBe(true);

    vi.advanceTimersByTime(DOCK_MORPH_MS.grow);
    expect(api.isMorphing.value).toBe(false);
    expect(api.dockClasses.value["is-vertical"]).toBe(true);
  });

  it("ignores playTo while morphing", () => {
    const { api } = mountDock();
    api.playTo("vertical");
    api.playTo("horizontal");
    expect(api.visualPhase.value).toBe("square");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink + DOCK_MORPH_MS.grow);
    expect(api.orientation.value).toBe("vertical");
  });

  it("no-ops when already at the target rest", () => {
    const { api } = mountDock({ persist: true });
    api.playTo("horizontal");
    expect(api.isMorphing.value).toBe(false);
    expect(localStorage.getItem("vanduo-dock-orient")).toBe("bottom");
  });

  it("toggles to the opposite rest", () => {
    const { api } = mountDock();
    api.toggle();
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink + DOCK_MORPH_MS.grow);
    expect(api.orientation.value).toBe("vertical");
    expect(api.placement.value).toBe("left");
    api.toggle();
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink + DOCK_MORPH_MS.grow);
    expect(api.orientation.value).toBe("horizontal");
    expect(api.placement.value).toBe("bottom");
  });

  it("does not toggle while morphing or narrow", () => {
    const { api } = mountDock();
    api.toggle();
    api.toggle();
    expect(api.visualPhase.value).toBe("square");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink + DOCK_MORPH_MS.grow);

    dispatchMedia(DOCK_NARROW_QUERY, true);
    expect(api.isNarrow.value).toBe(true);
    expect(api.canToggle.value).toBe(false);
    expect(api.orientation.value).toBe("horizontal");
    api.toggle();
    expect(api.orientation.value).toBe("horizontal");
    api.playTo("vertical");
    expect(api.orientation.value).toBe("horizontal");
    dispatchMedia(DOCK_NARROW_QUERY, false);
    expect(api.isNarrow.value).toBe(false);
  });

  it("narrow change from the right pair snaps to top", () => {
    const { api } = mountDock({ initialPlacement: "right" });
    dispatchMedia(DOCK_NARROW_QUERY, true);
    expect(api.placement.value).toBe("top");
    expect(api.orientation.value).toBe("horizontal");
    api.playToPlacement("right");
    expect(api.placement.value).toBe("top");
  });

  it("does not persist a narrow-forced horizontal edge", () => {
    const { api } = mountDock({ persist: true });
    api.snapToPlacement("left");
    expect(localStorage.getItem("vanduo-dock-orient")).toBe("left");
    dispatchMedia(DOCK_NARROW_QUERY, true);
    expect(api.placement.value).toBe("bottom");
    expect(api.orientation.value).toBe("horizontal");
    expect(localStorage.getItem("vanduo-dock-orient")).toBe("left");
    dispatchMedia(DOCK_NARROW_QUERY, false);
    expect(api.placement.value).toBe("left");
    expect(api.orientation.value).toBe("vertical");
    expect(localStorage.getItem("vanduo-dock-orient")).toBe("left");
  });

  it("restores an in-session vertical edge after the viewport widens", () => {
    const { api } = mountDock();
    api.snapToPlacement("right");
    dispatchMedia(DOCK_NARROW_QUERY, true);
    expect(api.placement.value).toBe("top");
    expect(localStorage.getItem("vanduo-dock-orient")).toBeNull();
    dispatchMedia(DOCK_NARROW_QUERY, false);
    expect(api.placement.value).toBe("right");
  });

  it("snaps under reduced motion", () => {
    stubMatchMedia({ reducedMotion: true });
    const { api } = mountDock();
    api.playTo("vertical");
    expect(api.orientation.value).toBe("vertical");
    expect(api.visualPhase.value).toBe("vertical");
    expect(api.isMorphing.value).toBe(false);
  });

  it("restores a persisted orientation on mount", () => {
    localStorage.setItem("vanduo-dock-orient", "vertical");
    const { api } = mountDock({ persist: true });
    expect(api.placement.value).toBe("left");
    expect(api.orientation.value).toBe("vertical");
    expect(api.visualPhase.value).toBe("vertical");
  });

  it("restores a persisted placement string", () => {
    localStorage.setItem("vanduo-dock-orient", "top");
    const { api } = mountDock({ persist: true });
    expect(api.placement.value).toBe("top");
    expect(api.orientation.value).toBe("horizontal");
  });

  it("morphs top to right through the square waypoint", () => {
    const { api } = mountDock({ initialPlacement: "top" });
    expect(api.placement.value).toBe("top");
    expect(api.dockClasses.value["vd-dock-edge-top"]).toBe(true);
    api.toggle();
    expect(api.visualPhase.value).toBe("square");
    expect(api.placement.value).toBe("top");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    expect(api.placement.value).toBe("right");
    expect(api.orientation.value).toBe("vertical");
    expect(api.dockClasses.value["vd-dock-edge-right"]).toBe(true);
  });

  it("playTo vertical from the top pair lands on the right", () => {
    const { api } = mountDock({ initialPlacement: "top" });
    api.playTo("vertical");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    expect(api.placement.value).toBe("right");
  });

  it("snapTo horizontal from the right pair lands on top", () => {
    const { api } = mountDock({ initialPlacement: "right" });
    api.snapTo("horizontal");
    expect(api.placement.value).toBe("top");
    expect(api.orientation.value).toBe("horizontal");
  });

  it("snaps placement without morphing", () => {
    const { api } = mountDock();
    api.snapToPlacement("right");
    expect(api.placement.value).toBe("right");
    expect(api.orientation.value).toBe("vertical");
    expect(api.isMorphing.value).toBe(false);
  });

  it("starts vertical when initial orientation is vertical", () => {
    const { api } = mountDock({ initial: "vertical" });
    expect(api.placement.value).toBe("left");
    expect(api.orientation.value).toBe("vertical");
  });

  it("ignores invalid stored values and uses initial", () => {
    localStorage.setItem("app-dock-orient", "sideways");
    setStoragePrefix("app-");
    const { api } = mountDock({ persist: true, initial: "horizontal" });
    expect(api.orientation.value).toBe("horizontal");
  });

  it("uses a custom storage key", () => {
    const { api } = mountDock({ persist: true, storageKey: "custom-dock" });
    api.snapTo("vertical");
    expect(localStorage.getItem("custom-dock")).toBe("left");
    expect(localStorage.getItem("vanduo-dock-orient")).toBeNull();
  });

  it("does not write storage when persist is off", () => {
    const { api } = mountDock();
    api.snapTo("vertical");
    expect(localStorage.getItem("vanduo-dock-orient")).toBeNull();
  });

  it("keeps two instances isolated", () => {
    const first = mountDock();
    const second = mountDock();
    first.api.playTo("vertical");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink);
    expect(first.api.orientation.value).toBe("vertical");
    expect(second.api.orientation.value).toBe("horizontal");
  });

  it("forces horizontal on a narrow first paint", () => {
    stubMatchMedia({ narrow: true });
    localStorage.setItem("vanduo-dock-orient", "vertical");
    const { api } = mountDock({ persist: true, initial: "vertical" });
    expect(api.orientation.value).toBe("horizontal");
    expect(api.visualPhase.value).toBe("horizontal");
    expect(api.placement.value).toBe("bottom");
    expect(api.isNarrow.value).toBe(true);
  });

  it("forces the pair's horizontal edge when narrow", () => {
    stubMatchMedia({ narrow: true });
    localStorage.setItem("vanduo-dock-orient", "right");
    const { api } = mountDock({ persist: true, initialPlacement: "right" });
    expect(api.placement.value).toBe("top");
    expect(api.orientation.value).toBe("horizontal");
  });

  it("playTo is a no-op without window", () => {
    const { api } = mountDock();
    const play = api.playTo;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    // @ts-expect-error -- coverage for the SSR guard
    delete globalThis.window;
    play("vertical");
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    expect(api.orientation.value).toBe("horizontal");
  });

  it("swallows private-mode storage errors", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { api } = mountDock({ persist: true });
    expect(api.orientation.value).toBe("horizontal");
    api.snapTo("vertical");
    expect(api.orientation.value).toBe("vertical");
  });

  it("no-ops storage helpers when localStorage is missing", () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    // @ts-expect-error -- coverage for the storage guard
    delete globalThis.localStorage;
    const { api } = mountDock({ persist: true });
    api.snapTo("vertical");
    expect(api.orientation.value).toBe("vertical");
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    }
  });

  it("ignores playToPlacement while morphing", () => {
    const { api } = mountDock();
    api.playToPlacement("left");
    api.playToPlacement("top");
    expect(api.visualPhase.value).toBe("square");
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink + DOCK_MORPH_MS.grow);
    expect(api.placement.value).toBe("left");
  });

  it("interrupts an in-flight morph when asked", () => {
    const { api } = mountDock();
    api.playToPlacement("left");
    expect(api.isMorphing.value).toBe(true);
    api.playToPlacement("top", { interrupt: true });
    expect(api.placement.value).toBe("top");
    expect(api.orientation.value).toBe("horizontal");
    expect(api.visualPhase.value).toBe("horizontal");
    expect(api.isMorphing.value).toBe(false);
  });

  it("restores legacy horizontal and named placements", () => {
    localStorage.setItem("vanduo-dock-orient", "horizontal");
    const first = mountDock({ persist: true });
    expect(first.api.placement.value).toBe("bottom");
    first.wrapper.unmount();

    localStorage.setItem("vanduo-dock-orient", "left");
    const second = mountDock({ persist: true });
    expect(second.api.placement.value).toBe("left");
    second.wrapper.unmount();

    localStorage.setItem("vanduo-dock-orient", "bottom");
    const third = mountDock({ persist: true });
    expect(third.api.placement.value).toBe("bottom");
  });

  it("clears morph timers on unmount", () => {
    const { wrapper, api } = mountDock();
    api.playTo("vertical");
    wrapper.unmount();
    vi.advanceTimersByTime(DOCK_MORPH_MS.shrink + DOCK_MORPH_MS.grow);
    expect(api.orientation.value).toBe("horizontal");
  });
});
