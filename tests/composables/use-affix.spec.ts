import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNode } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useAffix } from "../../src/composables/useAffix";

// jsdom lacks IntersectionObserver; this mock records instances/options and
// lets a test drive the intersection callback synchronously.
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

interface AffixDetail {
  offset: number;
  root: Window | Element;
}

let active: VueWrapper | null = null;

const mountAffix = (children: () => VNode[]): VueWrapper => {
  const Comp = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      useAffix(root);
      return () => h("div", { ref: root }, children());
    },
  });
  const wrapper = mount(Comp, { attachTo: document.body });
  active = wrapper;
  return wrapper;
};

const recordEvents = (
  el: HTMLElement,
): { stuck: AffixDetail[]; unstuck: AffixDetail[] } => {
  const stuck: AffixDetail[] = [];
  const unstuck: AffixDetail[] = [];
  el.addEventListener("affix:stuck", (e: Event) => {
    stuck.push((e as CustomEvent<AffixDetail>).detail);
  });
  el.addEventListener("affix:unstuck", (e: Event) => {
    unstuck.push((e as CustomEvent<AffixDetail>).detail);
  });
  return { stuck, unstuck };
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

describe("useAffix", () => {
  it("inserts a hidden sentinel before the element and writes the offset custom property", () => {
    const wrapper = mountAffix(() => [
      h("div", { class: "vd-affix", "data-vd-affix-offset": "20" }, "A"),
    ]);
    const el = wrapper.get(".vd-affix").element as HTMLElement;
    const sentinel = el.previousElementSibling as HTMLElement;

    expect(sentinel).toBeTruthy();
    expect(sentinel.tagName).toBe("DIV");
    expect(sentinel.style.height).toBe("1px");
    expect(sentinel.style.visibility).toBe("hidden");
    expect(el.style.getPropertyValue("--vd-affix-top-offset")).toBe("20px");

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const io = MockIntersectionObserver.instances[0];
    expect(io.observed[0]).toBe(sentinel);
    expect(io.options?.rootMargin).toBe("-20px 0px 0px 0px");
    expect(io.options?.threshold).toBe(0);
    // No scrollable parent in jsdom -> viewport (root null).
    expect(io.options?.root ?? null).toBeNull();
  });

  it("adds is-stuck and emits affix:stuck when the sentinel leaves view", () => {
    const wrapper = mountAffix(() => [
      h("div", { class: "vd-affix", "data-vd-affix-offset": "20" }, "A"),
    ]);
    const el = wrapper.get(".vd-affix").element as HTMLElement;
    const events = recordEvents(el);
    const io = MockIntersectionObserver.instances[0];

    io.emit(false);
    expect(el.classList.contains("is-stuck")).toBe(true);
    expect(events.stuck).toHaveLength(1);
    expect(events.stuck[0].offset).toBe(20);
    expect(events.stuck[0].root).toBe(window);

    // Guarded: a second not-intersecting entry does not re-fire.
    io.emit(false);
    expect(events.stuck).toHaveLength(1);
  });

  it("removes is-stuck and emits affix:unstuck when the sentinel re-enters view", () => {
    const wrapper = mountAffix(() => [h("div", { class: "vd-affix" }, "A")]);
    const el = wrapper.get(".vd-affix").element as HTMLElement;
    const events = recordEvents(el);
    const io = MockIntersectionObserver.instances[0];

    io.emit(false);
    expect(el.classList.contains("is-stuck")).toBe(true);

    io.emit(true);
    expect(el.classList.contains("is-stuck")).toBe(false);
    expect(events.unstuck).toHaveLength(1);
    expect(events.unstuck[0].offset).toBe(0);

    // Guarded: another intersecting entry while already unstuck does nothing.
    io.emit(true);
    expect(events.unstuck).toHaveLength(1);
  });

  it("defaults the offset to 0 and treats a non-numeric offset as 0", () => {
    const wrapper = mountAffix(() => [
      h("div", { class: "plain-a", "data-vd-affix": "" }, "A"),
      h(
        "div",
        {
          class: "plain-b",
          "data-vd-affix": "",
          "data-vd-affix-offset": "abc",
        },
        "B",
      ),
    ]);
    const a = wrapper.get(".plain-a").element as HTMLElement;
    const b = wrapper.get(".plain-b").element as HTMLElement;
    expect(a.style.getPropertyValue("--vd-affix-top-offset")).toBe("0px");
    expect(b.style.getPropertyValue("--vd-affix-top-offset")).toBe("0px");
    expect(MockIntersectionObserver.instances[0].options?.rootMargin).toBe(
      "-0px 0px 0px 0px",
    );
  });

  it("matches .vd-affix, .vd-sticky and [data-vd-affix] and observes each", () => {
    mountAffix(() => [
      h("div", { class: "vd-affix" }, "A"),
      h("div", { class: "vd-sticky" }, "B"),
      h("div", { "data-vd-affix": "" }, "C"),
    ]);
    expect(MockIntersectionObserver.instances).toHaveLength(3);
  });

  it("disconnects the observer, removes the sentinel and clears the offset on unmount", () => {
    const wrapper = mountAffix(() => [
      h("div", { class: "vd-affix", "data-vd-affix-offset": "10" }, "A"),
    ]);
    const el = wrapper.get(".vd-affix").element as HTMLElement;
    const sentinel = el.previousElementSibling as HTMLElement;
    const io = MockIntersectionObserver.instances[0];
    io.emit(false); // set is-stuck so we can prove cleanup removes it

    wrapper.unmount();
    active = null;

    expect(io.disconnected).toBe(true);
    expect(sentinel.parentNode).toBeNull();
    expect(el.classList.contains("is-stuck")).toBe(false);
    expect(el.style.getPropertyValue("--vd-affix-top-offset")).toBe("");
  });

  it("creates no observers when the root has no affix elements", () => {
    mountAffix(() => [h("div", { class: "nope" }, "x")]);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});
