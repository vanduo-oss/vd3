import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import {
  usePopover,
  type UsePopoverController,
} from "../../src/composables/usePopover";

/**
 * usePopover merges the framework's two overlay primitives behind one API:
 *  - attribute-built "bubbles" ([data-vd-bubble]/[data-vd-popover]) whose
 *    .vd-bubble-content panel is created and appended to document.body, and
 *  - target-panel popovers (.vd-popover-trigger + data-vd-popover-target)
 *    that adopt a pre-authored panel already in the DOM.
 * Each composable runs in a component scope, so we mount a host whose root ref
 * is handed to it and whose fixture markup is injected as innerHTML — the
 * onMounted scan then sees real DOM. requestAnimationFrame is stubbed to run
 * synchronously (it drives positioning + panel ARIA/events).
 */

const mounted: VueWrapper[] = [];

function mountHost(html: string): {
  wrapper: VueWrapper;
  api: UsePopoverController;
} {
  let api!: UsePopoverController;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = usePopover(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
}

const click = (el: Element): MouseEvent => {
  const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
};

const escape = (): void =>
  void document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

const bubbleEl = (): HTMLElement | null =>
  document.body.querySelector<HTMLElement>(".vd-bubble-content");

const rect = (p: Partial<DOMRect>): DOMRect =>
  ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
    ...p,
  }) as DOMRect;

beforeEach(() => {
  // rAF drives bubble positioning and panel ARIA/data-placement/events; run it
  // synchronously so a click's effects are observable on the next line.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted by the test under test */
    }
  }
  mounted.length = 0;
  // Safety net: sweep any body-appended bubble a failed test left behind.
  document.body
    .querySelectorAll(".vd-bubble-content")
    .forEach((n) => n.remove());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("usePopover — attribute-built bubble", () => {
  const html = `<button id="bt" data-vd-bubble="Hello" data-vd-bubble-title="Info">Trigger</button>`;

  it("sets trigger ARIA on mount without opening", () => {
    const { wrapper } = mountHost(html);
    const trigger = wrapper.get("#bt").element;
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toMatch(/^vd-bubble-/);
    // No visible bubble before the first click.
    expect(bubbleEl()?.classList.contains("is-visible")).toBeFalsy();
  });

  it("builds and opens a role=dialog bubble with header, close button, and body text", () => {
    const { wrapper } = mountHost(html);
    const trigger = wrapper.get("#bt").element;
    const shows: Event[] = [];
    trigger.addEventListener("bubble:show", (e) => shows.push(e));

    click(trigger);

    const bubble = bubbleEl()!;
    expect(bubble).not.toBeNull();
    expect(bubble.getAttribute("role")).toBe("dialog");
    expect(bubble.getAttribute("aria-modal")).toBe("false");
    expect(bubble.getAttribute("data-placement")).toBe("bottom");
    expect(bubble.querySelector(".vd-bubble-header")).not.toBeNull();
    expect(bubble.querySelector(".vd-bubble-close")).not.toBeNull();
    expect(bubble.querySelector(".vd-bubble-body")?.textContent).toBe("Hello");
    expect(bubble.classList.contains("is-visible")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(shows).toHaveLength(1);
  });

  it("toggles closed on a second click and fires bubble:hide", () => {
    const { wrapper } = mountHost(html);
    const trigger = wrapper.get("#bt").element;
    const hides: Event[] = [];
    trigger.addEventListener("bubble:hide", (e) => hides.push(e));

    click(trigger); // open
    click(trigger); // close

    expect(bubbleEl()!.classList.contains("is-visible")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(hides).toHaveLength(1);
  });

  it("closes via the header close button", () => {
    const { wrapper } = mountHost(html);
    const trigger = wrapper.get("#bt").element;
    click(trigger);
    const closeBtn =
      bubbleEl()!.querySelector<HTMLElement>(".vd-bubble-close")!;

    click(closeBtn);

    expect(bubbleEl()!.classList.contains("is-visible")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders data-vd-bubble-html through the sanitizer (keeps <b>, drops <script>)", () => {
    const { wrapper } = mountHost(
      `<button id="bh" data-vd-bubble data-vd-bubble-html="<b>hi</b><script>alert(1)</script>">T</button>`,
    );
    click(wrapper.get("#bh").element);
    const body = bubbleEl()!.querySelector<HTMLElement>(".vd-bubble-body")!;
    expect(body.querySelector("b")).not.toBeNull();
    expect(body.querySelector("script")).toBeNull();
    expect(body.innerHTML).toContain("<b>hi</b>");
  });

  it("treats data-vd-bubble as plain text (no HTML parsing)", () => {
    const { wrapper } = mountHost(
      `<button id="bx" data-vd-bubble="<b>x</b>">T</button>`,
    );
    click(wrapper.get("#bx").element);
    const body = bubbleEl()!.querySelector<HTMLElement>(".vd-bubble-body")!;
    expect(body.querySelector("b")).toBeNull();
    expect(body.textContent).toBe("<b>x</b>");
  });

  it("honours the placement attribute on the panel's data-placement", () => {
    const { wrapper } = mountHost(
      `<button id="bp" data-vd-bubble="Yo" data-vd-bubble-placement="right">T</button>`,
    );
    click(wrapper.get("#bp").element);
    expect(bubbleEl()!.getAttribute("data-placement")).toBe("right");
  });

  it("opening one bubble closes any already-open sibling bubble", () => {
    const { wrapper } = mountHost(
      `<button id="b1" data-vd-bubble="One">1</button>
       <button id="b2" data-vd-bubble="Two">2</button>`,
    );
    click(wrapper.get("#b1").element);
    const panels =
      document.body.querySelectorAll<HTMLElement>(".vd-bubble-content");
    expect(panels).toHaveLength(2);

    click(wrapper.get("#b2").element);

    // #b1's panel (aria-controls target) is hidden; #b2's is visible.
    const b1Panel = document.getElementById(
      wrapper.get("#b1").element.getAttribute("aria-controls")!,
    )!;
    const b2Panel = document.getElementById(
      wrapper.get("#b2").element.getAttribute("aria-controls")!,
    )!;
    expect(b1Panel.classList.contains("is-visible")).toBe(false);
    expect(b2Panel.classList.contains("is-visible")).toBe(true);
  });
});

describe("usePopover — target-panel popover", () => {
  const html = `
    <button id="pt" class="vd-popover-trigger" data-vd-popover-target="#panel" data-vd-popover-trigger="click">Toggle</button>
    <div id="panel" hidden>Panel body</div>`;

  it("adopts the pre-authored panel: class, role, aria-modal, and trigger ARIA", () => {
    const { wrapper } = mountHost(html);
    const trigger = wrapper.get("#pt").element;
    const panel = wrapper.get("#panel").element as HTMLElement;

    expect(panel.classList.contains("vd-popover-panel")).toBe(true);
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("false");
    expect(panel.hidden).toBe(true);
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe("panel");
  });

  it("generates a panel id when the target has none", () => {
    const { wrapper } = mountHost(
      `<button class="vd-popover-trigger" data-vd-popover-target="[data-panel]">T</button>
       <div data-panel hidden>x</div>`,
    );
    const panel = wrapper.get("[data-panel]").element;
    expect(panel.id).toMatch(/^vd-popover-/);
  });

  it("click mode: opens the panel, sets data-placement + aria-expanded, fires popover:show", () => {
    const { wrapper } = mountHost(html);
    const trigger = wrapper.get("#pt").element;
    const panel = wrapper.get("#panel").element as HTMLElement;
    const shows: Event[] = [];
    trigger.addEventListener("popover:show", (e) => shows.push(e));

    click(trigger);

    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute("data-placement")).toBe("bottom");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(shows).toHaveLength(1);
  });

  it("click mode: second click hides the panel and fires popover:hide", () => {
    const { wrapper } = mountHost(html);
    const trigger = wrapper.get("#pt").element;
    const panel = wrapper.get("#panel").element as HTMLElement;
    const hides: Event[] = [];
    trigger.addEventListener("popover:hide", (e) => hides.push(e));

    click(trigger); // open
    click(trigger); // close

    expect(panel.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(hides).toHaveLength(1);
  });

  it("maps an invalid placement to bottom", () => {
    const { wrapper } = mountHost(
      `<button id="pi" class="vd-popover-trigger" data-vd-popover-target="#pib" data-vd-popover-placement="sideways">T</button>
       <div id="pib" hidden>x</div>`,
    );
    click(wrapper.get("#pi").element);
    expect(wrapper.get("#pib").element.getAttribute("data-placement")).toBe(
      "bottom",
    );
  });

  it("hover mode: opens on mouseenter, hides after the 80ms leave grace", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { wrapper } = mountHost(
      `<button id="ph" class="vd-popover-trigger" data-vd-popover-target="#hp" data-vd-popover-trigger="hover">T</button>
       <div id="hp" hidden>x</div>`,
    );
    const trigger = wrapper.get("#ph").element;
    const panel = wrapper.get("#hp").element as HTMLElement;

    trigger.dispatchEvent(new MouseEvent("mouseenter"));
    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute("data-placement")).toBe("bottom");

    trigger.dispatchEvent(new MouseEvent("mouseleave"));
    expect(panel.hidden).toBe(false); // still open during grace period
    vi.advanceTimersByTime(80);
    expect(panel.hidden).toBe(true);
  });

  it("focus mode: shows on focus, hides on blur to an element outside the panel", () => {
    const { wrapper } = mountHost(
      `<button id="pf" class="vd-popover-trigger" data-vd-popover-target="#fp" data-vd-popover-trigger="focus">T</button>
       <div id="fp" hidden>x</div>`,
    );
    const trigger = wrapper.get("#pf").element;
    const panel = wrapper.get("#fp").element as HTMLElement;

    trigger.dispatchEvent(new FocusEvent("focus"));
    expect(panel.hidden).toBe(false);

    trigger.dispatchEvent(new FocusEvent("blur", { relatedTarget: null }));
    expect(panel.hidden).toBe(true);
  });

  it("flips a bottom panel to top when it overflows the viewport bottom", () => {
    const { wrapper } = mountHost(html);
    const trigger = wrapper.get("#pt").element;
    const panel = wrapper.get("#panel").element as HTMLElement;
    // Trigger sits near the viewport bottom; the panel is tall enough to spill.
    trigger.getBoundingClientRect = () =>
      rect({
        top: 700,
        bottom: 730,
        left: 100,
        right: 140,
        width: 40,
        height: 30,
      });
    panel.getBoundingClientRect = () => rect({ width: 200, height: 300 });

    click(trigger); // opens, data-placement="bottom"
    expect(panel.getAttribute("data-placement")).toBe("bottom");

    window.dispatchEvent(new Event("resize"));
    expect(panel.getAttribute("data-placement")).toBe("top");
  });

  it("does not flip when data-vd-popover-flip='false'", () => {
    const { wrapper } = mountHost(
      `<button id="pnf" class="vd-popover-trigger" data-vd-popover-target="#nf" data-vd-popover-trigger="click" data-vd-popover-flip="false">T</button>
       <div id="nf" hidden>x</div>`,
    );
    const trigger = wrapper.get("#pnf").element;
    const panel = wrapper.get("#nf").element;
    trigger.getBoundingClientRect = () =>
      rect({ top: 700, bottom: 730, width: 40, height: 30 });
    panel.getBoundingClientRect = () => rect({ width: 200, height: 300 });

    click(trigger);
    window.dispatchEvent(new Event("resize"));
    expect(panel.getAttribute("data-placement")).toBe("bottom");
  });

  it("wires the panel primitive (not a bubble) when both target + content attrs coexist", () => {
    const { wrapper } = mountHost(
      `<button id="pc" class="vd-popover-trigger" data-vd-popover-target="#coex" data-vd-popover="ignored">T</button>
       <div id="coex" hidden>real</div>`,
    );
    click(wrapper.get("#pc").element);
    // No body-appended bubble was built; the pre-authored panel opened instead.
    expect(bubbleEl()).toBeNull();
    expect((wrapper.get("#coex").element as HTMLElement).hidden).toBe(false);
  });
});

describe("usePopover — dismissal (escape / outside click)", () => {
  it("Escape closes an open bubble and returns aria-expanded to false", () => {
    const { wrapper } = mountHost(
      `<button id="be" data-vd-bubble="Hi">T</button>`,
    );
    const trigger = wrapper.get("#be").element;
    const hides: Event[] = [];
    trigger.addEventListener("bubble:hide", (e) => hides.push(e));
    click(trigger);
    expect(bubbleEl()!.classList.contains("is-visible")).toBe(true);

    escape();

    expect(bubbleEl()!.classList.contains("is-visible")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(hides).toHaveLength(1);
  });

  it("a capture-phase outside click closes an open bubble", () => {
    const { wrapper } = mountHost(
      `<button id="bo" data-vd-bubble="Hi">T</button><span id="outside">x</span>`,
    );
    click(wrapper.get("#bo").element);
    expect(bubbleEl()!.classList.contains("is-visible")).toBe(true);

    click(wrapper.get("#outside").element);

    expect(bubbleEl()!.classList.contains("is-visible")).toBe(false);
  });

  it("an inside click keeps an open bubble open", () => {
    const { wrapper } = mountHost(
      `<button id="bi" data-vd-bubble="Hi">T</button>`,
    );
    click(wrapper.get("#bi").element);
    const bubble = bubbleEl()!;
    expect(bubble.classList.contains("is-visible")).toBe(true);

    click(bubble.querySelector(".vd-bubble-body")!);
    expect(bubble.classList.contains("is-visible")).toBe(true);
  });

  it("Escape closes an open click-mode panel", () => {
    const { wrapper } = mountHost(
      `<button id="pe" class="vd-popover-trigger" data-vd-popover-target="#pep" data-vd-popover-trigger="click">T</button>
       <div id="pep" hidden>x</div>`,
    );
    const panel = wrapper.get("#pep").element as HTMLElement;
    click(wrapper.get("#pe").element);
    expect(panel.hidden).toBe(false);

    escape();
    expect(panel.hidden).toBe(true);
  });

  it("a pure click-mode panel dismisses on outside click; a hover panel is untouched", () => {
    const { wrapper } = mountHost(
      `<button id="pcm" class="vd-popover-trigger" data-vd-popover-target="#cm" data-vd-popover-trigger="click">C</button>
       <div id="cm" hidden>c</div>
       <button id="phm" class="vd-popover-trigger" data-vd-popover-target="#hm" data-vd-popover-trigger="hover">H</button>
       <div id="hm" hidden>h</div>
       <span id="away">x</span>`,
    );
    click(wrapper.get("#pcm").element); // open click-mode panel
    wrapper.get("#phm").element.dispatchEvent(new MouseEvent("mouseenter")); // open hover panel
    expect((wrapper.get("#cm").element as HTMLElement).hidden).toBe(false);
    expect((wrapper.get("#hm").element as HTMLElement).hidden).toBe(false);

    click(wrapper.get("#away").element);

    expect((wrapper.get("#cm").element as HTMLElement).hidden).toBe(true); // click-mode closed
    expect((wrapper.get("#hm").element as HTMLElement).hidden).toBe(false); // hover-mode untouched
  });
});

describe("usePopover — controller (vd3 extension)", () => {
  it("returns show / hide / hideAll that drive wired triggers", () => {
    const { wrapper, api } = mountHost(
      `<button id="c1" data-vd-bubble="One">1</button>`,
    );
    const trigger = wrapper.get("#c1").element as HTMLElement;

    api.show(trigger);
    expect(bubbleEl()!.classList.contains("is-visible")).toBe(true);

    api.hide(trigger);
    expect(bubbleEl()!.classList.contains("is-visible")).toBe(false);

    api.show(trigger);
    api.hideAll();
    expect(bubbleEl()!.classList.contains("is-visible")).toBe(false);
  });
});

describe("usePopover — cleanup", () => {
  it("removes generated bubble panels and restores trigger ARIA on unmount", () => {
    const { wrapper } = mountHost(
      `<button id="bu" data-vd-bubble="Bye">T</button>`,
    );
    const trigger = wrapper.get("#bu").element;
    click(trigger);
    expect(bubbleEl()).not.toBeNull();

    wrapper.unmount();

    expect(document.body.querySelector(".vd-bubble-content")).toBeNull();
    expect(trigger.getAttribute("aria-haspopup")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBeNull();
    expect(trigger.getAttribute("aria-controls")).toBeNull();
  });

  it("detaches document listeners so a post-unmount Escape does nothing", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { wrapper } = mountHost(
      `<button id="bk" data-vd-bubble="Hi">T</button>`,
    );
    click(wrapper.get("#bk").element);
    wrapper.unmount();

    expect(removeSpy.mock.calls.some((c) => c[0] === "keydown")).toBe(true);
    expect(removeSpy.mock.calls.some((c) => c[0] === "click")).toBe(true);
    // No bubble remains, and dispatching Escape must not throw.
    expect(() => escape()).not.toThrow();
    removeSpy.mockRestore();
  });

  it("per-instance teardown leaves a sibling harness fully working", () => {
    const a = mountHost(`<button id="ha" data-vd-bubble="A">A</button>`);
    const b = mountHost(`<button id="hb" data-vd-bubble="B">B</button>`);
    const bTrigger = b.wrapper.get("#hb").element;

    a.wrapper.unmount(); // tears down only harness A

    // Harness B still toggles its own bubble.
    click(bTrigger);
    const bPanel = document.getElementById(
      bTrigger.getAttribute("aria-controls")!,
    )!;
    expect(bPanel.classList.contains("is-visible")).toBe(true);
    click(bTrigger);
    expect(bPanel.classList.contains("is-visible")).toBe(false);
  });
});
