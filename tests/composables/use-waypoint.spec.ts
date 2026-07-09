import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { useWaypoint } from "../../src/composables/useWaypoint";

// Minimal controllable IntersectionObserver: jsdom ships none, and the
// composable's core behaviour is driven by feeding entries to the callback.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  readonly cb: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  disconnected = false;

  constructor(
    cb: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.cb = cb;
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
  trigger(entries: Array<{ id: string; isIntersecting: boolean }>): void {
    const mapped = entries.map(
      (e) =>
        ({
          target: document.getElementById(e.id) as Element,
          isIntersecting: e.isIntersecting,
        }) as IntersectionObserverEntry,
    );
    this.cb(mapped, this as unknown as IntersectionObserver);
  }
}

const mounted: VueWrapper[] = [];

function mountHost(html: string): { wrapper: VueWrapper } {
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      useWaypoint(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper };
}

const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  Element.prototype.scrollIntoView = vi.fn();
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
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

// A nav plus three real sections the links point at.
const fixture = (navAttrs: string): string => `
  <nav ${navAttrs}>
    <a href="#a">A</a>
    <a href="#b">B</a>
    <a href="#c">C</a>
  </nav>
  <section id="a">A</section>
  <section id="b">B</section>
  <section id="c">C</section>`;

const linkFor = (wrapper: VueWrapper, id: string): HTMLAnchorElement =>
  wrapper.get<HTMLAnchorElement>(`a[href="#${id}"]`).element;
const io = (): MockIntersectionObserver =>
  MockIntersectionObserver.instances[0]!;

describe("useWaypoint", () => {
  it("tags sections, observes them, and builds the observer with offset margin/root", () => {
    const { wrapper } = mountHost(fixture(`data-vd-waypoint-nav=""`));

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(io().observed).toHaveLength(3);
    for (const id of ["a", "b", "c"]) {
      expect(
        wrapper.get(`#${id}`).element.hasAttribute("data-vd-waypoint-section"),
      ).toBe(true);
    }
    // Empty selector -> viewport (root: null); default offset 80.
    expect(io().options?.root).toBeNull();
    expect(io().options?.rootMargin).toBe("-80px 0px -40% 0px");
    expect(io().options?.threshold).toBe(0);
  });

  it("honours a custom offset in the rootMargin", () => {
    mountHost(fixture(`data-vd-waypoint-nav="" data-vd-waypoint-offset="120"`));
    expect(io().options?.rootMargin).toBe("-120px 0px -40% 0px");
  });

  it("resolves the selector to a scroll-container root", () => {
    const { wrapper } = mountHost(
      `<div id="box"></div>` + fixture(`data-vd-waypoint-nav="#box"`),
    );
    expect(io().options?.root).toBe(wrapper.get("#box").element);
  });

  it("also matches the data-vd-scrollspy-nav alias", () => {
    mountHost(fixture(`data-vd-scrollspy-nav=""`));
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });

  it("activates the link of the topmost visible section and fires waypoint:change", () => {
    const { wrapper } = mountHost(fixture(`data-vd-waypoint-nav=""`));
    const nav = wrapper.get("nav").element;
    const changes: string[] = [];
    nav.addEventListener("waypoint:change", (e) =>
      changes.push((e as CustomEvent<{ activeId: string }>).detail.activeId),
    );

    io().trigger([{ id: "b", isIntersecting: true }]);

    expect(linkFor(wrapper, "b").classList.contains("is-active")).toBe(true);
    expect(linkFor(wrapper, "b").getAttribute("aria-current")).toBe("true");
    expect(linkFor(wrapper, "a").classList.contains("is-active")).toBe(false);
    expect(linkFor(wrapper, "a").hasAttribute("aria-current")).toBe(false);
    expect(changes).toEqual(["b"]);
  });

  it("resolves ties by document order (topmost wins) as visibility changes", () => {
    const { wrapper } = mountHost(fixture(`data-vd-waypoint-nav=""`));

    // b and c visible -> b wins (earliest in section order).
    io().trigger([
      { id: "b", isIntersecting: true },
      { id: "c", isIntersecting: true },
    ]);
    expect(linkFor(wrapper, "b").classList.contains("is-active")).toBe(true);

    // a becomes visible too -> a now wins.
    io().trigger([{ id: "a", isIntersecting: true }]);
    expect(linkFor(wrapper, "a").classList.contains("is-active")).toBe(true);
    expect(linkFor(wrapper, "b").classList.contains("is-active")).toBe(false);

    // a leaves -> falls back to b.
    io().trigger([{ id: "a", isIntersecting: false }]);
    expect(linkFor(wrapper, "b").classList.contains("is-active")).toBe(true);
  });

  it("smooth-scrolls and activates on link click (preventDefault)", () => {
    const { wrapper } = mountHost(fixture(`data-vd-waypoint-nav=""`));
    const section = wrapper.get("#c").element;
    const scrollSpy = section.scrollIntoView as ReturnType<typeof vi.fn>;

    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    linkFor(wrapper, "c").dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth" });
    expect(linkFor(wrapper, "c").classList.contains("is-active")).toBe(true);
  });

  it("skips a nav with no in-page anchor links (no observer created)", () => {
    mountHost(`<nav data-vd-waypoint-nav=""><a href="/away">Out</a></nav>`);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("skips a nav whose links resolve to no sections", () => {
    mountHost(`<nav data-vd-waypoint-nav=""><a href="#nope">Nope</a></nav>`);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("disconnects the observer and drops click listeners on unmount", () => {
    const { wrapper } = mountHost(fixture(`data-vd-waypoint-nav=""`));
    const observer = io();
    const link = linkFor(wrapper, "c");

    wrapper.unmount();
    expect(observer.disconnected).toBe(true);

    // Click listener is gone: a fresh cancelable click is not prevented and
    // does not re-trigger a smooth scroll.
    (link.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(link.scrollIntoView).not.toHaveBeenCalled();
  });
});
