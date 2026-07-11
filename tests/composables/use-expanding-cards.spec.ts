import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNode } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useExpandingCards } from "../../src/composables/useExpandingCards";

/**
 * useExpandingCards wires `.vd-expanding-cards` containers under a root:
 * click / Enter / Space activation (single `is-active` card, focused),
 * Arrow / Home / End roving among visible cards, `role="button"` +
 * `tabindex` + `aria-pressed` kept in sync via a MutationObserver, and a
 * `data-vd-expanding-cards="manual"` opt-out.
 *
 * jsdom has no layout, so the source's visibility filter
 * (`offsetParent !== null || getClientRects().length > 0`) would see every
 * card as hidden. We stub `getClientRects` to report one rect unless the
 * element is marked `data-test-hidden`, which also lets us test the filter.
 */

interface MountOptions {
  containerAttrs?: Record<string, string>;
  containerStyle?: Record<string, string>;
  cardCount?: number;
  activeIndex?: number;
  cardAttrs?: Array<Record<string, string> | undefined>;
  rootIsContainer?: boolean;
}

function mountCards(options: MountOptions = {}): VueWrapper {
  const {
    containerAttrs = {},
    containerStyle = {},
    cardCount = 3,
    activeIndex = -1,
    cardAttrs = [],
    rootIsContainer = false,
  } = options;

  const cardNodes = (): VNode[] =>
    Array.from({ length: cardCount }, (_, i) =>
      h(
        "div",
        {
          class:
            i === activeIndex
              ? "vd-expanding-card is-active"
              : "vd-expanding-card",
          key: i,
          ...(cardAttrs[i] ?? {}),
        },
        [h("span", { class: "vd-expanding-card-label" }, `Card ${i}`)],
      ),
    );

  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      useExpandingCards(root);
      return () =>
        rootIsContainer
          ? h(
              "div",
              {
                ref: root,
                class: "vd-expanding-cards",
                style: containerStyle,
                ...containerAttrs,
              },
              cardNodes(),
            )
          : h("div", { ref: root }, [
              h(
                "div",
                {
                  class: "vd-expanding-cards",
                  style: containerStyle,
                  ...containerAttrs,
                },
                cardNodes(),
              ),
            ]);
    },
  });
  return mount(Host, { attachTo: document.body });
}

function cardEls(wrapper: VueWrapper): HTMLElement[] {
  return wrapper
    .findAll(".vd-expanding-card")
    .map((w) => w.element as HTMLElement);
}

function activeFlags(wrapper: VueWrapper): boolean[] {
  return cardEls(wrapper).map((c) => c.classList.contains("is-active"));
}

function pressedFlags(wrapper: VueWrapper): Array<string | null> {
  return cardEls(wrapper).map((c) => c.getAttribute("aria-pressed"));
}

/** Let queued MutationObserver callbacks run (macrotask drains microtasks). */
function flushObservers(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (
    this: Element,
  ) {
    return (this.hasAttribute("data-test-hidden")
      ? []
      : [{}]) as unknown as DOMRectList;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("useExpandingCards init", () => {
  it("gives every card tabindex, role=button, and aria-pressed on mount", () => {
    const wrapper = mountCards({ activeIndex: 1 });
    const cards = cardEls(wrapper);
    expect(cards).toHaveLength(3);
    cards.forEach((card) => {
      expect(card.getAttribute("tabindex")).toBe("0");
      expect(card.getAttribute("role")).toBe("button");
    });
    expect(pressedFlags(wrapper)).toEqual(["false", "true", "false"]);
    wrapper.unmount();
  });

  it("keeps an authored tabindex", () => {
    const wrapper = mountCards({ cardAttrs: [{ tabindex: "-1" }] });
    expect(cardEls(wrapper)[0].getAttribute("tabindex")).toBe("-1");
    expect(cardEls(wrapper)[1].getAttribute("tabindex")).toBe("0");
    wrapper.unmount();
  });

  it("wires the root itself when it is the .vd-expanding-cards container", async () => {
    const wrapper = mountCards({ rootIsContainer: true });
    await wrapper.findAll(".vd-expanding-card")[2].trigger("click");
    expect(activeFlags(wrapper)).toEqual([false, false, true]);
    wrapper.unmount();
  });
});

describe("useExpandingCards click activation", () => {
  it("clicking a card makes it the single is-active card and focuses it", async () => {
    const wrapper = mountCards({ activeIndex: 0 });
    await wrapper.findAll(".vd-expanding-card")[2].trigger("click");
    expect(activeFlags(wrapper)).toEqual([false, false, true]);
    expect(document.activeElement).toBe(cardEls(wrapper)[2]);
    await flushObservers();
    expect(pressedFlags(wrapper)).toEqual(["false", "false", "true"]);
    wrapper.unmount();
  });

  it("clicking inside a card (a label) activates the enclosing card", async () => {
    const wrapper = mountCards({ activeIndex: 0 });
    await wrapper.findAll(".vd-expanding-card-label")[1].trigger("click");
    expect(activeFlags(wrapper)).toEqual([false, true, false]);
    wrapper.unmount();
  });

  it("clicking the container outside any card changes nothing", async () => {
    const wrapper = mountCards({ activeIndex: 1 });
    await wrapper.find(".vd-expanding-cards").trigger("click");
    expect(activeFlags(wrapper)).toEqual([false, true, false]);
    wrapper.unmount();
  });
});

describe("useExpandingCards keyboard traversal", () => {
  it("ArrowRight then End move activation with focus following", async () => {
    const wrapper = mountCards({ cardCount: 4, activeIndex: 1 });
    const cards = wrapper.findAll(".vd-expanding-card");
    cardEls(wrapper)[1].focus();

    await cards[1].trigger("keydown", { key: "ArrowRight" });
    expect(activeFlags(wrapper)).toEqual([false, false, true, false]);
    expect(document.activeElement).toBe(cardEls(wrapper)[2]);

    await cards[2].trigger("keydown", { key: "End" });
    expect(activeFlags(wrapper)).toEqual([false, false, false, true]);
    expect(document.activeElement).toBe(cardEls(wrapper)[3]);
    wrapper.unmount();
  });

  it("ArrowLeft moves back and clamps at the first card; Home jumps to it", async () => {
    const wrapper = mountCards({ activeIndex: 1 });
    const container = wrapper.find(".vd-expanding-cards");

    await container.trigger("keydown", { key: "ArrowLeft" });
    expect(activeFlags(wrapper)).toEqual([true, false, false]);

    await container.trigger("keydown", { key: "ArrowLeft" });
    expect(activeFlags(wrapper)).toEqual([true, false, false]);

    await container.trigger("keydown", { key: "End" });
    await container.trigger("keydown", { key: "Home" });
    expect(activeFlags(wrapper)).toEqual([true, false, false]);
    wrapper.unmount();
  });

  it("starts from the is-active card when focus is not on a card", async () => {
    const wrapper = mountCards({ cardCount: 4, activeIndex: 2 });
    (document.activeElement as HTMLElement | null)?.blur?.();
    await wrapper
      .find(".vd-expanding-cards")
      .trigger("keydown", { key: "ArrowRight" });
    expect(activeFlags(wrapper)).toEqual([false, false, false, true]);
    wrapper.unmount();
  });

  it("ignores ArrowUp/ArrowDown in a row-direction container", async () => {
    const wrapper = mountCards({ activeIndex: 1 });
    const container = wrapper.find(".vd-expanding-cards");
    await container.trigger("keydown", { key: "ArrowDown" });
    await container.trigger("keydown", { key: "ArrowUp" });
    expect(activeFlags(wrapper)).toEqual([false, true, false]);
    wrapper.unmount();
  });

  it("honours ArrowUp/ArrowDown when the container is column-direction", async () => {
    const wrapper = mountCards({
      activeIndex: 1,
      containerStyle: { flexDirection: "column" },
    });
    const container = wrapper.find(".vd-expanding-cards");
    await container.trigger("keydown", { key: "ArrowDown" });
    expect(activeFlags(wrapper)).toEqual([false, false, true]);
    await container.trigger("keydown", { key: "ArrowUp" });
    expect(activeFlags(wrapper)).toEqual([false, true, false]);
    wrapper.unmount();
  });

  it("skips hidden cards when traversing", async () => {
    const wrapper = mountCards({
      cardCount: 3,
      activeIndex: 0,
      cardAttrs: [undefined, { "data-test-hidden": "" }, undefined],
    });
    await wrapper
      .find(".vd-expanding-cards")
      .trigger("keydown", { key: "ArrowRight" });
    expect(activeFlags(wrapper)).toEqual([false, false, true]);
    wrapper.unmount();
  });

  it("ignores unrelated keys", async () => {
    const wrapper = mountCards({ activeIndex: 0 });
    await wrapper
      .find(".vd-expanding-cards")
      .trigger("keydown", { key: "Tab" });
    expect(activeFlags(wrapper)).toEqual([true, false, false]);
    wrapper.unmount();
  });
});

describe("useExpandingCards Enter/Space activation (vd3 extension)", () => {
  it("Enter on a focused card activates it", async () => {
    const wrapper = mountCards({ activeIndex: 0 });
    const second = wrapper.findAll(".vd-expanding-card")[1];
    (second.element as HTMLElement).focus();
    await second.trigger("keydown", { key: "Enter" });
    expect(activeFlags(wrapper)).toEqual([false, true, false]);
    wrapper.unmount();
  });

  it("Space on a focused card activates it", async () => {
    const wrapper = mountCards({ activeIndex: 0 });
    const third = wrapper.findAll(".vd-expanding-card")[2];
    (third.element as HTMLElement).focus();
    await third.trigger("keydown", { key: " " });
    expect(activeFlags(wrapper)).toEqual([false, false, true]);
    wrapper.unmount();
  });

  it("Enter on a card's inner element does not hijack activation", async () => {
    const wrapper = mountCards({ activeIndex: 0 });
    await wrapper
      .findAll(".vd-expanding-card-label")[1]
      .trigger("keydown", { key: "Enter" });
    expect(activeFlags(wrapper)).toEqual([true, false, false]);
    wrapper.unmount();
  });
});

describe("useExpandingCards aria-pressed sync", () => {
  it("mirrors an external is-active class change via the MutationObserver", async () => {
    const wrapper = mountCards({ activeIndex: 0 });
    const cards = cardEls(wrapper);
    cards[0].classList.remove("is-active");
    cards[2].classList.add("is-active");
    await flushObservers();
    expect(pressedFlags(wrapper)).toEqual(["false", "false", "true"]);
    wrapper.unmount();
  });

  it("respects an authored aria-pressed at init, then keeps it in sync", async () => {
    const wrapper = mountCards({
      activeIndex: 0,
      cardAttrs: [undefined, { "aria-pressed": "true" }],
    });
    // syncAria runs once at init, so the authored mismatch is corrected.
    expect(pressedFlags(wrapper)).toEqual(["true", "false", "false"]);
    wrapper.unmount();
  });
});

describe("useExpandingCards manual opt-out", () => {
  it("skips containers marked data-vd-expanding-cards=manual", async () => {
    const wrapper = mountCards({
      containerAttrs: { "data-vd-expanding-cards": "manual" },
    });
    const cards = cardEls(wrapper);
    cards.forEach((card) => {
      expect(card.hasAttribute("tabindex")).toBe(false);
      expect(card.hasAttribute("role")).toBe(false);
      expect(card.hasAttribute("aria-pressed")).toBe(false);
    });
    await wrapper.findAll(".vd-expanding-card")[1].trigger("click");
    expect(activeFlags(wrapper)).toEqual([false, false, false]);
    wrapper.unmount();
  });
});

describe("useExpandingCards teardown", () => {
  it("removes listeners so a post-unmount click changes nothing", async () => {
    const wrapper = mountCards({ activeIndex: 0 });
    const second = cardEls(wrapper)[1];
    wrapper.unmount();
    second.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(second.classList.contains("is-active")).toBe(false);
  });

  it("disconnects the MutationObserver on unmount", async () => {
    const wrapper = mountCards({ activeIndex: 0 });
    const cards = cardEls(wrapper);
    wrapper.unmount();
    cards[1].classList.add("is-active");
    await flushObservers();
    expect(cards[1].getAttribute("aria-pressed")).toBe("false");
  });

  it("does not affect a sibling instance's wiring", async () => {
    const a = mountCards({ activeIndex: 0 });
    const b = mountCards({ activeIndex: 0 });
    a.unmount();
    await b.findAll(".vd-expanding-card")[2].trigger("click");
    expect(activeFlags(b)).toEqual([false, false, true]);
    b.unmount();
  });
});
