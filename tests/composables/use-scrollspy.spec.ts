import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useScrollspy } from "../../src/composables/useScrollspy";

// jsdom has no IntersectionObserver; a controllable mock lets us feed
// intersection entries by hand and assert observe/disconnect wiring.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[] = [];
  disconnected = false;
  readonly root: Element | null = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element): void {
    this.observed.push(el);
  }
  unobserve(el: Element): void {
    this.observed = this.observed.filter((e) => e !== el);
  }
  disconnect(): void {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  emit(records: Array<{ id: string; isIntersecting: boolean }>): void {
    const entries = records.map(
      (r) =>
        ({
          isIntersecting: r.isIntersecting,
          target: { id: r.id } as Element,
        }) as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

const last = (): MockIntersectionObserver => {
  const arr = MockIntersectionObserver.instances;
  return arr[arr.length - 1];
};

const mountSpy = (
  ids: string[],
  options?: { offset?: number; rootMargin?: string },
): { wrapper: VueWrapper; activeId: () => string | null } => {
  let api!: ReturnType<typeof useScrollspy>;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useScrollspy(ids, options);
        return () => h("div");
      },
    }),
  );
  return { wrapper, activeId: () => api.activeId.value };
};

const addSections = (ids: string[]): void => {
  ids.forEach((id) => {
    const el = document.createElement("section");
    el.id = id;
    document.body.appendChild(el);
  });
};

describe("useScrollspy", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("seeds activeId with the first id (null when empty)", () => {
    addSections(["a", "b"]);
    expect(mountSpy(["a", "b"]).activeId()).toBe("a");
    expect(mountSpy([]).activeId()).toBeNull();
  });

  it("observes only the ids that resolve to DOM elements", () => {
    addSections(["a", "b"]); // 'c' intentionally missing
    mountSpy(["a", "b", "c"]);
    expect(last().observed.map((el) => el.id)).toEqual(["a", "b"]);
  });

  it("derives the default rootMargin from the offset and uses threshold 0", () => {
    addSections(["a"]);
    mountSpy(["a"]);
    expect(last().options?.rootMargin).toBe("-96px 0px -60% 0px");
    expect(last().options?.threshold).toBe(0);

    mountSpy(["a"], { offset: 40 });
    expect(last().options?.rootMargin).toBe("-40px 0px -60% 0px");
  });

  it("honours an explicit rootMargin override", () => {
    addSections(["a"]);
    mountSpy(["a"], { rootMargin: "0px 0px 0px 0px" });
    expect(last().options?.rootMargin).toBe("0px 0px 0px 0px");
  });

  it("activates the first visible id in document order", () => {
    addSections(["a", "b", "c"]);
    const spy = mountSpy(["a", "b", "c"]);

    last().emit([{ id: "b", isIntersecting: true }]);
    expect(spy.activeId()).toBe("b");

    // 'a' also enters — it precedes 'b' in the ids list, so it wins.
    last().emit([{ id: "a", isIntersecting: true }]);
    expect(spy.activeId()).toBe("a");

    // 'a' leaves — falls back to the still-visible 'b'.
    last().emit([{ id: "a", isIntersecting: false }]);
    expect(spy.activeId()).toBe("b");
  });

  it("leaves activeId unchanged when nothing is visible", () => {
    addSections(["a", "b"]);
    const spy = mountSpy(["a", "b"]);

    last().emit([{ id: "b", isIntersecting: true }]);
    expect(spy.activeId()).toBe("b");
    // Everything leaves — no visible id, so the last active value sticks.
    last().emit([{ id: "b", isIntersecting: false }]);
    expect(spy.activeId()).toBe("b");
  });

  it("disconnects the observer on unmount", () => {
    addSections(["a"]);
    const spy = mountSpy(["a"]);
    const observer = last();
    expect(observer.disconnected).toBe(false);
    spy.wrapper.unmount();
    expect(observer.disconnected).toBe(true);
  });

  it("no-ops (keeps the seed id) when IntersectionObserver is unavailable", () => {
    vi.unstubAllGlobals();
    expect("IntersectionObserver" in window).toBe(false);
    addSections(["a", "b"]);
    const spy = mountSpy(["a", "b"]);
    expect(spy.activeId()).toBe("a");
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});
