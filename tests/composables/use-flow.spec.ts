import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { useFlow, type FlowApi } from "../../src/composables/useFlow";

const mounted: VueWrapper[] = [];

function mountHost(html: string): { wrapper: VueWrapper; api: FlowApi } {
  let api!: FlowApi;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = useFlow(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
}

interface FlowChange {
  current: number;
  previous: number;
  total: number;
}

function collectChanges(el: Element): {
  events: FlowChange[];
  stop: () => void;
} {
  const events: FlowChange[] = [];
  const handler = (e: Event): void => {
    events.push((e as CustomEvent<FlowChange>).detail);
  };
  el.addEventListener("flow:change", handler);
  return {
    events,
    stop: () => el.removeEventListener("flow:change", handler),
  };
}

afterEach(() => {
  vi.useRealTimers();
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted */
    }
  }
  mounted.length = 0;
});

const threeSlides = (attrs = "", classes = ""): string => `
  <div class="vd-flow${classes ? " " + classes : ""}"${attrs ? " " + attrs : ""}>
    <div class="vd-flow-track">
      <div class="vd-flow-slide">A</div>
      <div class="vd-flow-slide">B</div>
      <div class="vd-flow-slide">C</div>
    </div>
    <button type="button" class="vd-flow-prev">&lsaquo;</button>
    <button type="button" class="vd-flow-next">&rsaquo;</button>
    <div class="vd-flow-indicators">
      <button type="button"></button>
      <button type="button"></button>
      <button type="button"></button>
    </div>
  </div>`;

const flowEl = (wrapper: VueWrapper): HTMLElement =>
  wrapper.get<HTMLElement>(".vd-flow").element;
const trackEl = (wrapper: VueWrapper): HTMLElement =>
  wrapper.get<HTMLElement>(".vd-flow-track").element;
const slides = (wrapper: VueWrapper): HTMLElement[] =>
  Array.from(flowEl(wrapper).querySelectorAll<HTMLElement>(".vd-flow-slide"));
const indicators = (wrapper: VueWrapper): HTMLElement[] =>
  Array.from(
    flowEl(wrapper).querySelectorAll<HTMLElement>(".vd-flow-indicator"),
  );
const liveRegion = (wrapper: VueWrapper): HTMLElement | null =>
  flowEl(wrapper).querySelector<HTMLElement>("[aria-live='polite']");

const drag = (el: HTMLElement, from: number, to: number): void => {
  el.dispatchEvent(
    new MouseEvent("mousedown", { clientX: from, bubbles: true }),
  );
  el.dispatchEvent(new MouseEvent("mousemove", { clientX: to, bubbles: true }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
};

describe("useFlow", () => {
  it("bootstraps carousel, slide, and live-region ARIA on mount", () => {
    const { wrapper } = mountHost(threeSlides());
    const el = flowEl(wrapper);

    expect(el.getAttribute("role")).toBe("region");
    expect(el.getAttribute("aria-roledescription")).toBe("carousel");
    expect(el.getAttribute("aria-label")).toBe("Carousel");
    expect(el.getAttribute("tabindex")).toBe("0");

    const [a, b, c] = slides(wrapper);
    expect(a!.getAttribute("role")).toBe("group");
    expect(a!.getAttribute("aria-roledescription")).toBe("slide");
    expect(a!.getAttribute("aria-label")).toBe("Slide 1 of 3");
    expect(c!.getAttribute("aria-label")).toBe("Slide 3 of 3");
    expect(a!.classList.contains("is-active")).toBe(true);
    expect(a!.getAttribute("aria-hidden")).toBe("false");
    expect(b!.getAttribute("aria-hidden")).toBe("true");
    expect(c!.getAttribute("aria-hidden")).toBe("true");

    const live = liveRegion(wrapper);
    expect(live).not.toBeNull();
    expect(live!.getAttribute("aria-atomic")).toBe("true");
    // Initial goTo does not announce.
    expect(live!.textContent).toBe("");
  });

  it("keeps an author-provided aria-label", () => {
    const { wrapper } = mountHost(threeSlides('aria-label="Gallery"'));
    expect(flowEl(wrapper).getAttribute("aria-label")).toBe("Gallery");
  });

  it("upgrades bare .vd-flow-indicators buttons with the indicator bridge", () => {
    const { wrapper } = mountHost(threeSlides());
    const dots = indicators(wrapper);

    expect(dots).toHaveLength(3);
    dots.forEach((dot, i) => {
      expect(dot.classList.contains("vd-flow-indicator")).toBe(true);
      expect(dot.getAttribute("role")).toBe("tab");
      expect(dot.getAttribute("aria-label")).toBe(`Go to slide ${i + 1}`);
    });
    expect(dots[0]!.classList.contains("is-active")).toBe(true);
    expect(dots[0]!.getAttribute("aria-selected")).toBe("true");
    expect(dots[1]!.getAttribute("aria-selected")).toBe("false");
  });

  it("advances on next click, updating transform, indicators, ARIA, live region, and flow:change", () => {
    const { wrapper } = mountHost(threeSlides());
    const el = flowEl(wrapper);
    const c = collectChanges(el);

    el.querySelector<HTMLElement>(".vd-flow-next")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    expect(trackEl(wrapper).style.transform).toBe("translateX(-100%)");
    const dots = indicators(wrapper);
    expect(dots[1]!.classList.contains("is-active")).toBe(true);
    expect(dots[1]!.getAttribute("aria-selected")).toBe("true");
    expect(dots[0]!.classList.contains("is-active")).toBe(false);
    expect(dots[0]!.getAttribute("aria-selected")).toBe("false");
    const [a, b] = slides(wrapper);
    expect(a!.getAttribute("aria-hidden")).toBe("true");
    expect(b!.getAttribute("aria-hidden")).toBe("false");
    expect(liveRegion(wrapper)!.textContent).toBe("Slide 2 of 3");
    expect(c.events).toEqual([{ current: 1, previous: 0, total: 3 }]);
    c.stop();
  });

  it("wraps around by default (loop): prev from the first slide reaches the last", () => {
    const { wrapper } = mountHost(threeSlides());
    const el = flowEl(wrapper);
    const c = collectChanges(el);

    el.querySelector<HTMLElement>(".vd-flow-prev")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    expect(trackEl(wrapper).style.transform).toBe("translateX(-200%)");
    expect(c.events).toEqual([{ current: 2, previous: 0, total: 3 }]);
    c.stop();
  });

  it("clamps instead of wrapping when data-vd-loop='false'", () => {
    const { wrapper } = mountHost(threeSlides('data-vd-loop="false"'));
    const el = flowEl(wrapper);
    const prevBtn = el.querySelector<HTMLElement>(".vd-flow-prev")!;
    const nextBtn = el.querySelector<HTMLElement>(".vd-flow-next")!;

    prevBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(trackEl(wrapper).style.transform).toBe("translateX(-0%)");
    expect(indicators(wrapper)[0]!.classList.contains("is-active")).toBe(true);

    nextBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    nextBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    nextBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(trackEl(wrapper).style.transform).toBe("translateX(-200%)");
  });

  it("navigates to an indicator's slide on click", () => {
    const { wrapper } = mountHost(threeSlides());
    indicators(wrapper)[2]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(trackEl(wrapper).style.transform).toBe("translateX(-200%)");
    expect(indicators(wrapper)[2]!.getAttribute("aria-selected")).toBe("true");
  });

  it("fades via is-active instead of transforming the track for .vd-flow-fade", () => {
    const { wrapper } = mountHost(threeSlides("", "vd-flow-fade"));
    const el = flowEl(wrapper);

    el.querySelector<HTMLElement>(".vd-flow-next")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    expect(trackEl(wrapper).style.transform).toBe("");
    const [a, b] = slides(wrapper);
    expect(a!.classList.contains("is-active")).toBe(false);
    expect(b!.classList.contains("is-active")).toBe(true);
  });

  it("navigates with ArrowRight/ArrowLeft on the container (with preventDefault)", () => {
    const { wrapper } = mountHost(threeSlides());
    const el = flowEl(wrapper);

    const right = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(right);
    expect(right.defaultPrevented).toBe(true);
    expect(trackEl(wrapper).style.transform).toBe("translateX(-100%)");

    el.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(trackEl(wrapper).style.transform).toBe("translateX(-0%)");
  });

  it("advances on a leftward swipe past the 50px threshold and applies is-dragging", () => {
    const { wrapper } = mountHost(threeSlides());
    const el = flowEl(wrapper);

    el.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 200, bubbles: true }),
    );
    expect(el.classList.contains("is-dragging")).toBe(true);
    el.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 120, bubbles: true }),
    );
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(el.classList.contains("is-dragging")).toBe(false);
    expect(trackEl(wrapper).style.transform).toBe("translateX(-100%)");
  });

  it("goes back on a rightward swipe and ignores sub-threshold drags", () => {
    const { wrapper } = mountHost(threeSlides());
    const el = flowEl(wrapper);

    drag(el, 100, 130); // 30px — under the threshold
    expect(trackEl(wrapper).style.transform).toBe("translateX(-0%)");

    drag(el, 100, 200); // rightward — previous slide (wraps to last)
    expect(trackEl(wrapper).style.transform).toBe("translateX(-200%)");
  });

  it("autoplays with data-vd-autoplay at the data-vd-interval period", () => {
    vi.useFakeTimers();
    const { wrapper } = mountHost(
      threeSlides('data-vd-autoplay data-vd-interval="100"'),
    );

    vi.advanceTimersByTime(100);
    expect(trackEl(wrapper).style.transform).toBe("translateX(-100%)");
    vi.advanceTimersByTime(100);
    expect(trackEl(wrapper).style.transform).toBe("translateX(-200%)");
    vi.advanceTimersByTime(100); // loops back around
    expect(trackEl(wrapper).style.transform).toBe("translateX(-0%)");
  });

  it("pauses autoplay on mouseenter/focusin and resumes on mouseleave/focusout", () => {
    vi.useFakeTimers();
    const { wrapper } = mountHost(
      threeSlides('data-vd-autoplay data-vd-interval="100"'),
    );
    const el = flowEl(wrapper);

    el.dispatchEvent(new MouseEvent("mouseenter"));
    vi.advanceTimersByTime(1000);
    expect(trackEl(wrapper).style.transform).toBe("translateX(-0%)");

    el.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(100);
    expect(trackEl(wrapper).style.transform).toBe("translateX(-100%)");

    el.dispatchEvent(new FocusEvent("focusin"));
    vi.advanceTimersByTime(1000);
    expect(trackEl(wrapper).style.transform).toBe("translateX(-100%)");

    el.dispatchEvent(new FocusEvent("focusout"));
    vi.advanceTimersByTime(100);
    expect(trackEl(wrapper).style.transform).toBe("translateX(-200%)");
  });

  it("exposes a goTo/next/prev controller keyed by element (vd3 extension)", () => {
    const { wrapper, api } = mountHost(threeSlides());
    const el = flowEl(wrapper);

    api.goTo(el, 2);
    expect(trackEl(wrapper).style.transform).toBe("translateX(-200%)");
    api.next(el); // wraps
    expect(trackEl(wrapper).style.transform).toBe("translateX(-0%)");
    api.prev(el); // wraps back
    expect(trackEl(wrapper).style.transform).toBe("translateX(-200%)");

    expect(() => {
      api.goTo(null, 1);
      api.next(null);
      api.prev(null);
      api.goTo(document.createElement("div"), 1); // unknown element no-op
    }).not.toThrow();
  });

  it("wires carousels added after mount via refresh() (vd3 extension)", () => {
    const { wrapper, api } = mountHost(threeSlides());
    const host = flowEl(wrapper).parentElement!;

    const late = document.createElement("div");
    late.className = "vd-carousel";
    late.innerHTML = `
      <div class="vd-flow-track">
        <div class="vd-flow-slide">X</div>
        <div class="vd-flow-slide">Y</div>
      </div>`;
    host.appendChild(late);
    expect(late.getAttribute("role")).toBeNull();

    api.refresh();

    expect(late.getAttribute("role")).toBe("region");
    expect(late.getAttribute("aria-roledescription")).toBe("carousel");
    api.next(late);
    expect(
      late.querySelector<HTMLElement>(".vd-flow-track")!.style.transform,
    ).toBe("translateX(-100%)");
  });

  it("re-syncs indicators added after mount via refresh()", () => {
    const { wrapper, api } = mountHost(threeSlides());
    const el = flowEl(wrapper);
    const group = el.querySelector<HTMLElement>(".vd-flow-indicators")!;
    group.innerHTML =
      "<button type='button'></button><button type='button'></button><button type='button'></button>";

    api.refresh();

    const dots = indicators(wrapper);
    expect(dots).toHaveLength(3);
    expect(dots[0]!.getAttribute("role")).toBe("tab");
    dots[2]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(trackEl(wrapper).style.transform).toBe("translateX(-200%)");
  });

  it("stops autoplay and removes listeners and the live region on unmount", () => {
    vi.useFakeTimers();
    const { wrapper } = mountHost(
      threeSlides('data-vd-autoplay data-vd-interval="100"'),
    );
    const el = flowEl(wrapper);
    const track = trackEl(wrapper);
    const nextBtn = el.querySelector<HTMLElement>(".vd-flow-next")!;
    const c = collectChanges(el);

    wrapper.unmount();

    expect(el.querySelector("[aria-live]")).toBeNull();
    vi.advanceTimersByTime(1000); // autoplay timer cleared
    nextBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    drag(el, 200, 100);

    expect(track.style.transform).toBe("translateX(-0%)");
    expect(c.events).toHaveLength(0);
    c.stop();
  });
});
