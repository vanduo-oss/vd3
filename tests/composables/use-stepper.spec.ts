import { afterEach, describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { useStepper, type StepperApi } from "../../src/composables/useStepper";

const mounted: VueWrapper[] = [];

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

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted */
    }
  }
  mounted.length = 0;
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

  it("dispatches an initial stepper:change with the derived index on mount", () => {
    const c = collectChanges();
    mountHost(threeSteps());
    expect(c.events).toContainEqual({ current: 1, previous: 1, total: 3 });
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
});
