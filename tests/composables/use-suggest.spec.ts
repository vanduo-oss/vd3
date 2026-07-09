import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { useSuggest } from "../../src/composables/useSuggest";

const mounted: VueWrapper[] = [];

function mountHost(html: string): { wrapper: VueWrapper } {
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      useSuggest(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper };
}

const inputEl = (wrapper: VueWrapper): HTMLInputElement =>
  wrapper.get("input").element as HTMLInputElement;

const listEl = (): HTMLElement =>
  document.querySelector<HTMLElement>(".vd-suggest-list")!;

const itemsOf = (): HTMLElement[] =>
  Array.from(listEl().querySelectorAll<HTMLElement>(".vd-suggest-item"));

// jsdom implements neither of these; the composable calls them during
// highlight/scroll and would throw without a stub.
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  vi.useFakeTimers();
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
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  document.querySelectorAll(".vd-suggest-list").forEach((n) => n.remove());
});

describe("useSuggest", () => {
  const staticInput = (attrs = ""): string =>
    `<input data-vd-suggest='["Apple","Apricot","Banana"]' ${attrs} />`;

  it("wraps the input, builds the listbox, and sets combobox ARIA wiring", () => {
    const { wrapper } = mountHost(staticInput());
    const input = inputEl(wrapper);

    expect(input.closest(".vd-suggest-wrapper")).not.toBeNull();
    const list = listEl();
    expect(list.getAttribute("role")).toBe("listbox");
    expect(list.id).toMatch(/^vd-suggest-/);

    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("aria-controls")).toBe(list.id);
    expect(input.getAttribute("autocomplete")).toBe("off");
  });

  it("filters, opens, and highlights matches after the debounce on input", async () => {
    const { wrapper } = mountHost(staticInput());
    const input = inputEl(wrapper);

    input.value = "ap";
    input.dispatchEvent(new Event("input"));
    // Debounced 200ms; nothing rendered yet.
    expect(listEl().classList.contains("is-open")).toBe(false);

    await vi.advanceTimersByTimeAsync(200);

    expect(listEl().classList.contains("is-open")).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const rendered = itemsOf();
    expect(rendered.map((li) => li.textContent)).toEqual(["Apple", "Apricot"]);
    // The matched substring is wrapped for highlighting (original casing).
    const match = rendered[0]!.querySelector(".vd-suggest-match");
    expect(match?.textContent).toBe("Ap");
  });

  it("renders a 'No results' item when nothing matches", async () => {
    const { wrapper } = mountHost(staticInput());
    const input = inputEl(wrapper);
    input.value = "zzz";
    input.dispatchEvent(new Event("input"));
    await vi.advanceTimersByTimeAsync(200);

    expect(itemsOf()).toHaveLength(0);
    expect(listEl().querySelector(".vd-suggest-empty")?.textContent).toBe(
      "No results",
    );
    expect(listEl().classList.contains("is-open")).toBe(true);
  });

  it("stays closed below the configured minimum character threshold", async () => {
    const { wrapper } = mountHost(staticInput('data-vd-suggest-min-chars="2"'));
    const input = inputEl(wrapper);
    input.value = "a";
    input.dispatchEvent(new Event("input"));
    await vi.advanceTimersByTimeAsync(200);

    expect(listEl().classList.contains("is-open")).toBe(false);
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("selects an item on click: sets value, closes, fires suggest:select", async () => {
    const { wrapper } = mountHost(
      `<input data-vd-suggest='[{"label":"Apple","value":"apl"},{"label":"Apricot","value":"apr"}]' />`,
    );
    const input = inputEl(wrapper);
    const selects: Array<{ value: string; index: number }> = [];
    input.addEventListener("suggest:select", (e) => {
      const d = (e as CustomEvent<{ value: string; index: number }>).detail;
      selects.push({ value: d.value, index: d.index });
    });

    input.value = "ap";
    input.dispatchEvent(new Event("input"));
    await vi.advanceTimersByTimeAsync(200);

    itemsOf()[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(input.value).toBe("apl"); // object -> value field wins
    expect(listEl().classList.contains("is-open")).toBe(false);
    expect(selects).toEqual([{ value: "apl", index: 0 }]);
  });

  it("supports keyboard navigation, selection, and Escape", async () => {
    const { wrapper } = mountHost(staticInput());
    const input = inputEl(wrapper);
    const key = (k: string): void =>
      void input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: k,
          cancelable: true,
          bubbles: true,
        }),
      );

    input.value = "ap";
    input.dispatchEvent(new Event("focus"));
    await flushPromises();
    expect(listEl().classList.contains("is-open")).toBe(true);

    key("ArrowDown"); // highlight 0
    const first = itemsOf()[0]!;
    expect(first.classList.contains("is-highlighted")).toBe(true);
    expect(input.getAttribute("aria-activedescendant")).toBe(first.id);

    key("ArrowDown"); // highlight 1
    expect(itemsOf()[1]!.classList.contains("is-highlighted")).toBe(true);
    key("ArrowDown"); // wraps back to 0
    expect(itemsOf()[0]!.classList.contains("is-highlighted")).toBe(true);
    key("ArrowUp"); // wraps to last
    expect(itemsOf()[1]!.classList.contains("is-highlighted")).toBe(true);

    key("Enter"); // selects the highlighted item
    expect(input.value).toBe("Apricot");
    expect(listEl().classList.contains("is-open")).toBe(false);
  });

  it("opens with ArrowDown from a closed list and prevents default", async () => {
    const { wrapper } = mountHost(staticInput());
    const input = inputEl(wrapper);
    input.value = "ap";

    const ev = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      cancelable: true,
    });
    input.dispatchEvent(ev);
    await flushPromises();

    expect(ev.defaultPrevented).toBe(true);
    expect(listEl().classList.contains("is-open")).toBe(true);
  });

  it("re-opens on focus when the value already meets the threshold", async () => {
    const { wrapper } = mountHost(staticInput());
    const input = inputEl(wrapper);
    input.value = "ban";
    input.dispatchEvent(new Event("focus"));
    await flushPromises();

    expect(listEl().classList.contains("is-open")).toBe(true);
    expect(itemsOf().map((li) => li.textContent)).toEqual(["Banana"]);
  });

  it("closes 200ms after blur", async () => {
    const { wrapper } = mountHost(staticInput());
    const input = inputEl(wrapper);
    input.value = "ap";
    input.dispatchEvent(new Event("focus"));
    await flushPromises();
    expect(listEl().classList.contains("is-open")).toBe(true);

    input.dispatchEvent(new Event("blur"));
    expect(listEl().classList.contains("is-open")).toBe(true); // still open
    await vi.advanceTimersByTimeAsync(200);
    expect(listEl().classList.contains("is-open")).toBe(false);
  });

  it("fetches from a same-origin URL and renders the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(["Server A", "Server B"]),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = mountHost(
      `<input data-vd-suggest data-vd-suggest-url="/api/search" />`,
    );
    const input = inputEl(wrapper);
    input.value = "se";
    input.dispatchEvent(new Event("focus"));
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/search?q=se");
    expect(itemsOf().map((li) => li.textContent)).toEqual([
      "Server A",
      "Server B",
    ]);
  });

  it("blocks cross-origin URLs that are not allowlisted (no fetch, No results)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = mountHost(
      `<input data-vd-suggest data-vd-suggest-url="https://evil.example.com/api" />`,
    );
    const input = inputEl(wrapper);
    input.value = "se";
    input.dispatchEvent(new Event("focus"));
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(listEl().querySelector(".vd-suggest-empty")).not.toBeNull();
  });

  it("allows an allowlisted cross-origin URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(["OK"]),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = mountHost(
      `<input data-vd-suggest data-vd-suggest-url="https://api.example.com/x" data-vd-suggest-allowlist="https://api.example.com" />`,
    );
    const input = inputEl(wrapper);
    input.value = "se";
    input.dispatchEvent(new Event("focus"));
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(itemsOf().map((li) => li.textContent)).toEqual(["OK"]);
  });

  it("renders No results when the fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const { wrapper } = mountHost(
      `<input data-vd-suggest data-vd-suggest-url="/api" />`,
    );
    const input = inputEl(wrapper);
    input.value = "se";
    input.dispatchEvent(new Event("focus"));
    await flushPromises();

    expect(listEl().querySelector(".vd-suggest-empty")).not.toBeNull();
  });

  it("falls back to comma-split data when the static payload is not JSON", async () => {
    const { wrapper } = mountHost(
      `<input data-vd-suggest="Red, Green, Blue" />`,
    );
    const input = inputEl(wrapper);
    input.value = "re";
    input.dispatchEvent(new Event("input"));
    await vi.advanceTimersByTimeAsync(200);

    // "re" matches Red and Green (g-RE-en) but not Blue.
    expect(itemsOf().map((li) => li.textContent)).toEqual(["Red", "Green"]);
  });

  it("removes the list and clears a pending debounce on unmount", async () => {
    const { wrapper } = mountHost(staticInput());
    const input = inputEl(wrapper);
    input.value = "ap";
    input.dispatchEvent(new Event("input")); // schedules a debounce

    wrapper.unmount();
    expect(document.querySelector(".vd-suggest-list")).toBeNull();

    // The cleared debounce must not fire against the torn-down list.
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    expect(document.querySelector(".vd-suggest-list")).toBeNull();
  });
});
