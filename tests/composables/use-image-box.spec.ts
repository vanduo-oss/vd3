import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref, type Ref } from "vue";
import { useImageBox } from "../../src/composables/useImageBox";

// Each composable runs in a component scope: mount a host whose root ref is
// handed to the composable, with the fixture markup injected as innerHTML so
// the composable's onMounted `querySelectorAll` scan sees real DOM. attachTo
// body so focus() / document.activeElement behave.
const mounted: VueWrapper[] = [];

function mountHost(
  html: string,
  use: (root: Ref<HTMLElement | null>) => void = useImageBox,
): VueWrapper {
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      use(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

const click = (el: Element): MouseEvent => {
  const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
};

const keydown = (el: EventTarget, key: string): KeyboardEvent => {
  const ev = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(ev);
  return ev;
};

const setScrollY = (y: number): void => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
};

const backdrop = (): HTMLElement =>
  document.querySelector<HTMLElement>(".vd-image-box-backdrop")!;
const boxImg = (): HTMLImageElement =>
  document.querySelector<HTMLImageElement>(".vd-image-box-img")!;
const caption = (): HTMLElement =>
  document.querySelector<HTMLElement>(".vd-image-box-caption")!;

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted by the test under test */
    }
  }
  mounted.length = 0;
  vi.useRealTimers();
  setScrollY(0);
  document.body.classList.remove("body-image-box-open");
  document.body.style.removeProperty("--vd-scrollbar-width");
  document
    .querySelectorAll(".vd-image-box-backdrop")
    .forEach((n) => n.remove());
});

describe("useImageBox", () => {
  it("wires triggers with .vd-image-box-trigger and adds button semantics to non-button/anchor triggers", () => {
    const wrapper = mountHost(
      `<img id="t1" data-image-box data-image-box-src="a.png" alt="a" />
       <div id="t2" data-image-box data-image-box-src="b.png"></div>
       <button id="t3" data-image-box data-image-box-src="c.png"></button>`,
    );

    const t1 = wrapper.get("#t1").element;
    const t2 = wrapper.get("#t2").element;
    const t3 = wrapper.get("#t3").element;

    expect(t1.classList.contains("vd-image-box-trigger")).toBe(true);
    expect(t2.classList.contains("vd-image-box-trigger")).toBe(true);
    expect(t3.classList.contains("vd-image-box-trigger")).toBe(true);

    // Non-interactive triggers (<img>, <div>) get full button semantics.
    for (const el of [t1, t2]) {
      expect(el.getAttribute("role")).toBe("button");
      expect(el.getAttribute("tabindex")).toBe("0");
      expect(el.getAttribute("aria-label")).toBe("View enlarged image");
    }

    // Native <button> triggers are left as-is.
    expect(t3.getAttribute("role")).toBeNull();
  });

  it("lazily creates one shared backdrop in body with dialog ARIA and its parts", () => {
    mountHost(`<div data-image-box data-image-box-src="a.png"></div>`);

    const backdrops = document.querySelectorAll(".vd-image-box-backdrop");
    expect(backdrops).toHaveLength(1);

    const b = backdrop();
    expect(b.parentElement).toBe(document.body);
    expect(b.getAttribute("role")).toBe("dialog");
    expect(b.getAttribute("aria-modal")).toBe("true");
    expect(b.getAttribute("aria-label")).toBe("Image viewer");
    expect(b.getAttribute("tabindex")).toBe("-1");

    expect(b.querySelector(".vd-image-box-container")).not.toBeNull();
    expect(b.querySelector(".vd-image-box-img")).not.toBeNull();
    const closeBtn = b.querySelector(".vd-image-box-close")!;
    expect(closeBtn.getAttribute("aria-label")).toBe("Close image viewer");
    expect(b.querySelector(".vd-image-box-caption")).not.toBeNull();
  });

  it("opens on click resolving the full-size source, locks scroll, and fires imageBox:open", () => {
    const wrapper = mountHost(
      `<img id="t" data-image-box src="thumb.png" data-image-box-full-src="full.png" alt="a" />`,
    );
    const trigger = wrapper.get("#t").element;

    const opens: CustomEvent[] = [];
    document.addEventListener("imageBox:open", (e) =>
      opens.push(e as CustomEvent),
    );

    const ev = click(trigger);

    // click is prevented, box shows the full-size image
    expect(ev.defaultPrevented).toBe(true);
    expect(backdrop().classList.contains("is-visible")).toBe(true);
    expect(boxImg().src).toContain("full.png");

    // body scroll is locked with the scrollbar-width compensation set
    expect(document.body.classList.contains("body-image-box-open")).toBe(true);
    expect(
      document.body.style.getPropertyValue("--vd-scrollbar-width"),
    ).toMatch(/px$/);

    // event fired once, carrying the resolved (full) source
    expect(opens).toHaveLength(1);
    expect(opens[0]!.detail.src).toMatch(/full\.png$/);

    document.removeEventListener("imageBox:open", () => {});
  });

  it("sets the caption from alt as a fallback, and hides it when there is no caption", () => {
    const wrapper = mountHost(
      `<img id="cap" data-image-box data-image-box-src="a.png" alt="A cat" />`,
    );
    click(wrapper.get("#cap").element);
    expect(caption().textContent).toBe("A cat");
    expect(caption().style.display).toBe("block");
  });

  it("prefers an explicit data-image-box-caption over alt, and hides the caption when empty", () => {
    const wrapper = mountHost(
      `<img id="cap" data-image-box data-image-box-src="a.png" alt="alt text"
            data-image-box-caption="Explicit" />
       <div id="nocap" data-image-box data-image-box-src="b.png"></div>`,
    );

    click(wrapper.get("#cap").element);
    expect(caption().textContent).toBe("Explicit");
    expect(caption().style.display).toBe("block");

    // close, then open the caption-less trigger
    keydown(document, "Escape");
    click(wrapper.get("#nocap").element);
    expect(caption().style.display).toBe("none");
  });

  it("opens a plain trigger via Enter and via Space", () => {
    const wrapper = mountHost(
      `<div id="a" data-image-box data-image-box-src="a.png"></div>
       <div id="b" data-image-box data-image-box-src="b.png"></div>`,
    );

    const enter = keydown(wrapper.get("#a").element, "Enter");
    expect(enter.defaultPrevented).toBe(true);
    expect(backdrop().classList.contains("is-visible")).toBe(true);

    keydown(document, "Escape");
    expect(backdrop().classList.contains("is-visible")).toBe(false);

    const space = keydown(wrapper.get("#b").element, " ");
    expect(space.defaultPrevented).toBe(true);
    expect(backdrop().classList.contains("is-visible")).toBe(true);
  });

  it("closes on Escape, restoring focus to the trigger and firing imageBox:close", () => {
    const wrapper = mountHost(
      `<div id="t" data-image-box data-image-box-src="a.png"></div>`,
    );
    const trigger = wrapper.get("#t").element as HTMLElement;

    const closes: Event[] = [];
    document.addEventListener("imageBox:close", (e) => closes.push(e));

    click(trigger);
    expect(document.activeElement).toBe(backdrop());

    keydown(document, "Escape");

    expect(backdrop().classList.contains("is-visible")).toBe(false);
    expect(document.body.classList.contains("body-image-box-open")).toBe(false);
    expect(document.body.style.getPropertyValue("--vd-scrollbar-width")).toBe(
      "",
    );
    expect(closes).toHaveLength(1);
    expect(document.activeElement).toBe(trigger);

    document.removeEventListener("imageBox:close", () => {});
  });

  it("closes on backdrop click, image click, and close-button click", () => {
    const wrapper = mountHost(
      `<div id="t" data-image-box data-image-box-src="a.png"></div>`,
    );
    const trigger = wrapper.get("#t").element;

    // backdrop click (target === backdrop)
    click(trigger);
    expect(backdrop().classList.contains("is-visible")).toBe(true);
    click(backdrop());
    expect(backdrop().classList.contains("is-visible")).toBe(false);

    // image click
    click(trigger);
    click(boxImg());
    expect(backdrop().classList.contains("is-visible")).toBe(false);

    // close-button click
    click(trigger);
    click(document.querySelector(".vd-image-box-close")!);
    expect(backdrop().classList.contains("is-visible")).toBe(false);
  });

  it("dismisses only when scrolled past the threshold from the opening position", () => {
    const wrapper = mountHost(
      `<div id="t" data-image-box data-image-box-src="a.png"></div>`,
    );
    setScrollY(0);
    click(wrapper.get("#t").element);
    expect(backdrop().classList.contains("is-visible")).toBe(true);

    // within 50px -> stays open
    setScrollY(30);
    window.dispatchEvent(new Event("scroll"));
    expect(backdrop().classList.contains("is-visible")).toBe(true);

    // past 50px -> dismisses
    setScrollY(60);
    window.dispatchEvent(new Event("scroll"));
    expect(backdrop().classList.contains("is-visible")).toBe(false);
  });

  it("honours a custom scrollThreshold (vd3 extension)", () => {
    const wrapper = mountHost(
      `<div id="t" data-image-box data-image-box-src="a.png"></div>`,
      (root) => useImageBox(root, { scrollThreshold: 200 }),
    );
    setScrollY(0);
    click(wrapper.get("#t").element);

    // 100px would dismiss at the default 50 but not at 200
    setScrollY(100);
    window.dispatchEvent(new Event("scroll"));
    expect(backdrop().classList.contains("is-visible")).toBe(true);

    setScrollY(250);
    window.dispatchEvent(new Event("scroll"));
    expect(backdrop().classList.contains("is-visible")).toBe(false);
  });

  it("marks an <img> trigger .is-broken on error and unmarks it on load", () => {
    const wrapper = mountHost(
      `<img id="t" data-image-box data-image-box-src="a.png" alt="a" />`,
    );
    const trigger = wrapper.get("#t").element;

    trigger.dispatchEvent(new Event("error"));
    expect(trigger.classList.contains("is-broken")).toBe(true);

    trigger.dispatchEvent(new Event("load"));
    expect(trigger.classList.contains("is-broken")).toBe(false);
  });

  it("does not open (warns) when no source can be resolved", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const wrapper = mountHost(`<div id="t" data-image-box></div>`);

    click(wrapper.get("#t").element);

    expect(warn).toHaveBeenCalled();
    expect(backdrop().classList.contains("is-visible")).toBe(false);
    expect(document.body.classList.contains("body-image-box-open")).toBe(false);
    warn.mockRestore();
  });

  it("clears the image source after the close transition", () => {
    vi.useFakeTimers();
    const wrapper = mountHost(
      `<div id="t" data-image-box data-image-box-src="a.png"></div>`,
    );
    click(wrapper.get("#t").element);
    expect(boxImg().getAttribute("src")).toBe("a.png");

    keydown(document, "Escape");
    // still set immediately after close (during the fade-out transition)
    expect(boxImg().getAttribute("src")).toBe("a.png");

    vi.advanceTimersByTime(300);
    expect(boxImg().getAttribute("src")).toBe("");
  });

  it("removes trigger wiring on unmount but keeps the shared backdrop until the last consumer unmounts", () => {
    const a = mountHost(
      `<div id="a" data-image-box data-image-box-src="a.png"></div>`,
    );
    const b = mountHost(
      `<div id="b" data-image-box data-image-box-src="b.png"></div>`,
    );

    // refcounted: two consumers, still exactly one backdrop
    expect(document.querySelectorAll(".vd-image-box-backdrop")).toHaveLength(1);

    const triggerA = a.get("#a").element;
    a.unmount();

    // trigger wiring gone, but backdrop survives (b still mounted)
    expect(triggerA.classList.contains("vd-image-box-trigger")).toBe(false);
    expect(
      (triggerA as HTMLElement).dataset.imageBoxInitialized,
    ).toBeUndefined();
    expect(document.querySelectorAll(".vd-image-box-backdrop")).toHaveLength(1);

    b.unmount();

    // last consumer gone -> backdrop removed
    expect(document.querySelectorAll(".vd-image-box-backdrop")).toHaveLength(0);
  });
});
