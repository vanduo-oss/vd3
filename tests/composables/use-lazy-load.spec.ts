import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import {
  useLazyLoad,
  type LazyLoadApi,
} from "../../src/composables/useLazyLoad";

// jsdom ships no IntersectionObserver; drive the composable by feeding
// intersection entries to the captured callback.
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
    this.observed = [];
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  /** Fire `isIntersecting: true` for `el` (or every observed element). */
  enter(el?: Element): void {
    const targets = el ? [el] : [...this.observed];
    const entries = targets.map(
      (t) => ({ target: t, isIntersecting: true }) as IntersectionObserverEntry,
    );
    this.cb(entries, this as unknown as IntersectionObserver);
  }
}

const observerFor = (el: Element): MockIntersectionObserver | undefined =>
  MockIntersectionObserver.instances.find((o) => o.observed.includes(el));

// `useLazyLoad` must run inside a component `setup()` (onMounted/onUnmounted);
// capture its returned API for direct low/high-level calls.
let api: LazyLoadApi;
const mounted: VueWrapper[] = [];
const containers: HTMLElement[] = [];

function mountHost(html = "", useRoot = false): { wrapper: VueWrapper } {
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = useLazyLoad(useRoot ? root : undefined);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper };
}

function makeContainer(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  containers.push(el);
  return el;
}

function okFetch(html: string): Mock {
  return vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(html),
  });
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
  for (const c of containers) c.remove();
  containers.length = 0;
  vi.unstubAllGlobals();
});

describe("useLazyLoad — observe (low-level)", () => {
  it("fires the callback once on first intersection and auto-unobserves", () => {
    const el = makeContainer();
    const cb = vi.fn();
    mountHost();
    api.observe(el, cb);

    const io = MockIntersectionObserver.instances[0]!;
    expect(io.observed).toContain(el);

    io.enter();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(el);
    expect(io.observed).not.toContain(el); // auto-unobserved

    io.enter(); // nothing observed now → no re-fire
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("passes threshold and rootMargin through to the observer", () => {
    const el = makeContainer();
    mountHost();
    api.observe(el, vi.fn(), { threshold: 0.5, rootMargin: "100px" });
    expect(MockIntersectionObserver.instances[0]!.options).toEqual({
      threshold: 0.5,
      rootMargin: "100px",
    });
  });

  it("defaults to threshold 0 / rootMargin '0px'", () => {
    const el = makeContainer();
    mountHost();
    api.observe(el, vi.fn());
    expect(MockIntersectionObserver.instances[0]!.options).toEqual({
      threshold: 0,
      rootMargin: "0px",
    });
  });

  it("ignores a second observe() of the same element", () => {
    const el = makeContainer();
    mountHost();
    api.observe(el, vi.fn());
    api.observe(el, vi.fn());
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });

  it("unobserve() cancels a pending observation", () => {
    const el = makeContainer();
    const cb = vi.fn();
    mountHost();
    api.observe(el, cb);
    const io = MockIntersectionObserver.instances[0]!;

    api.unobserve(el);
    expect(io.observed).not.toContain(el);

    io.enter();
    expect(cb).not.toHaveBeenCalled();
  });

  it("loads eagerly when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const el = makeContainer();
    const cb = vi.fn();
    mountHost();

    api.observe(el, cb);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(el);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("warns and no-ops on a non-Element target", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mountHost();
    api.observe(null as unknown as Element, vi.fn());
    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("useLazyLoad — loadSection (high-level)", () => {
  it("renders the skeleton + fires loading immediately, then fetches on intersection and injects sanitized HTML + fires loaded", async () => {
    const container = makeContainer();
    const events: string[] = [];
    container.addEventListener("lazysection:loading", () =>
      events.push("loading"),
    );
    container.addEventListener("lazysection:loaded", () =>
      events.push("loaded"),
    );
    const fetchMock = okFetch("<p>Section body</p>");
    vi.stubGlobal("fetch", fetchMock);

    mountHost();
    const onLoaded = vi.fn();
    api.loadSection("/section.html", container, {
      placeholder: "skeleton",
      onLoaded,
    });

    // Immediate: loading fired + skeleton visible; fetch deferred.
    expect(events).toEqual(["loading"]);
    expect(container.querySelector(".vd-skeleton-card")).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    observerFor(container)!.enter();
    expect(fetchMock).toHaveBeenCalledWith(
      "/section.html",
      expect.objectContaining({ signal: expect.anything() }),
    );

    await flushPromises();
    expect(container.querySelector(".vd-skeleton-card")).toBeNull();
    expect(container.innerHTML).toContain("<p>Section body</p>");
    expect(events).toEqual(["loading", "loaded"]);
    expect(onLoaded).toHaveBeenCalledWith(container);
  });

  it("renders the spinner placeholder on request", () => {
    const container = makeContainer();
    vi.stubGlobal("fetch", vi.fn());
    mountHost();
    api.loadSection("/s.html", container, { placeholder: "spinner" });
    expect(container.querySelector(".vd-dynamic-loader")).not.toBeNull();
    expect(container.querySelector(".vd-skeleton-card")).toBeNull();
  });

  it("sanitizes a custom placeholder string", () => {
    const container = makeContainer();
    vi.stubGlobal("fetch", vi.fn());
    mountHost();
    api.loadSection("/s.html", container, {
      placeholder: "<p>hold</p><script>window.__x=1;<\/script>",
    });
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("p")?.textContent).toBe("hold");
  });

  it("blocks a javascript: URL — no injection, no fetch, dispatches error + calls onError", () => {
    const container = makeContainer();
    let detail: { error?: Error } | null = null;
    container.addEventListener("lazysection:error", (e) => {
      detail = (e as CustomEvent).detail;
    });
    const onError = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    mountHost();
    api.loadSection("javascript:alert(1)", container, { onError });

    expect(container.innerHTML).toBe(""); // neither placeholder nor content
    expect(fetchMock).not.toHaveBeenCalled();
    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(detail!.error).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("blocks a cross-origin http URL", () => {
    const container = makeContainer();
    const onError = vi.fn();
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
    mountHost();
    api.loadSection("http://evil.example.com/x.html", container, { onError });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("renders an inline error alert and dispatches error on fetch failure", async () => {
    const container = makeContainer();
    let detail: { error?: Error } | null = null;
    container.addEventListener("lazysection:error", (e) => {
      detail = (e as CustomEvent).detail;
    });
    const onError = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    mountHost();
    api.loadSection("/x.html", container, { onError });
    observerFor(container)!.enter();
    await flushPromises();

    const alert = container.querySelector(".vd-alert.vd-alert-error");
    expect(alert).not.toBeNull();
    expect(alert!.getAttribute("role")).toBe("alert");
    expect(alert!.textContent).toContain("network down");
    expect(detail!.error?.message).toBe("network down");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("treats a non-2xx response as a failure (HTTP status)", async () => {
    const container = makeContainer();
    let detail: { error?: Error } | null = null;
    container.addEventListener("lazysection:error", (e) => {
      detail = (e as CustomEvent).detail;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    mountHost();
    api.loadSection("/missing.html", container);
    observerFor(container)!.enter();
    await flushPromises();

    expect(detail!.error?.message).toBe("HTTP 404");
    expect(container.querySelector(".vd-alert-error")).not.toBeNull();
  });

  it("sanitizes injected content — strips <script> and on* handlers", async () => {
    const container = makeContainer();
    const html =
      '<p>safe</p><script>window.__pwned=1;<\/script><span onclick="steal()">x</span>';
    vi.stubGlobal("fetch", okFetch(html));

    mountHost();
    api.loadSection("/s.html", container);
    observerFor(container)!.enter();
    await flushPromises();

    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("onclick");
    expect(container.querySelector("p")?.textContent).toBe("safe");
  });
});

describe("useLazyLoad — [data-vd-lazy] root wiring", () => {
  it("wires descendants and transitions data-vd-lazy-state loading → loaded", async () => {
    vi.stubGlobal("fetch", okFetch("<p>Fragment</p>"));
    const { wrapper } = mountHost(
      '<div data-vd-lazy="/frag.html" id="frag">orig</div>',
      true,
    );
    const el = wrapper.get("#frag").element as HTMLElement;

    expect(el.dataset.vdLazyState).toBe("loading");
    expect(el.querySelector(".vd-skeleton-card")).not.toBeNull(); // default placeholder

    observerFor(el)!.enter();
    await flushPromises();

    expect(el.dataset.vdLazyState).toBe("loaded");
    expect(el.innerHTML).toContain("<p>Fragment</p>");
  });

  it("honours data-vd-lazy-placeholder=spinner", () => {
    vi.stubGlobal("fetch", vi.fn());
    const { wrapper } = mountHost(
      '<div data-vd-lazy="/frag.html" data-vd-lazy-placeholder="spinner" id="frag"></div>',
      true,
    );
    const el = wrapper.get("#frag").element;
    expect(el.querySelector(".vd-dynamic-loader")).not.toBeNull();
    expect(el.querySelector(".vd-skeleton-card")).toBeNull();
  });

  it("skips a [data-vd-lazy] element with an empty URL", () => {
    vi.stubGlobal("fetch", vi.fn());
    const { wrapper } = mountHost(
      '<div data-vd-lazy="" id="frag">keep</div>',
      true,
    );
    const el = wrapper.get("#frag").element as HTMLElement;
    expect(el.dataset.vdLazyState).toBeUndefined();
    expect(el.textContent).toBe("keep");
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("marks the state error and shows the alert when a fragment fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = mountHost(
      '<div data-vd-lazy="/frag.html" id="frag"></div>',
      true,
    );
    const el = wrapper.get("#frag").element as HTMLElement;

    observerFor(el)!.enter();
    await flushPromises();

    expect(el.dataset.vdLazyState).toBe("error");
    expect(el.querySelector(".vd-alert-error")).not.toBeNull();
  });

  it("does not wire when no root ref is provided", () => {
    vi.stubGlobal("fetch", vi.fn());
    mountHost('<div data-vd-lazy="/frag.html" id="frag"></div>', false);
    // No root → onMounted skips wiring → no observers.
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});

describe("useLazyLoad — disposal", () => {
  it("disconnects a pending observer on unmount", () => {
    const el = makeContainer();
    const { wrapper } = mountHost();
    api.observe(el, vi.fn());
    const io = MockIntersectionObserver.instances[0]!;
    expect(io.disconnected).toBe(false);

    wrapper.unmount();
    expect(io.disconnected).toBe(true);
  });

  it("aborts an in-flight section fetch on unmount", async () => {
    const container = makeContainer();
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { wrapper } = mountHost();
    api.loadSection("/x.html", container);
    observerFor(container)!.enter();

    const signal = fetchMock.mock.calls[0]![1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    wrapper.unmount();
    expect(signal.aborted).toBe(true);

    await flushPromises();
  });
});
