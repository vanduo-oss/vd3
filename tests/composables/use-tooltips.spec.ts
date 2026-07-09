import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNode } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useTooltips } from "../../src/composables/useTooltips";

/**
 * useTooltips scans a root element for [data-tooltip]/[data-tooltip-html]
 * triggers and, on hover/focus, appends a `.vd-tooltip` to document.body. It
 * needs a component scope (onMounted/onUnmounted), so we mount a host built from
 * render functions (no runtime template compiler needed).
 */

type Attrs = Record<string, string>;

/** Mount a host whose root holds one button per attribute record. */
function mountTooltips(triggers: Attrs[]): VueWrapper {
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      useTooltips(root);
      return () =>
        h(
          "div",
          { ref: root },
          triggers.map((attrs, i): VNode =>
            h("button", { ...attrs, key: i }, `T${i}`),
          ),
        );
    },
  });
  return mount(Host, { attachTo: document.body });
}

function tips(): NodeListOf<HTMLElement> {
  return document.body.querySelectorAll<HTMLElement>(".vd-tooltip");
}

beforeEach(() => {
  // rAF drives the .is-visible transition; run it synchronously & deterministically.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  // Safety net: drop any stray tooltip a test forgot to unmount away.
  tips().forEach((t) => t.remove());
});

describe("useTooltips show on hover/focus", () => {
  it("appends a .vd-tooltip to body on mouseenter with plain text content", async () => {
    const wrapper = mountTooltips([{ "data-tooltip": "Hello" }]);
    await wrapper.find("button").trigger("mouseenter");

    const tip = document.body.querySelector<HTMLElement>(".vd-tooltip");
    expect(tip).not.toBeNull();
    expect(tip?.textContent).toBe("Hello");
    expect(tip?.style.position).toBe("fixed");
    expect(tip?.style.top).toMatch(/px$/);
    expect(tip?.style.left).toMatch(/px$/);
    wrapper.unmount();
  });

  it("adds is-visible via requestAnimationFrame", async () => {
    const wrapper = mountTooltips([{ "data-tooltip": "Hi" }]);
    await wrapper.find("button").trigger("mouseenter");
    expect(tips()[0].classList.contains("is-visible")).toBe(true);
    wrapper.unmount();
  });

  it("shows on focus and hides on blur", async () => {
    const wrapper = mountTooltips([{ "data-tooltip": "Focusable" }]);
    const btn = wrapper.find("button");

    await btn.trigger("focus");
    expect(tips()).toHaveLength(1);

    await btn.trigger("blur");
    expect(tips()).toHaveLength(0);
    wrapper.unmount();
  });

  it("hides on mouseleave", async () => {
    const wrapper = mountTooltips([{ "data-tooltip": "Bye" }]);
    const btn = wrapper.find("button");
    await btn.trigger("mouseenter");
    expect(tips()).toHaveLength(1);
    await btn.trigger("mouseleave");
    expect(tips()).toHaveLength(0);
    wrapper.unmount();
  });

  it("ignores a trigger whose data-tooltip is empty", async () => {
    const wrapper = mountTooltips([{ "data-tooltip": "" }]);
    await wrapper.find("button").trigger("mouseenter");
    expect(tips()).toHaveLength(0);
    wrapper.unmount();
  });
});

describe("useTooltips classes and placement", () => {
  it("defaults to top placement with data-placement mirror", async () => {
    const wrapper = mountTooltips([{ "data-tooltip": "Top" }]);
    await wrapper.find("button").trigger("mouseenter");
    const tip = tips()[0];
    expect(tip.classList.contains("vd-tooltip")).toBe(true);
    expect(tip.classList.contains("vd-tooltip-top")).toBe(true);
    expect(tip.getAttribute("data-placement")).toBe("top");
    wrapper.unmount();
  });

  it("honours placement, variant, and size attributes", async () => {
    const wrapper = mountTooltips([
      {
        "data-tooltip": "Rich",
        "data-tooltip-placement": "right",
        "data-tooltip-variant": "dark",
        "data-tooltip-size": "lg",
      },
    ]);
    await wrapper.find("button").trigger("mouseenter");
    const tip = tips()[0];
    expect(tip.classList.contains("vd-tooltip-right")).toBe(true);
    expect(tip.classList.contains("vd-tooltip-dark")).toBe(true);
    expect(tip.classList.contains("vd-tooltip-lg")).toBe(true);
    expect(tip.getAttribute("data-placement")).toBe("right");
    wrapper.unmount();
  });
});

describe("useTooltips html sanitization", () => {
  it("sanitizes data-tooltip-html, keeping safe tags and dropping scripts", async () => {
    const wrapper = mountTooltips([
      { "data-tooltip-html": "<b>hi</b><script>alert(1)</script>" },
    ]);
    await wrapper.find("button").trigger("mouseenter");
    const tip = tips()[0];
    expect(tip.classList.contains("vd-tooltip-html")).toBe(true);
    expect(tip.querySelector("b")).not.toBeNull();
    expect(tip.querySelector("script")).toBeNull();
    expect(tip.innerHTML).toContain("<b>hi</b>");
    wrapper.unmount();
  });

  it("treats data-tooltip as plain text (no HTML parsing)", async () => {
    const wrapper = mountTooltips([{ "data-tooltip": "<b>x</b>" }]);
    await wrapper.find("button").trigger("mouseenter");
    const tip = tips()[0];
    expect(tip.querySelector("b")).toBeNull();
    expect(tip.textContent).toBe("<b>x</b>");
    wrapper.unmount();
  });
});

describe("useTooltips single-tooltip invariant", () => {
  it("replaces the visible tooltip when another trigger fires", async () => {
    const wrapper = mountTooltips([
      { "data-tooltip": "First" },
      { "data-tooltip": "Second" },
    ]);
    const buttons = wrapper.findAll("button");
    await buttons[0].trigger("mouseenter");
    expect(tips()).toHaveLength(1);

    await buttons[1].trigger("mouseenter");
    // hide() runs at the top of show(), so still exactly one tooltip.
    expect(tips()).toHaveLength(1);
    expect(tips()[0].textContent).toBe("Second");
    wrapper.unmount();
  });
});

describe("useTooltips cleanup on unmount", () => {
  it("removes a visible tooltip when the component unmounts", async () => {
    const wrapper = mountTooltips([{ "data-tooltip": "Alive" }]);
    await wrapper.find("button").trigger("mouseenter");
    expect(tips()).toHaveLength(1);

    wrapper.unmount();
    expect(tips()).toHaveLength(0);
  });

  it("removes listeners so a post-unmount event shows nothing", async () => {
    const wrapper = mountTooltips([{ "data-tooltip": "Gone" }]);
    const btn = wrapper.find("button").element;
    wrapper.unmount();

    btn.dispatchEvent(new MouseEvent("mouseenter"));
    expect(tips()).toHaveLength(0);
  });
});
