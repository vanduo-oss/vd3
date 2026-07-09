import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { useTimepicker } from "../../src/composables/useTimepicker";

const mounted: VueWrapper[] = [];

function mountHost(html: string): { wrapper: VueWrapper } {
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      useTimepicker(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper };
}

const inputEl = (wrapper: VueWrapper): HTMLInputElement =>
  wrapper.get("input").element as HTMLInputElement;
const popupEl = (): HTMLElement =>
  document.querySelector<HTMLElement>(".vd-timepicker-popup")!;
const itemsOf = (): HTMLElement[] =>
  Array.from(popupEl().querySelectorAll<HTMLElement>(".vd-timepicker-item"));

const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  // open() schedules positioning/scroll in rAF; run it synchronously so the
  // popup state is deterministic without real waiting.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
    cb(0);
    return 0;
  });
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
  vi.unstubAllGlobals();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  document.querySelectorAll(".vd-timepicker-popup").forEach((n) => n.remove());
});

describe("useTimepicker", () => {
  it("wires input ARIA/readonly and appends a closed popup listbox to the body", () => {
    const { wrapper } = mountHost(`<input data-vd-timepicker />`);
    const input = inputEl(wrapper);

    expect(input.getAttribute("aria-haspopup")).toBe("listbox");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.readOnly).toBe(true);

    const popup = popupEl();
    expect(popup.parentElement).toBe(document.body);
    expect(popup.getAttribute("role")).toBe("listbox");
    expect(popup.classList.contains("is-open")).toBe(false);
  });

  it("opens on focus, renders every slot for the default 30-min 12h format", () => {
    const { wrapper } = mountHost(`<input data-vd-timepicker />`);
    const input = inputEl(wrapper);
    input.dispatchEvent(new Event("focus"));

    expect(popupEl().classList.contains("is-open")).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    // 24 hours * (60 / 30) = 48 slots.
    const items = itemsOf();
    expect(items).toHaveLength(48);
    expect(items[0]!.textContent).toBe("12:00 AM"); // midnight, 12h
    expect(items[1]!.textContent).toBe("12:30 AM");
  });

  it("honours 24h format and a custom minute step", () => {
    const { wrapper } = mountHost(
      `<input data-vd-timepicker data-vd-timepicker-format="24h" data-vd-timepicker-step="60" />`,
    );
    inputEl(wrapper).dispatchEvent(new Event("focus"));

    const items = itemsOf();
    expect(items).toHaveLength(24); // one per hour
    expect(items[0]!.textContent).toBe("00:00");
    expect(items[13]!.textContent).toBe("13:00");
  });

  it("formats 12h afternoon slots with the PM period and 1-12 hour", () => {
    const { wrapper } = mountHost(
      `<input data-vd-timepicker data-vd-timepicker-step="60" />`,
    );
    inputEl(wrapper).dispatchEvent(new Event("focus"));
    // hour 13 -> "1:00 PM"
    expect(itemsOf()[13]!.textContent).toBe("1:00 PM");
  });

  it("selects a slot on click: sets value, marks selection, closes, fires events", () => {
    const { wrapper } = mountHost(
      `<input data-vd-timepicker data-vd-timepicker-format="24h" data-vd-timepicker-step="60" />`,
    );
    const input = inputEl(wrapper);
    const selects: Array<{ time: string; hours: number; minutes: number }> = [];
    let changed = 0;
    input.addEventListener("timepicker:select", (e) => {
      selects.push(
        (e as CustomEvent<{ time: string; hours: number; minutes: number }>)
          .detail,
      );
    });
    input.addEventListener("change", () => {
      changed += 1;
    });

    input.dispatchEvent(new Event("focus"));
    itemsOf()[9]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(input.value).toBe("09:00");
    expect(selects).toEqual([{ time: "09:00", hours: 9, minutes: 0 }]);
    expect(changed).toBe(1);
    expect(popupEl().classList.contains("is-open")).toBe(false);
    // The clicked slot stays the sole selection (close() only toggles is-open).
    const selected = popupEl().querySelectorAll(".is-selected");
    expect(selected).toHaveLength(1);
    expect(selected[0]!.textContent).toBe("09:00");
  });

  it("marks the pre-filled value as selected when the popup opens", () => {
    const { wrapper } = mountHost(
      `<input data-vd-timepicker data-vd-timepicker-format="24h" data-vd-timepicker-step="60" value="09:00" />`,
    );
    inputEl(wrapper).dispatchEvent(new Event("focus"));

    const selected = popupEl().querySelectorAll(".is-selected");
    expect(selected).toHaveLength(1);
    expect(selected[0]!.textContent).toBe("09:00");
    expect(selected[0]!.getAttribute("aria-selected")).toBe("true");
  });

  it("closes on an outside click but stays open for clicks on the input", () => {
    const { wrapper } = mountHost(`<input data-vd-timepicker />`);
    const input = inputEl(wrapper);
    input.dispatchEvent(new Event("focus"));
    expect(popupEl().classList.contains("is-open")).toBe(true);

    // Click on the input itself -> inside -> stays open.
    input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(popupEl().classList.contains("is-open")).toBe(true);

    // Click elsewhere -> outside -> closes.
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(popupEl().classList.contains("is-open")).toBe(false);
  });

  it("closes on Escape", () => {
    const { wrapper } = mountHost(`<input data-vd-timepicker />`);
    inputEl(wrapper).dispatchEvent(new Event("focus"));
    expect(popupEl().classList.contains("is-open")).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(popupEl().classList.contains("is-open")).toBe(false);
  });

  it("removes the popup and all document/window listeners on unmount", () => {
    const docRemove = vi.spyOn(document, "removeEventListener");
    const winRemove = vi.spyOn(window, "removeEventListener");

    const { wrapper } = mountHost(`<input data-vd-timepicker />`);
    wrapper.unmount();

    expect(document.querySelector(".vd-timepicker-popup")).toBeNull();
    const docEvents = docRemove.mock.calls.map((c) => c[0]);
    const winEvents = winRemove.mock.calls.map((c) => c[0]);
    expect(docEvents).toContain("click");
    expect(docEvents).toContain("keydown");
    expect(winEvents).toContain("resize");
    expect(winEvents).toContain("scroll");

    docRemove.mockRestore();
    winRemove.mockRestore();
  });
});
