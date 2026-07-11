import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref, type Ref } from "vue";
import { useSpotlight } from "../../src/composables/useSpotlight";

/**
 * useSpotlight ports framework/js/components/spotlight.js: it scans a root for
 * `[data-vd-spotlight]` triggers whose attribute holds a JSON step array and,
 * on click, builds a body-appended overlay + tooltip tour. Each composable
 * runs in a component scope, so we mount a host whose root ref is handed to the
 * composable and whose fixture markup is injected as innerHTML (matching the
 * onMounted `querySelectorAll` scan against real DOM).
 */
const mounted: VueWrapper[] = [];

function mountHost<T>(
  html: string,
  use: (root: Ref<HTMLElement | null>) => T,
): { wrapper: VueWrapper; api: T } {
  let api!: T;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = use(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
}

const click = (el: Element): MouseEvent => {
  const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
};

const escape = (): void => {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
};

const overlay = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".vd-spotlight-overlay");
const tooltip = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".vd-spotlight-tooltip");
const targets = (): NodeListOf<HTMLElement> =>
  document.querySelectorAll<HTMLElement>(".vd-spotlight-target");
const counterText = (): string | undefined =>
  tooltip()?.querySelector(".vd-spotlight-counter")?.textContent ?? undefined;
const button = (text: string): HTMLButtonElement | undefined =>
  Array.from(
    tooltip()?.querySelectorAll<HTMLButtonElement>(".vd-spotlight-btn") ?? [],
  ).find((b) => b.textContent === text);

const TWO_STEPS = JSON.stringify([
  { target: "#t1", title: "One", description: "First" },
  { target: "#t2", title: "Two", content: "Second" },
]);

const FIXTURE = (steps: string, tag = "button"): string =>
  `<${tag} id="starter" data-vd-spotlight='${steps}'>Tour</${tag}>
   <div id="t1">Target 1</div>
   <div id="t2">Target 2</div>
   <div id="t3">Target 3</div>`;

let scrollIntoViewSpy: ReturnType<typeof vi.fn>;
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  // jsdom does not implement scrollIntoView (showStep calls it on the target).
  scrollIntoViewSpy = vi.fn();
  Element.prototype.scrollIntoView =
    scrollIntoViewSpy as typeof Element.prototype.scrollIntoView;
  // The tooltip re-positions across a requestAnimationFrame settle window; run
  // it synchronously so a step render fully settles within the test tick.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted by the test under test */
    }
  }
  mounted.length = 0;
  // Safety net for any tour a test left behind (module-level singleton state).
  document
    .querySelectorAll(".vd-spotlight-overlay, .vd-spotlight-tooltip")
    .forEach((n) => n.remove());
  targets().forEach((n) => n.classList.remove("vd-spotlight-target"));
  Element.prototype.scrollIntoView = originalScrollIntoView;
  vi.unstubAllGlobals();
});

describe("useSpotlight — trigger start", () => {
  it("returns the controller extension without starting anything on mount", () => {
    const { api } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    expect(typeof api.start).toBe("function");
    expect(typeof api.stop).toBe("function");
    expect(typeof api.next).toBe("function");
    expect(typeof api.prev).toBe("function");
    expect(typeof api.refresh).toBe("function");
    expect(overlay()).toBeNull();
    expect(tooltip()).toBeNull();
  });

  it("builds overlay + tooltip, highlights step 1, sets the counter, and fires spotlight:step on click", () => {
    const steps: CustomEvent[] = [];
    const onStep = (e: Event): void => void steps.push(e as CustomEvent);
    document.addEventListener("spotlight:step", onStep);

    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    click(wrapper.get("#starter").element);

    const ov = overlay();
    const tt = tooltip();
    expect(ov).not.toBeNull();
    expect(tt).not.toBeNull();
    // Overlay/tooltip ARIA (vanilla parity).
    expect(ov?.getAttribute("aria-hidden")).toBe("true");
    expect(tt?.getAttribute("role")).toBe("dialog");
    expect(tt?.getAttribute("aria-modal")).toBe("true");
    expect(tt?.tabIndex).toBe(-1);

    // Step 1's target is highlighted and scrolled into view.
    const t1 = wrapper.get("#t1").element;
    expect(t1.classList.contains("vd-spotlight-target")).toBe(true);
    expect(targets()).toHaveLength(1);
    expect(scrollIntoViewSpy).toHaveBeenCalled();

    expect(counterText()).toBe("1 / 2");
    expect(steps).toHaveLength(1);
    expect(steps[0].detail).toMatchObject({ index: 0, step: 0, total: 2 });

    document.removeEventListener("spotlight:step", onStep);
  });

  it("preventDefaults the trigger click (anchor parity)", () => {
    const { wrapper } = mountHost(FIXTURE(TWO_STEPS, "a"), useSpotlight);
    const ev = click(wrapper.get("#starter").element);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("renders title/description with ids wired to aria-labelledby / aria-describedby", () => {
    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    click(wrapper.get("#starter").element);
    const tt = tooltip()!;

    const title = tt.querySelector<HTMLElement>(".vd-spotlight-title")!;
    const desc = tt.querySelector<HTMLElement>(".vd-spotlight-description")!;
    expect(title.textContent).toBe("One");
    expect(desc.textContent).toBe("First");
    expect(title.id).not.toBe("");
    expect(desc.id).not.toBe("");
    expect(tt.getAttribute("aria-labelledby")).toBe(title.id);
    expect(tt.getAttribute("aria-describedby")).toBe(desc.id);
  });
});

describe("useSpotlight — step navigation", () => {
  it("advances with Next: moves the highlight, updates counter, re-fires spotlight:step, swaps Next→Done", () => {
    const steps: CustomEvent[] = [];
    const onStep = (e: Event): void => void steps.push(e as CustomEvent);
    document.addEventListener("spotlight:step", onStep);

    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    click(wrapper.get("#starter").element);
    expect(button("Next")).toBeDefined();
    expect(button("Back")).toBeUndefined();

    click(button("Next")!);

    // Highlight moved from #t1 to #t2, only one target at a time.
    expect(
      wrapper.get("#t1").element.classList.contains("vd-spotlight-target"),
    ).toBe(false);
    expect(
      wrapper.get("#t2").element.classList.contains("vd-spotlight-target"),
    ).toBe(true);
    expect(targets()).toHaveLength(1);
    expect(counterText()).toBe("2 / 2");
    // Last step shows Done (not Next) and Back appears.
    expect(button("Done")).toBeDefined();
    expect(button("Next")).toBeUndefined();
    expect(button("Back")).toBeDefined();
    expect(steps).toHaveLength(2);
    expect(steps[1].detail).toMatchObject({ index: 1, total: 2 });
    // The step 2 body came from the `content` alias.
    expect(
      tooltip()?.querySelector(".vd-spotlight-description")?.textContent,
    ).toBe("Second");

    document.removeEventListener("spotlight:step", onStep);
  });

  it("goes Back to the previous step", () => {
    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    click(wrapper.get("#starter").element);
    click(button("Next")!);
    expect(counterText()).toBe("2 / 2");

    click(button("Back")!);
    expect(counterText()).toBe("1 / 2");
    expect(
      wrapper.get("#t1").element.classList.contains("vd-spotlight-target"),
    ).toBe(true);
  });

  it("controller next()/prev() are no-ops past the ends", () => {
    const { wrapper, api } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    click(wrapper.get("#starter").element);

    api.prev(); // already on first
    expect(counterText()).toBe("1 / 2");
    api.next();
    expect(counterText()).toBe("2 / 2");
    api.next(); // already on last
    expect(counterText()).toBe("2 / 2");
  });
});

describe("useSpotlight — end semantics", () => {
  it("Done on the last step tears everything down, restores focus, and reports completed:true", () => {
    const ends: CustomEvent[] = [];
    const onEnd = (e: Event): void => void ends.push(e as CustomEvent);
    document.addEventListener("spotlight:end", onEnd);

    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    const starter = wrapper.get("#starter").element as HTMLButtonElement;
    click(starter);
    click(button("Next")!); // to last step
    click(button("Done")!);

    expect(overlay()).toBeNull();
    expect(tooltip()).toBeNull();
    expect(targets()).toHaveLength(0);
    expect(document.activeElement).toBe(starter);
    expect(ends).toHaveLength(1);
    expect(ends[0].detail).toEqual({
      completedSteps: 2,
      total: 2,
      completed: true,
    });

    document.removeEventListener("spotlight:end", onEnd);
  });

  it("Escape aborts mid-tour and reports completed:false", () => {
    const ends: CustomEvent[] = [];
    const onEnd = (e: Event): void => void ends.push(e as CustomEvent);
    document.addEventListener("spotlight:end", onEnd);

    const three = JSON.stringify([
      { target: "#t1", title: "A" },
      { target: "#t2", title: "B" },
      { target: "#t3", title: "C" },
    ]);
    const { wrapper } = mountHost(FIXTURE(three), useSpotlight);
    click(wrapper.get("#starter").element);
    expect(counterText()).toBe("1 / 3");

    escape();

    expect(overlay()).toBeNull();
    expect(ends).toHaveLength(1);
    expect(ends[0].detail).toEqual({
      completedSteps: 1,
      total: 3,
      completed: false,
    });

    document.removeEventListener("spotlight:end", onEnd);
  });

  it("Skip stops the tour immediately (completed:false)", () => {
    const ends: CustomEvent[] = [];
    const onEnd = (e: Event): void => void ends.push(e as CustomEvent);
    document.addEventListener("spotlight:end", onEnd);

    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    click(wrapper.get("#starter").element);
    click(button("Skip")!);

    expect(overlay()).toBeNull();
    expect(ends[0].detail.completed).toBe(false);

    document.removeEventListener("spotlight:end", onEnd);
  });

  it("clicking the overlay stops the tour", () => {
    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    click(wrapper.get("#starter").element);
    const ov = overlay()!;
    click(ov);
    expect(overlay()).toBeNull();
    expect(targets()).toHaveLength(0);
  });
});

describe("useSpotlight — normalization and inertness", () => {
  it("does nothing when the payload is malformed JSON (logs an error, no overlay)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = mountHost(FIXTURE("[not valid json"), useSpotlight);
    click(wrapper.get("#starter").element);

    expect(overlay()).toBeNull();
    expect(tooltip()).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("does nothing when no step survives normalization (missing targets)", () => {
    const bad = JSON.stringify([{ title: "no target" }, { target: "   " }]);
    const { wrapper } = mountHost(FIXTURE(bad), useSpotlight);
    click(wrapper.get("#starter").element);
    expect(overlay()).toBeNull();
  });

  it("drops only the invalid entries and counts the survivors", () => {
    const mixed = JSON.stringify([
      { target: "#t1", title: "Keep" },
      { title: "drop me" },
      { target: "#t2", title: "Keep 2" },
    ]);
    const { wrapper } = mountHost(FIXTURE(mixed), useSpotlight);
    click(wrapper.get("#starter").element);
    expect(counterText()).toBe("1 / 2");
  });
});

describe("useSpotlight — single active tour", () => {
  it("starting while a tour is active stops the previous one first", () => {
    const ends: CustomEvent[] = [];
    const onEnd = (e: Event): void => void ends.push(e as CustomEvent);
    document.addEventListener("spotlight:end", onEnd);

    const { api } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    api.start([{ target: "#t1", title: "A" }]);
    expect(document.querySelectorAll(".vd-spotlight-overlay")).toHaveLength(1);

    api.start([
      { target: "#t2", title: "B" },
      { target: "#t3", title: "C" },
    ]);
    // Exactly one overlay/tooltip — the previous tour was torn down.
    expect(document.querySelectorAll(".vd-spotlight-overlay")).toHaveLength(1);
    expect(document.querySelectorAll(".vd-spotlight-tooltip")).toHaveLength(1);
    expect(targets()).toHaveLength(1);
    expect(
      document.querySelector("#t2")?.classList.contains("vd-spotlight-target"),
    ).toBe(true);
    // The first tour dispatched spotlight:end when superseded.
    expect(ends).toHaveLength(1);

    document.removeEventListener("spotlight:end", onEnd);
  });
});

describe("useSpotlight — controller and options", () => {
  it("start()/stop() work programmatically without a DOM trigger", () => {
    const { api } = mountHost(`<div id="t1">Target</div>`, useSpotlight);
    api.start([{ target: "#t1", title: "Solo" }]);
    expect(overlay()).not.toBeNull();
    api.stop();
    expect(overlay()).toBeNull();
    // stop() again is a no-op.
    expect(() => api.stop()).not.toThrow();
  });

  it("start() with no valid steps is inert", () => {
    const { api } = mountHost(`<div id="t1"></div>`, useSpotlight);
    api.start([]);
    expect(overlay()).toBeNull();
  });

  it("honours custom button labels (vd3 extension)", () => {
    const { api } = mountHost(
      `<div id="t1"></div><div id="t2"></div>`,
      (root) =>
        useSpotlight(root, {
          labels: {
            back: "Atgal",
            skip: "Praleisti",
            next: "Toliau",
            done: "Baigta",
          },
        }),
    );
    api.start([
      { target: "#t1", title: "A" },
      { target: "#t2", title: "B" },
    ]);
    expect(button("Toliau")).toBeDefined();
    expect(button("Praleisti")).toBeDefined();
    api.next();
    expect(button("Atgal")).toBeDefined();
    expect(button("Baigta")).toBeDefined();
  });

  it("refresh() wires triggers added after mount", () => {
    const { wrapper, api } = mountHost(
      `<div id="host"></div><div id="t1">Target</div>`,
      useSpotlight,
    );
    // Inject a new trigger after the initial scan.
    const host = wrapper.get("#host").element;
    host.innerHTML = `<button id="late" data-vd-spotlight='[{"target":"#t1","title":"Late"}]'>Go</button>`;
    const late = wrapper.get("#late").element;

    // Not yet wired.
    click(late);
    expect(overlay()).toBeNull();

    api.refresh();
    click(late);
    expect(overlay()).not.toBeNull();
    expect(tooltip()?.querySelector(".vd-spotlight-title")?.textContent).toBe(
      "Late",
    );
  });
});

describe("useSpotlight — cleanup", () => {
  it("unmounting the instance that started a tour tears the tour down", () => {
    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    click(wrapper.get("#starter").element);
    expect(overlay()).not.toBeNull();

    wrapper.unmount();

    expect(overlay()).toBeNull();
    expect(tooltip()).toBeNull();
    expect(targets()).toHaveLength(0);
  });

  it("after unmount the trigger no longer starts a tour (listener removed)", () => {
    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    const starter = wrapper.get("#starter").element;
    wrapper.unmount();
    click(starter);
    expect(overlay()).toBeNull();
  });

  it("per-instance teardown leaves a sibling instance's wiring intact", () => {
    const host1 = mountHost(
      `<button id="s1" data-vd-spotlight='[{"target":"#a","title":"A"}]'>1</button><div id="a"></div>`,
      useSpotlight,
    );
    const host2 = mountHost(
      `<button id="s2" data-vd-spotlight='[{"target":"#b","title":"B"}]'>2</button><div id="b"></div>`,
      useSpotlight,
    );

    // Unmount host2 (it owns no active tour); host1's trigger must still fire.
    host2.wrapper.unmount();

    click(host1.wrapper.get("#s1").element);
    expect(overlay()).not.toBeNull();
    expect(tooltip()?.querySelector(".vd-spotlight-title")?.textContent).toBe(
      "A",
    );
  });

  it("keeps the tooltip glued to the target across scroll/resize while active", () => {
    const { wrapper } = mountHost(FIXTURE(TWO_STEPS), useSpotlight);
    click(wrapper.get("#starter").element);
    const tt = tooltip()!;
    tt.style.top = "";
    tt.style.left = "";

    window.dispatchEvent(new Event("scroll"));
    expect(tt.style.top).toMatch(/px$/);

    tt.style.top = "";
    window.dispatchEvent(new Event("resize"));
    expect(tt.style.top).toMatch(/px$/);
  });
});
