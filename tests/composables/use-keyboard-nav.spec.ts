import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useKeyboardNav } from "../../src/composables/useKeyboardNav";

// useKeyboardNav attaches its keydown listener synchronously at call time
// (no Vue lifecycle), so it can be exercised without mounting a component:
// build a real container, hand it a ref, and dispatch keyboard events at it.
let container: HTMLElement | null = null;

const build = (n: number): HTMLElement => {
  const el = document.createElement("div");
  for (let i = 0; i < n; i++) {
    const btn = document.createElement("button");
    btn.className = "item";
    btn.textContent = String(i);
    el.appendChild(btn);
  }
  document.body.appendChild(el);
  container = el;
  return el;
};

const items = (): HTMLButtonElement[] =>
  Array.from(container!.querySelectorAll<HTMLButtonElement>(".item"));

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
  if (container) {
    container.remove();
    container = null;
  }
  vi.restoreAllMocks();
});

describe("useKeyboardNav", () => {
  it("starts with activeIndex 0", () => {
    const el = build(3);
    const { activeIndex } = useKeyboardNav(ref(el), { itemSelector: ".item" });
    expect(activeIndex.value).toBe(0);
  });

  it("moves the active index forward and focuses the item on ArrowDown/ArrowRight", () => {
    const el = build(3);
    const { activeIndex } = useKeyboardNav(ref(el), { itemSelector: ".item" });

    expect(press(el, "ArrowDown")).toBe(false); // preventDefault called
    expect(activeIndex.value).toBe(1);
    expect(document.activeElement).toBe(items()[1]);

    expect(press(el, "ArrowRight")).toBe(false);
    expect(activeIndex.value).toBe(2);
    expect(document.activeElement).toBe(items()[2]);
  });

  it("moves backward on ArrowUp/ArrowLeft and clamps at the ends", () => {
    const el = build(3);
    const { activeIndex } = useKeyboardNav(ref(el), { itemSelector: ".item" });

    press(el, "End");
    expect(activeIndex.value).toBe(2);

    press(el, "ArrowUp");
    expect(activeIndex.value).toBe(1);
    expect(document.activeElement).toBe(items()[1]);

    press(el, "ArrowLeft");
    expect(activeIndex.value).toBe(0);

    // Already at the first item: stays clamped at 0.
    expect(press(el, "ArrowUp")).toBe(false);
    expect(activeIndex.value).toBe(0);
  });

  it("clamps forward navigation at the last item", () => {
    const el = build(2);
    const { activeIndex } = useKeyboardNav(ref(el), { itemSelector: ".item" });
    press(el, "ArrowDown");
    press(el, "ArrowDown");
    press(el, "ArrowDown");
    expect(activeIndex.value).toBe(1);
    expect(document.activeElement).toBe(items()[1]);
  });

  it("jumps to first on Home and last on End", () => {
    const el = build(4);
    const { activeIndex } = useKeyboardNav(ref(el), { itemSelector: ".item" });

    expect(press(el, "End")).toBe(false);
    expect(activeIndex.value).toBe(3);
    expect(document.activeElement).toBe(items()[3]);

    expect(press(el, "Home")).toBe(false);
    expect(activeIndex.value).toBe(0);
    expect(document.activeElement).toBe(items()[0]);
  });

  it("invokes onSelect with the active index on Enter without preventing default", () => {
    const el = build(3);
    const onSelect = vi.fn();
    const { activeIndex } = useKeyboardNav(ref(el), {
      itemSelector: ".item",
      onSelect,
    });
    press(el, "ArrowDown");
    expect(activeIndex.value).toBe(1);

    // Enter neither moves the index nor calls preventDefault.
    expect(press(el, "Enter")).toBe(true);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(activeIndex.value).toBe(1);
  });

  it("invokes onEscape on Escape without preventing default", () => {
    const el = build(3);
    const onEscape = vi.fn();
    useKeyboardNav(ref(el), { itemSelector: ".item", onEscape });
    expect(press(el, "Escape")).toBe(true);
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("ignores unhandled keys (no move, no preventDefault)", () => {
    const el = build(3);
    const { activeIndex } = useKeyboardNav(ref(el), { itemSelector: ".item" });
    expect(press(el, "a")).toBe(true);
    expect(activeIndex.value).toBe(0);
  });

  it("is a no-op (no throw, no move) when the container has no matching items", () => {
    const el = build(0);
    const { activeIndex } = useKeyboardNav(ref(el), { itemSelector: ".item" });
    expect(press(el, "ArrowDown")).toBe(true);
    expect(activeIndex.value).toBe(0);
  });

  it("does not throw on Enter/Escape when no callbacks are provided", () => {
    const el = build(2);
    useKeyboardNav(ref(el), { itemSelector: ".item" });
    expect(() => press(el, "Enter")).not.toThrow();
    expect(() => press(el, "Escape")).not.toThrow();
  });

  it("setItems clamps the active index down when the count shrinks below it", () => {
    const el = build(3);
    const { activeIndex, setItems } = useKeyboardNav(ref(el), {
      itemSelector: ".item",
    });
    press(el, "End"); // activeIndex -> 2
    expect(activeIndex.value).toBe(2);

    setItems(2); // 2 >= 2 -> clamp to max(0, 1)
    expect(activeIndex.value).toBe(1);

    setItems(5); // 1 >= 5 is false -> unchanged
    expect(activeIndex.value).toBe(1);

    setItems(0); // 1 >= 0 -> clamp to max(0, -1) = 0
    expect(activeIndex.value).toBe(0);
  });

  it("does not attach a listener when the container ref is null at call time", () => {
    // No element to dispatch on, but calling with a null ref must not throw
    // and setItems must still work on the returned refs.
    const { activeIndex, setItems } = useKeyboardNav(
      ref<HTMLElement | null>(null),
      { itemSelector: ".item" },
    );
    expect(activeIndex.value).toBe(0);
    setItems(0);
    expect(activeIndex.value).toBe(0);
  });
});
