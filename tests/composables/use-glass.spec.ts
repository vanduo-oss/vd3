import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNode } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useGlass } from "../../src/composables/useGlass";

// jsdom has no IntersectionObserver; this mock records instances, observed
// targets and lets a test drive the intersection callback synchronously.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
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
  unobserve(): void {}
  disconnect(): void {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  emit(isIntersecting: boolean): void {
    const entry = {
      isIntersecting,
      target: this.observed[0],
    } as unknown as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

let active: VueWrapper | null = null;

const mountGlass = (children: () => VNode[]): VueWrapper => {
  const Comp = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      useGlass(root);
      return () => h("div", { ref: root }, children());
    },
  });
  const wrapper = mount(Comp, { attachTo: document.body });
  active = wrapper;
  return wrapper;
};

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  if (active) {
    active.unmount();
    active = null;
  }
  vi.unstubAllGlobals();
});

describe("useGlass", () => {
  it("observes the previous sibling as the sentinel and toggles is-glass-active", () => {
    const wrapper = mountGlass(() => [
      h("div", { class: "sentinel" }, "S"),
      h("div", { class: "target", "data-glass-scroll": "" }, "T"),
    ]);
    const target = wrapper.get(".target").element;
    const sentinel = wrapper.get(".sentinel").element;

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const io = MockIntersectionObserver.instances[0];
    expect(io.observed[0]).toBe(sentinel);
    expect(target.classList.contains("is-glass-active")).toBe(false);

    // Sentinel scrolls out of view -> glass activates.
    io.emit(false);
    expect(target.classList.contains("is-glass-active")).toBe(true);

    // Sentinel scrolls back into view -> glass deactivates.
    io.emit(true);
    expect(target.classList.contains("is-glass-active")).toBe(false);
  });

  it("resolves an explicit data-glass-sentinel selector over the previous sibling", () => {
    const wrapper = mountGlass(() => [
      h("div", { id: "sent" }, "S"),
      h("div", { class: "pre" }, "P"),
      h(
        "div",
        {
          class: "target",
          "data-glass-scroll": "",
          "data-glass-sentinel": "#sent",
        },
        "T",
      ),
    ]);
    const io = MockIntersectionObserver.instances[0];
    expect(io.observed[0]).toBe(wrapper.get("#sent").element);
    expect(io.observed[0]).not.toBe(wrapper.get(".pre").element);
  });

  it("activates immediately without an observer when no sentinel can be found", () => {
    const wrapper = mountGlass(() => [
      h("div", { class: "target", "data-glass-scroll": "" }, "T"),
    ]);
    const target = wrapper.get(".target").element;
    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(target.classList.contains("is-glass-active")).toBe(true);
  });

  it("creates one observer per [data-glass-scroll] element", () => {
    mountGlass(() => [
      h("div", { class: "s1" }, "S1"),
      h("div", { class: "t1", "data-glass-scroll": "" }, "T1"),
      h("div", { class: "s2" }, "S2"),
      h("div", { class: "t2", "data-glass-scroll": "" }, "T2"),
    ]);
    expect(MockIntersectionObserver.instances).toHaveLength(2);
  });

  it("disconnects every observer on unmount", () => {
    const wrapper = mountGlass(() => [
      h("div", { class: "sentinel" }, "S"),
      h("div", { class: "target", "data-glass-scroll": "" }, "T"),
    ]);
    const io = MockIntersectionObserver.instances[0];
    expect(io.disconnected).toBe(false);
    wrapper.unmount();
    active = null;
    expect(io.disconnected).toBe(true);
  });

  it("is a no-op when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const wrapper = mountGlass(() => [
      h("div", { class: "sentinel" }, "S"),
      h("div", { class: "target", "data-glass-scroll": "" }, "T"),
    ]);
    expect(
      wrapper.get(".target").element.classList.contains("is-glass-active"),
    ).toBe(false);
  });

  it("creates no observers when the root has no glass elements", () => {
    mountGlass(() => [h("div", { class: "plain" }, "x")]);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});
