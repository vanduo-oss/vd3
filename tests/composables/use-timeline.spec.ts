import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNode } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import {
  useTimeline,
  type TimelineApi,
  type UseTimelineOptions,
} from "../../src/composables/useTimeline";

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

const active: VueWrapper[] = [];

const timelineItems = (n: number, revealedFirst = false): VNode[] =>
  Array.from({ length: n }, (_, i) =>
    h("li", {
      class:
        i === 0 && revealedFirst
          ? "vd-timeline-item is-revealed"
          : "vd-timeline-item",
    }),
  );

interface MountResult {
  wrapper: VueWrapper;
  api: TimelineApi;
}

const mountTimeline = (
  children: () => VNode[],
  options?: UseTimelineOptions,
): MountResult => {
  let api!: TimelineApi;
  const Comp = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = useTimeline(root, options);
      return () => h("div", { ref: root }, children());
    },
  });
  const wrapper = mount(Comp, { attachTo: document.body });
  active.push(wrapper);
  return { wrapper, api };
};

const mountPlayback = (
  n: number,
  options?: UseTimelineOptions,
): MountResult & {
  items: HTMLElement[];
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  play: HTMLButtonElement;
  pause: HTMLButtonElement;
} => {
  const result = mountTimeline(
    () => [
      h(
        "ul",
        { class: "vd-timeline vd-timeline-animated vd-timeline-playback" },
        timelineItems(n),
      ),
      h("button", { "data-vd-timeline-prev": "" }, "prev"),
      h("button", { "data-vd-timeline-next": "" }, "next"),
      h("button", { "data-vd-timeline-play": "" }, "play"),
      h("button", { "data-vd-timeline-pause": "" }, "pause"),
    ],
    options,
  );
  const el = result.wrapper.element as HTMLElement;
  return {
    ...result,
    items: Array.from(el.querySelectorAll<HTMLElement>(".vd-timeline-item")),
    prev: el.querySelector<HTMLButtonElement>("[data-vd-timeline-prev]")!,
    next: el.querySelector<HTMLButtonElement>("[data-vd-timeline-next]")!,
    play: el.querySelector<HTMLButtonElement>("[data-vd-timeline-play]")!,
    pause: el.querySelector<HTMLButtonElement>("[data-vd-timeline-pause]")!,
  };
};

const click = (el: HTMLElement): boolean =>
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );

const revealed = (items: HTMLElement[]): boolean[] =>
  items.map((i) => i.classList.contains("is-revealed"));

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  active.forEach((w) => w.unmount());
  active.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useTimeline", () => {
  it("staggers reveal delays in 140ms steps with the index capped at 7", () => {
    const { wrapper } = mountTimeline(() => [
      h("ul", { class: "vd-timeline vd-timeline-animated" }, timelineItems(10)),
    ]);
    const items = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(
        ".vd-timeline-item",
      ),
    );
    const delays = items.map((i) =>
      i.style.getPropertyValue("--vd-timeline-reveal-delay"),
    );
    expect(delays.slice(0, 3)).toEqual(["0ms", "140ms", "280ms"]);
    expect(delays[7]).toBe("980ms");
    expect(delays[8]).toBe("980ms"); // capped
    expect(delays[9]).toBe("980ms"); // capped
  });

  it("observes items with the vanilla observer options and reveals on intersection", () => {
    const { wrapper } = mountTimeline(() => [
      h("ul", { class: "vd-timeline vd-timeline-animated" }, timelineItems(3)),
    ]);
    const items = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(
        ".vd-timeline-item",
      ),
    );

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const io = MockIntersectionObserver.instances[0];
    expect(io.options?.root ?? null).toBeNull();
    expect(io.options?.rootMargin).toBe("0px 0px -10% 0px");
    expect(io.options?.threshold).toBe(0.15);
    expect(io.observed).toEqual(items);
    expect(revealed(items)).toEqual([false, false, false]);

    // Non-intersecting entries are ignored.
    io.emit([items[0]], false);
    expect(revealed(items)).toEqual([false, false, false]);

    io.emit([items[0], items[1]]);
    expect(revealed(items)).toEqual([true, true, false]);
    // Revealed items are unobserved so they never toggle again.
    expect(io.unobserved).toEqual([items[0], items[1]]);

    io.emit([items[2]]);
    expect(revealed(items)).toEqual([true, true, true]);
  });

  it("wires the root element itself when it is the animated container", () => {
    const Comp = defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null);
        useTimeline(root);
        return () =>
          h(
            "ul",
            { ref: root, class: "vd-timeline vd-timeline-animated" },
            timelineItems(2),
          );
      },
    });
    const wrapper = mount(Comp, { attachTo: document.body });
    active.push(wrapper);

    const items = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(
        ".vd-timeline-item",
      ),
    );
    expect(items[1].style.getPropertyValue("--vd-timeline-reveal-delay")).toBe(
      "140ms",
    );
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].observed).toEqual(items);
  });

  it("ignores plain .vd-timeline containers without the animated opt-in", () => {
    const { wrapper } = mountTimeline(() => [
      h("ul", { class: "vd-timeline" }, timelineItems(2)),
    ]);
    const items = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(
        ".vd-timeline-item",
      ),
    );
    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(items[0].style.getPropertyValue("--vd-timeline-reveal-delay")).toBe(
      "",
    );
  });

  it("reveals every item immediately under prefers-reduced-motion without creating an observer", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    const { wrapper } = mountTimeline(() => [
      h("ul", { class: "vd-timeline vd-timeline-animated" }, timelineItems(3)),
    ]);
    const items = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(
        ".vd-timeline-item",
      ),
    );
    expect(revealed(items)).toEqual([true, true, true]);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("reveals every item immediately when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { wrapper } = mountTimeline(() => [
      h("ul", { class: "vd-timeline vd-timeline-animated" }, timelineItems(2)),
    ]);
    const items = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(
        ".vd-timeline-item",
      ),
    );
    expect(revealed(items)).toEqual([true, true]);
  });

  it("disconnects the observer on unmount", () => {
    const { wrapper } = mountTimeline(() => [
      h("ul", { class: "vd-timeline vd-timeline-animated" }, timelineItems(2)),
    ]);
    const io = MockIntersectionObserver.instances[0];
    wrapper.unmount();
    active.length = 0;
    expect(io.disconnected).toBe(true);
  });

  describe("playback mode", () => {
    it("starts unrevealed (clearing pre-revealed items) with prev disabled and next enabled", () => {
      const { wrapper } = mountTimeline(() => [
        h(
          "ul",
          { class: "vd-timeline vd-timeline-animated vd-timeline-playback" },
          timelineItems(2, true),
        ),
        h("button", { "data-vd-timeline-prev": "" }),
        h("button", { "data-vd-timeline-next": "" }),
        h("button", { "data-vd-timeline-play": "" }),
        h("button", { "data-vd-timeline-pause": "" }),
      ]);
      const el = wrapper.element as HTMLElement;
      const items = Array.from(
        el.querySelectorAll<HTMLElement>(".vd-timeline-item"),
      );
      expect(revealed(items)).toEqual([false, false]);
      expect(MockIntersectionObserver.instances).toHaveLength(0);

      const prev = el.querySelector<HTMLButtonElement>(
        "[data-vd-timeline-prev]",
      )!;
      const next = el.querySelector<HTMLButtonElement>(
        "[data-vd-timeline-next]",
      )!;
      const play = el.querySelector<HTMLButtonElement>(
        "[data-vd-timeline-play]",
      )!;
      const pause = el.querySelector<HTMLButtonElement>(
        "[data-vd-timeline-pause]",
      )!;
      expect(prev.disabled).toBe(true);
      expect(prev.getAttribute("aria-disabled")).toBe("true");
      expect(next.disabled).toBe(false);
      expect(next.getAttribute("aria-disabled")).toBe("false");
      expect(play.getAttribute("aria-pressed")).toBe("false");
      expect(pause.disabled).toBe(true);
    });

    it("steps forward and back on next/prev clicks, tracking button state", () => {
      const { items, prev, next } = mountPlayback(2);

      // Click default is prevented (vanilla preventDefault).
      expect(click(next)).toBe(false);
      expect(revealed(items)).toEqual([true, false]);
      expect(prev.disabled).toBe(false);
      expect(prev.getAttribute("aria-disabled")).toBe("false");

      click(next);
      expect(revealed(items)).toEqual([true, true]);
      expect(next.disabled).toBe(true);
      expect(next.getAttribute("aria-disabled")).toBe("true");

      // Next at the end is a no-op.
      click(next);
      expect(revealed(items)).toEqual([true, true]);

      click(prev);
      expect(revealed(items)).toEqual([true, false]);
      expect(next.disabled).toBe(false);

      click(prev);
      expect(revealed(items)).toEqual([false, false]);
      expect(prev.disabled).toBe(true);

      // Prev at the start is a no-op.
      click(prev);
      expect(revealed(items)).toEqual([false, false]);
    });

    it("plays at 800ms per step and auto-pauses at the end", () => {
      vi.useFakeTimers();
      const { items, play, pause, next } = mountPlayback(2);

      click(play);
      expect(play.getAttribute("aria-pressed")).toBe("true");
      expect(pause.disabled).toBe(false);
      expect(revealed(items)).toEqual([false, false]);

      // Playing twice does not double-schedule.
      click(play);

      vi.advanceTimersByTime(800);
      expect(revealed(items)).toEqual([true, false]);

      vi.advanceTimersByTime(800);
      expect(revealed(items)).toEqual([true, true]);

      // Auto-paused at the end.
      expect(play.getAttribute("aria-pressed")).toBe("false");
      expect(pause.disabled).toBe(true);
      expect(next.disabled).toBe(true);
      vi.advanceTimersByTime(5000);
      expect(revealed(items)).toEqual([true, true]);
    });

    it("pause stops the timer so no further items reveal", () => {
      vi.useFakeTimers();
      const { items, play, pause } = mountPlayback(3);

      click(play);
      vi.advanceTimersByTime(800);
      expect(revealed(items)).toEqual([true, false, false]);

      click(pause);
      expect(play.getAttribute("aria-pressed")).toBe("false");
      expect(pause.disabled).toBe(true);

      vi.advanceTimersByTime(5000);
      expect(revealed(items)).toEqual([true, false, false]);
    });

    it("clears timers and click listeners on unmount", () => {
      vi.useFakeTimers();
      const { wrapper, items, play, next } = mountPlayback(2);

      click(play);
      wrapper.unmount();
      active.length = 0;

      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(5000);
      expect(revealed(items)).toEqual([false, false]);

      click(next);
      expect(revealed(items)).toEqual([false, false]);
    });

    it("keeps a sibling instance working when another unmounts", () => {
      const a = mountPlayback(2);
      const b = mountPlayback(2);

      a.wrapper.unmount();
      active.splice(active.indexOf(a.wrapper), 1);

      click(b.next);
      expect(revealed(b.items)).toEqual([true, false]);
      expect(b.prev.disabled).toBe(false);
    });

    it("reduced motion wins over playback: items reveal and controls stay unwired", () => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
      }));
      const { items, prev, next } = mountPlayback(2);
      expect(revealed(items)).toEqual([true, true]);
      // No wiring: clicking prev must not unreveal anything.
      click(prev);
      expect(revealed(items)).toEqual([true, true]);
      expect(next.hasAttribute("aria-disabled")).toBe(false);
    });
  });

  describe("controller (vd3 extension)", () => {
    it("exposes stepNext/stepPrev/play/pause acting on playback containers", () => {
      vi.useFakeTimers();
      const { api, items, play } = mountPlayback(2);

      api.stepNext();
      expect(revealed(items)).toEqual([true, false]);
      api.stepPrev();
      expect(revealed(items)).toEqual([false, false]);

      api.play();
      expect(play.getAttribute("aria-pressed")).toBe("true");
      vi.advanceTimersByTime(800);
      expect(revealed(items)).toEqual([true, false]);
      api.pause();
      vi.advanceTimersByTime(5000);
      expect(revealed(items)).toEqual([true, false]);
    });

    it("honors staggerMs/maxStaggerIndex/playIntervalMs options", () => {
      vi.useFakeTimers();
      const { wrapper } = mountTimeline(
        () => [
          h(
            "ul",
            { class: "vd-timeline vd-timeline-animated" },
            timelineItems(4),
          ),
        ],
        { staggerMs: 10, maxStaggerIndex: 2 },
      );
      const items = Array.from(
        (wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(
          ".vd-timeline-item",
        ),
      );
      expect(
        items.map((i) =>
          i.style.getPropertyValue("--vd-timeline-reveal-delay"),
        ),
      ).toEqual(["0ms", "10ms", "20ms", "20ms"]);

      const pb = mountPlayback(2, { playIntervalMs: 100 });
      click(pb.play);
      vi.advanceTimersByTime(100);
      expect(revealed(pb.items)).toEqual([true, false]);
      vi.advanceTimersByTime(100);
      expect(revealed(pb.items)).toEqual([true, true]);
    });

    it("refresh() wires containers added after mount, idempotently", () => {
      const { wrapper, api } = mountTimeline(() => [
        h(
          "ul",
          { class: "vd-timeline vd-timeline-animated" },
          timelineItems(1),
        ),
      ]);
      expect(MockIntersectionObserver.instances).toHaveLength(1);

      // Re-scanning without new content wires nothing twice.
      api.refresh();
      expect(MockIntersectionObserver.instances).toHaveLength(1);

      const added = document.createElement("ul");
      added.className = "vd-timeline vd-timeline-animated";
      added.innerHTML =
        '<li class="vd-timeline-item"></li><li class="vd-timeline-item"></li>';
      wrapper.element.appendChild(added);

      api.refresh();
      expect(MockIntersectionObserver.instances).toHaveLength(2);
      const item = added.querySelector<HTMLElement>(
        ".vd-timeline-item:nth-child(2)",
      )!;
      expect(item.style.getPropertyValue("--vd-timeline-reveal-delay")).toBe(
        "140ms",
      );

      api.refresh();
      expect(MockIntersectionObserver.instances).toHaveLength(2);
    });

    it("is callable exactly like the old shim (return value ignorable)", () => {
      const { wrapper } = mountTimeline(() => [
        h(
          "ul",
          { class: "vd-timeline vd-timeline-animated" },
          timelineItems(1),
        ),
      ]);
      // Old call sites: useTimeline(root) with the result discarded.
      expect(MockIntersectionObserver.instances).toHaveLength(1);
      expect(wrapper.element.querySelector(".vd-timeline-item")).toBeTruthy();
    });
  });
});
