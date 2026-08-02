import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { useStepper, type StepperApi } from "../../src/composables/useStepper";

const mounted: VueWrapper[] = [];

// jsdom lacks IntersectionObserver; this mock records instances/options and
// lets a test drive the intersection callback synchronously.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  unobserved: Element[] = [];
  disconnected = false;
  constructor(
    cb: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = cb;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.push(el);
  }
  unobserve(el: Element): void {
    this.unobserved.push(el);
  }
  disconnect(): void {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  emit(targets: Element[], isIntersecting = true): void {
    const entries = targets.map(
      (target) =>
        ({ isIntersecting, target }) as unknown as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

function mountHost(html: string): { wrapper: VueWrapper; api: StepperApi } {
  let api!: StepperApi;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = useStepper(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
}

interface StepperChange {
  current: number;
  previous: number;
  total: number;
}

// Collect bubbled `stepper:change` details at document level so an
// initial-mount event (dispatched inside onMounted) is still captured.
function collectChanges(): {
  events: StepperChange[];
  stop: () => void;
} {
  const events: StepperChange[] = [];
  const handler = (e: Event): void => {
    events.push((e as CustomEvent<StepperChange>).detail);
  };
  document.addEventListener("stepper:change", handler);
  return {
    events,
    stop: () => document.removeEventListener("stepper:change", handler),
  };
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted */
    }
  }
  mounted.length = 0;
  vi.unstubAllGlobals();
});

const threeSteps = (opts = ""): string => `
  <ol class="vd-stepper${opts ? " " + opts : ""}">
    <li class="vd-stepper-item">One</li>
    <li class="vd-stepper-item is-active">Two</li>
    <li class="vd-stepper-item">Three</li>
  </ol>`;

const stepperEl = (wrapper: VueWrapper): Element =>
  wrapper.get(".vd-stepper").element;
const items = (wrapper: VueWrapper): HTMLElement[] =>
  Array.from(
    wrapper
      .get(".vd-stepper")
      .element.querySelectorAll<HTMLElement>(".vd-stepper-item"),
  );

describe("useStepper", () => {
  it("marks the initially-active step, completes earlier ones, sets aria-current", () => {
    const { wrapper } = mountHost(threeSteps());
    const [a, b, c] = items(wrapper);

    expect(a!.classList.contains("is-completed")).toBe(true);
    expect(b!.classList.contains("is-active")).toBe(true);
    expect(b!.getAttribute("aria-current")).toBe("step");
    expect(c!.classList.contains("is-active")).toBe(false);
    expect(c!.classList.contains("is-completed")).toBe(false);
  });

  it("defaults the active step to index 0 when no item is pre-active", () => {
    const { wrapper } = mountHost(`
      <ol class="vd-stepper">
        <li class="vd-stepper-item">One</li>
        <li class="vd-stepper-item">Two</li>
      </ol>`);
    const [a, b] = items(wrapper);
    expect(a!.classList.contains("is-active")).toBe(true);
    expect(b!.classList.contains("is-active")).toBe(false);
  });

  it("does not dispatch stepper:change on mount (initial paint is silent)", () => {
    // Applying the derived starting step is not a user-visible change, so no
    // spurious stepper:change (current === previous) fires on mount.
    const c = collectChanges();
    mountHost(threeSteps());
    expect(c.events).toHaveLength(0);
    c.stop();
  });

  it("advances with the imperative next() and fires stepper:change", () => {
    const { wrapper, api } = mountHost(threeSteps());
    const c = collectChanges();

    api.next(stepperEl(wrapper));

    const [a, b, cItem] = items(wrapper);
    expect(a!.classList.contains("is-completed")).toBe(true);
    expect(b!.classList.contains("is-completed")).toBe(true);
    expect(cItem!.classList.contains("is-active")).toBe(true);
    expect(c.events).toEqual([{ current: 2, previous: 1, total: 3 }]);
    c.stop();
  });

  it("steps back with prev()", () => {
    const { wrapper, api } = mountHost(threeSteps());
    api.prev(stepperEl(wrapper));

    const [a, b] = items(wrapper);
    expect(a!.classList.contains("is-active")).toBe(true);
    expect(b!.classList.contains("is-active")).toBe(false);
    expect(b!.classList.contains("is-completed")).toBe(false);
  });

  it("jumps to an index with setStep() and ignores out-of-range indices", () => {
    const { wrapper, api } = mountHost(threeSteps());
    api.setStep(stepperEl(wrapper), 2);
    expect(items(wrapper)[2]!.classList.contains("is-active")).toBe(true);

    const c = collectChanges();
    api.setStep(stepperEl(wrapper), 99); // out of range -> no-op
    api.setStep(stepperEl(wrapper), -1); // out of range -> no-op
    expect(c.events).toHaveLength(0);
    expect(items(wrapper)[2]!.classList.contains("is-active")).toBe(true);
    c.stop();
  });

  it("navigates on item click for .vd-stepper-clickable steppers", () => {
    const { wrapper } = mountHost(threeSteps("vd-stepper-clickable"));
    items(wrapper)[2]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    const [a, b, c] = items(wrapper);
    expect(a!.classList.contains("is-completed")).toBe(true);
    expect(b!.classList.contains("is-completed")).toBe(true);
    expect(c!.classList.contains("is-active")).toBe(true);
  });

  it("navigates on item click for vertical clickable steppers", () => {
    const { wrapper } = mountHost(
      threeSteps("vd-stepper-vertical vd-stepper-clickable"),
    );
    items(wrapper)[0]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    const [a, b] = items(wrapper);
    expect(a!.classList.contains("is-active")).toBe(true);
    expect(b!.classList.contains("is-active")).toBe(false);
    expect(b!.classList.contains("is-completed")).toBe(false);
  });

  it("navigates on Enter/Space keydown for clickable steppers (with preventDefault)", () => {
    const { wrapper } = mountHost(threeSteps("vd-stepper-clickable"));
    const third = items(wrapper)[2]!;

    const ev = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    third.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(third.classList.contains("is-active")).toBe(true);

    // Space navigates back to the first item.
    const first = items(wrapper)[0]!;
    first.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: " ",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(first.classList.contains("is-active")).toBe(true);
  });

  it("does not wire item clicks for non-clickable steppers", () => {
    const { wrapper } = mountHost(threeSteps());
    items(wrapper)[2]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    // Active step is unchanged (still index 1).
    expect(items(wrapper)[1]!.classList.contains("is-active")).toBe(true);
    expect(items(wrapper)[2]!.classList.contains("is-active")).toBe(false);
  });

  it("treats a null element as a no-op across the API", () => {
    const { api } = mountHost(threeSteps());
    expect(() => {
      api.next(null);
      api.prev(null);
      api.setStep(null, 0);
    }).not.toThrow();
  });

  it("removes clickable item listeners on unmount", () => {
    const { wrapper } = mountHost(threeSteps("vd-stepper-clickable"));
    const third = items(wrapper)[2]!;
    const changes: Event[] = [];
    third.addEventListener("stepper:change", (e) => changes.push(e));

    wrapper.unmount();

    // The (now-detached) item keeps its last classes; clicking it must not
    // re-run setStep now that the click listener has been torn down.
    const before = third.className;
    third.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(third.className).toBe(before);
    expect(changes).toHaveLength(0);
  });

  it("staggers reveal delays for .vd-stepper-animated (140ms steps, index capped at 7)", () => {
    const many = Array.from(
      { length: 10 },
      (_, i) =>
        `<li class="vd-stepper-item${i === 0 ? " is-active" : ""}">S${i}</li>`,
    ).join("");
    const { wrapper } = mountHost(
      `<ol class="vd-stepper vd-stepper-animated">${many}</ol>`,
    );
    const els = items(wrapper);
    const delays = els.map((i) =>
      i.style.getPropertyValue("--vd-stepper-reveal-delay"),
    );
    expect(delays.slice(0, 3)).toEqual(["0ms", "140ms", "280ms"]);
    expect(delays[7]).toBe("980ms");
    expect(delays[8]).toBe("980ms");
    expect(delays[9]).toBe("980ms");
  });

  it("observes animated items and reveals on intersection", () => {
    const { wrapper } = mountHost(threeSteps("vd-stepper-animated"));
    const els = items(wrapper);

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const io = MockIntersectionObserver.instances[0]!;
    expect(io.options?.rootMargin).toBe("0px 0px -10% 0px");
    expect(io.options?.threshold).toBe(0.15);
    expect(io.observed).toEqual(els);
    expect(els.every((i) => !i.classList.contains("is-revealed"))).toBe(true);

    io.emit([els[0]!], false);
    expect(els[0]!.classList.contains("is-revealed")).toBe(false);

    io.emit([els[0]!, els[1]!]);
    expect(els[0]!.classList.contains("is-revealed")).toBe(true);
    expect(els[1]!.classList.contains("is-revealed")).toBe(true);
    expect(els[2]!.classList.contains("is-revealed")).toBe(false);
    expect(io.unobserved).toEqual([els[0], els[1]]);
  });

  it("ignores plain steppers without the animated opt-in", () => {
    mountHost(threeSteps());
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("reveals all animated items immediately under prefers-reduced-motion", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal("matchMedia", matchMedia);

    const { wrapper } = mountHost(threeSteps("vd-stepper-animated"));
    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(
      items(wrapper).every((i) => i.classList.contains("is-revealed")),
    ).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});
