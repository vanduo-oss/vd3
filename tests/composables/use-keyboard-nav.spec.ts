import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import {
  useKeyboardNav,
  type UseKeyboardNavOptions,
} from "../../src/composables/useKeyboardNav";

// useKeyboardNav now attaches its keydown listener in onMounted (so the
// template ref is populated) and removes it on unmount, so it MUST be
// exercised through a real mounted component with a bound ref rather than a
// hand-fed resolved element.
const mounted: VueWrapper[] = [];

type Api = ReturnType<typeof useKeyboardNav>;

const mountNav = (
  n: number,
  opts: Partial<UseKeyboardNavOptions> = {},
): { wrapper: VueWrapper; api: Api } => {
  let api!: Api;
  const Host = defineComponent({
    setup() {
      const container = ref<HTMLElement | null>(null);
      api = useKeyboardNav(container, { itemSelector: ".item", ...opts });
      return () =>
        h(
          "div",
          { ref: container },
          Array.from({ length: n }, (_, i) =>
            h("button", { key: i, class: "item" }, String(i)),
          ),
        );
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
};

const itemsOf = (wrapper: VueWrapper): HTMLButtonElement[] =>
  Array.from(
    (wrapper.element as HTMLElement).querySelectorAll<HTMLButtonElement>(
      ".item",
    ),
  );

const press = (
  el: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): boolean =>
  el.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      cancelable: true,
      bubbles: true,
      ...init,
    }),
  );

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted */
    }
  }
  mounted.length = 0;
  vi.restoreAllMocks();
});

describe("useKeyboardNav", () => {
  it("starts with activeIndex 0", () => {
    const { api } = mountNav(3);
    expect(api.activeIndex.value).toBe(0);
  });

  it("attaches only after mount, then moves forward and focuses on ArrowDown/ArrowRight", () => {
    const { wrapper, api } = mountNav(3);
    const el = wrapper.element as HTMLElement;

    expect(press(el, "ArrowDown")).toBe(false); // preventDefault called
    expect(api.activeIndex.value).toBe(1);
    expect(document.activeElement).toBe(itemsOf(wrapper)[1]);

    expect(press(el, "ArrowRight")).toBe(false);
    expect(api.activeIndex.value).toBe(2);
    expect(document.activeElement).toBe(itemsOf(wrapper)[2]);
  });

  it("moves backward on ArrowUp/ArrowLeft and clamps at the ends", () => {
    const { wrapper, api } = mountNav(3);
    const el = wrapper.element as HTMLElement;

    press(el, "End");
    expect(api.activeIndex.value).toBe(2);

    press(el, "ArrowUp");
    expect(api.activeIndex.value).toBe(1);
    expect(document.activeElement).toBe(itemsOf(wrapper)[1]);

    press(el, "ArrowLeft");
    expect(api.activeIndex.value).toBe(0);

    expect(press(el, "ArrowUp")).toBe(false);
    expect(api.activeIndex.value).toBe(0);
  });

  it("clamps forward navigation at the last item", () => {
    const { wrapper, api } = mountNav(2);
    const el = wrapper.element as HTMLElement;
    press(el, "ArrowDown");
    press(el, "ArrowDown");
    press(el, "ArrowDown");
    expect(api.activeIndex.value).toBe(1);
    expect(document.activeElement).toBe(itemsOf(wrapper)[1]);
  });

  it("jumps to first on Home and last on End", () => {
    const { wrapper, api } = mountNav(4);
    const el = wrapper.element as HTMLElement;

    expect(press(el, "End")).toBe(false);
    expect(api.activeIndex.value).toBe(3);
    expect(document.activeElement).toBe(itemsOf(wrapper)[3]);

    expect(press(el, "Home")).toBe(false);
    expect(api.activeIndex.value).toBe(0);
    expect(document.activeElement).toBe(itemsOf(wrapper)[0]);
  });

  it("invokes onSelect with the active index on Enter without preventing default", () => {
    const onSelect = vi.fn();
    const { wrapper, api } = mountNav(3, { onSelect });
    const el = wrapper.element as HTMLElement;
    press(el, "ArrowDown");
    expect(api.activeIndex.value).toBe(1);

    expect(press(el, "Enter")).toBe(true);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(api.activeIndex.value).toBe(1);
  });

  it("invokes onEscape on Escape without preventing default", () => {
    const onEscape = vi.fn();
    const { wrapper } = mountNav(3, { onEscape });
    expect(press(wrapper.element as HTMLElement, "Escape")).toBe(true);
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("ignores unhandled keys (no move, no preventDefault)", () => {
    const { wrapper, api } = mountNav(3);
    expect(press(wrapper.element as HTMLElement, "a")).toBe(true);
    expect(api.activeIndex.value).toBe(0);
  });

  it("is a no-op when the container has no matching items", () => {
    const { wrapper, api } = mountNav(0);
    expect(press(wrapper.element as HTMLElement, "ArrowDown")).toBe(true);
    expect(api.activeIndex.value).toBe(0);
  });

  it("setItems clamps the active index down when the count shrinks below it", () => {
    const { wrapper, api } = mountNav(3);
    press(wrapper.element as HTMLElement, "End"); // activeIndex -> 2
    expect(api.activeIndex.value).toBe(2);

    api.setItems(2); // 2 >= 2 -> clamp to max(0, 1)
    expect(api.activeIndex.value).toBe(1);

    api.setItems(5); // 1 >= 5 is false -> unchanged
    expect(api.activeIndex.value).toBe(1);

    api.setItems(0); // 1 >= 0 -> clamp to max(0, -1) = 0
    expect(api.activeIndex.value).toBe(0);
  });

  it("removes the keydown listener from the container on unmount", () => {
    const { wrapper, api } = mountNav(3);
    const el = wrapper.element as HTMLElement;
    const removeSpy = vi.spyOn(el, "removeEventListener");

    press(el, "ArrowDown");
    expect(api.activeIndex.value).toBe(1);

    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

    // After teardown the (now-detached) element no longer drives the composable.
    press(el, "ArrowDown");
    expect(api.activeIndex.value).toBe(1);
  });
});
