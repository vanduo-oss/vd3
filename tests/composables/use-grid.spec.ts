import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNode } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import {
  setGridSystem,
  useGrid,
  type GridMode,
  type UseGridController,
  type UseGridOptions,
} from "../../src/composables/useGrid";

/**
 * Behaviour specs for useGrid + setGridSystem, the vd3 port of
 * `framework/js/components/grid.js`. Tests mount a real host component so the
 * composable's onMounted / onUnmounted lifecycle runs, dispatch real DOM
 * events, and drive the `:has()` support branch by stubbing `CSS.supports`.
 */

let active: VueWrapper | null = null;

interface GridChange {
  container: HTMLElement;
  mode: GridMode;
}

/** Mount a host whose inner div (the grid container) is managed by useGrid. */
function mountGrid(
  innerHtml: string,
  options?: UseGridOptions,
): { wrapper: VueWrapper; api: UseGridController; container: HTMLElement } {
  let api!: UseGridController;
  const Host = defineComponent({
    setup() {
      const container = ref<HTMLElement | null>(null);
      api = useGrid(container, options);
      return (): VNode =>
        h("div", { ref: container, class: "host", innerHTML: innerHtml });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  active = wrapper;
  return {
    wrapper,
    api,
    container: wrapper.get(".host").element as HTMLElement,
  };
}

/** A `.vd-row` with `n` `.vd-col-*` children. */
const rowWith = (n: number): string =>
  `<div class="vd-row">${Array.from(
    { length: n },
    (_v, i) => `<div class="vd-col-${(i % 12) + 1}">c${i}</div>`,
  ).join("")}</div>`;

/** Force the `:has()` support branch on or off for a test. */
function stubHas(supported: boolean): void {
  vi.stubGlobal("CSS", { supports: vi.fn().mockReturnValue(supported) });
}

/** Capture bubbled grid:modechange details (initial-mount event included). */
function collectChanges(): { events: GridChange[]; stop: () => void } {
  const events: GridChange[] = [];
  const handler = (e: Event): void =>
    void events.push((e as CustomEvent<GridChange>).detail);
  document.addEventListener("grid:modechange", handler);
  return {
    events,
    stop: () => document.removeEventListener("grid:modechange", handler),
  };
}

beforeEach(() => {
  // Default: engine supports :has(), so no inline fallback unless a test opts in.
  stubHas(true);
});

afterEach(() => {
  // Unstub globals first so a test that stubbed `document`/`CSS` has them
  // restored before the DOM cleanup below touches `document`.
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (active) {
    active.unmount();
    active = null;
  }
  document.documentElement.removeAttribute("data-grid");
  window.localStorage.clear();
});

describe("useGrid initial mode", () => {
  it("defaults to standard and stamps class + attribute + aria-label", () => {
    const { container, api } = mountGrid(rowWith(2));
    expect(container.classList.contains("vd-grid-standard")).toBe(true);
    expect(container.classList.contains("vd-grid-fibonacci")).toBe(false);
    expect(container.getAttribute("data-layout-mode")).toBe("standard");
    expect(container.getAttribute("aria-label")).toBe(
      "Grid layout: standard mode",
    );
    expect(container.getAttribute("role")).toBe("region");
    expect(api.mode.value).toBe("standard");
  });

  it("honours the mode option over the DOM attribute", () => {
    const { container, api } = mountGrid(rowWith(2), { mode: "fibonacci" });
    expect(container.classList.contains("vd-grid-fibonacci")).toBe(true);
    expect(container.getAttribute("data-layout-mode")).toBe("fibonacci");
    expect(api.mode.value).toBe("fibonacci");
  });

  it("adopts the container's own data-layout-mode when no option is given", () => {
    let api!: UseGridController;
    const Host = defineComponent({
      setup() {
        const container = ref<HTMLElement | null>(null);
        api = useGrid(container);
        return (): VNode =>
          h("div", {
            ref: container,
            "data-layout-mode": "fibonacci",
            innerHTML: rowWith(2),
          });
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    active = wrapper;
    expect(api.mode.value).toBe("fibonacci");
    expect(wrapper.element.classList.contains("vd-grid-fibonacci")).toBe(true);
  });
});

describe("useGrid toggle round-trip", () => {
  it("toggle flips standard->fibonacci with class/attr/aria/mode/event", () => {
    const { events, stop } = collectChanges();
    const { container, api } = mountGrid(rowWith(2));
    expect(api.mode.value).toBe("standard");

    api.toggle();

    expect(container.classList.contains("vd-grid-fibonacci")).toBe(true);
    expect(container.classList.contains("vd-grid-standard")).toBe(false);
    expect(container.getAttribute("data-layout-mode")).toBe("fibonacci");
    expect(container.getAttribute("aria-label")).toBe(
      "Grid layout: fibonacci mode",
    );
    expect(api.mode.value).toBe("fibonacci");
    // initial mount event (standard) + toggle event (fibonacci)
    expect(events.map((e) => e.mode)).toEqual(["standard", "fibonacci"]);
    expect(events[1].container).toBe(container);
    stop();
  });

  it("toggle flips back fibonacci->standard", () => {
    const { container, api } = mountGrid(rowWith(2), { mode: "fibonacci" });
    api.toggle();
    expect(container.classList.contains("vd-grid-standard")).toBe(true);
    expect(container.getAttribute("data-layout-mode")).toBe("standard");
    expect(api.mode.value).toBe("standard");
  });
});

describe("useGrid setMode", () => {
  it("applies a valid mode", () => {
    const { container, api } = mountGrid(rowWith(2));
    api.setMode("fibonacci");
    expect(api.mode.value).toBe("fibonacci");
    expect(container.getAttribute("data-layout-mode")).toBe("fibonacci");
  });

  it("ignores an invalid mode (no-op)", () => {
    const { container, api } = mountGrid(rowWith(2));
    api.setMode("diagonal" as unknown as GridMode);
    expect(api.mode.value).toBe("standard");
    expect(container.getAttribute("data-layout-mode")).toBe("standard");
  });
});

describe("useGrid inline Fibonacci fallback (no :has())", () => {
  const cols = (n: number): string =>
    (
      mountGrid(rowWith(n), { mode: "fibonacci" }).wrapper.get(".vd-row")
        .element as HTMLElement
    ).style.gridTemplateColumns;

  beforeEach(() => stubHas(false));

  it("1 child -> 1fr", () => expect(cols(1)).toBe("1fr"));
  it("2 children -> golden ratio", () => expect(cols(2)).toBe("1fr 1.618fr"));
  it("3 children -> 2fr 3fr 5fr", () => expect(cols(3)).toBe("2fr 3fr 5fr"));
  it("4 children -> 1fr 2fr 3fr 5fr", () =>
    expect(cols(4)).toBe("1fr 2fr 3fr 5fr"));
  it("5+ children -> equal repeat", () =>
    expect(cols(5)).toBe("repeat(5, 1fr)"));

  it("switching back to standard clears the inline template", () => {
    const { wrapper, api } = mountGrid(rowWith(3), { mode: "fibonacci" });
    const row = wrapper.get(".vd-row").element as HTMLElement;
    expect(row.style.gridTemplateColumns).toBe("2fr 3fr 5fr");
    api.setMode("standard");
    expect(row.style.gridTemplateColumns).toBe("");
  });
});

describe("useGrid does not write inline fallback when :has() is supported", () => {
  it("leaves grid-template-columns untouched in fibonacci mode", () => {
    stubHas(true);
    const { wrapper } = mountGrid(rowWith(3), { mode: "fibonacci" });
    const row = wrapper.get(".vd-row").element as HTMLElement;
    expect(row.style.gridTemplateColumns).toBe("");
  });
});

describe("useGrid unmount cleanup", () => {
  it("removes classes, aria-label and inline fallback on unmount", () => {
    stubHas(false);
    const { wrapper, container } = mountGrid(rowWith(3), { mode: "fibonacci" });
    const row = wrapper.get(".vd-row").element as HTMLElement;
    expect(container.classList.contains("vd-grid-fibonacci")).toBe(true);
    expect(row.style.gridTemplateColumns).toBe("2fr 3fr 5fr");

    wrapper.unmount();
    active = null;

    expect(container.classList.contains("vd-grid-fibonacci")).toBe(false);
    expect(container.classList.contains("vd-grid-standard")).toBe(false);
    expect(container.hasAttribute("aria-label")).toBe(false);
    expect(row.style.gridTemplateColumns).toBe("");
  });
});

describe("setGridSystem document default", () => {
  it("stamps then removes data-grid on <html> and never persists", () => {
    expect(document.documentElement.hasAttribute("data-grid")).toBe(false);

    setGridSystem("fibonacci");
    expect(document.documentElement.getAttribute("data-grid")).toBe(
      "fibonacci",
    );

    setGridSystem("standard");
    expect(document.documentElement.hasAttribute("data-grid")).toBe(false);

    // Non-persisting: nothing written to storage either way.
    expect(window.localStorage.length).toBe(0);
  });

  it("treats any non-fibonacci value as removing the attribute", () => {
    setGridSystem("fibonacci");
    setGridSystem("whatever" as unknown as GridMode);
    expect(document.documentElement.hasAttribute("data-grid")).toBe(false);
  });
});

describe("setGridSystem SSR guard", () => {
  it("is a no-op when document is undefined (server render)", () => {
    vi.stubGlobal("document", undefined);
    // Guarded on `typeof document`; both branches must be inert on the server.
    expect(() => setGridSystem("fibonacci")).not.toThrow();
    expect(() => setGridSystem("standard")).not.toThrow();
    // afterEach unstubs `document` before any DOM cleanup runs.
  });
});
