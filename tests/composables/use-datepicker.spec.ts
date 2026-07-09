import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useDatepicker } from "../../src/composables/useDatepicker";

// useDatepicker builds a fixed-position popup appended to document.body and
// uses requestAnimationFrame for positioning/focus. rAF is stubbed to run
// synchronously so rendering + focus are deterministic; the host is attached
// to the document so button focus updates document.activeElement.
interface SelectDetail {
  date: Date;
  formatted: string;
}

let active: VueWrapper | null = null;

const mountDp = (attrs: Record<string, string>): VueWrapper => {
  const Comp = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      useDatepicker(root);
      return () =>
        h("div", { ref: root }, [
          h("input", { "data-vd-datepicker": "", ...attrs }),
        ]);
    },
  });
  const wrapper = mount(Comp, { attachTo: document.body });
  active = wrapper;
  return wrapper;
};

const getInput = (wrapper: VueWrapper): HTMLInputElement =>
  wrapper.get("input").element as HTMLInputElement;

const getPopup = (): HTMLElement => {
  const popup = document.body.querySelector<HTMLElement>(
    ".vd-datepicker-popup",
  );
  if (!popup) throw new Error("popup not found");
  return popup;
};

const isOpen = (popup: HTMLElement): boolean =>
  popup.classList.contains("is-open");

const fireFocus = (input: HTMLInputElement): void => {
  input.dispatchEvent(new FocusEvent("focus"));
};

const clickEl = (el: Element): void => {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const keydown = (el: Element, key: string): boolean =>
  el.dispatchEvent(
    new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true }),
  );

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  if (active) {
    active.unmount();
    active = null;
  }
  // Safety net: drop any popup a failed test left attached.
  document.body
    .querySelectorAll(".vd-datepicker-popup")
    .forEach((p) => p.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useDatepicker", () => {
  it("wires ARIA attributes on the input and appends a dialog popup", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    const input = getInput(wrapper);

    expect(input.getAttribute("aria-haspopup")).toBe("dialog");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.closest(".vd-suggest-wrapper")).not.toBeNull();

    const popup = getPopup();
    expect(popup.getAttribute("role")).toBe("dialog");
    expect(popup.getAttribute("aria-label")).toBe("Choose date");
    expect(popup.tabIndex).toBe(-1);
  });

  it("opens the day view on focus with weekday headers and a titled month", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    const input = getInput(wrapper);
    fireFocus(input);

    const popup = getPopup();
    expect(isOpen(popup)).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(popup.querySelector(".vd-datepicker-grid")).not.toBeNull();
    expect(popup.querySelectorAll('[role="columnheader"]')).toHaveLength(7);
    expect(popup.querySelector(".vd-datepicker-title")?.textContent).toBe(
      "July 2026",
    );
  });

  it("opens on click when closed", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    const input = getInput(wrapper);
    const popup = getPopup();
    expect(isOpen(popup)).toBe(false);
    clickEl(input);
    expect(isOpen(popup)).toBe(true);
  });

  it("selects a day: sets the input value, closes, and emits datepicker:select + change", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    const input = getInput(wrapper);
    let detail: SelectDetail | null = null;
    let changed = 0;
    input.addEventListener("datepicker:select", (e: Event) => {
      detail = (e as CustomEvent<SelectDetail>).detail;
    });
    input.addEventListener("change", () => {
      changed++;
    });

    fireFocus(input);
    const popup = getPopup();
    const day = popup.querySelector<HTMLElement>('[data-vd-date="2026-07-20"]');
    expect(day).not.toBeNull();
    clickEl(day!);

    expect(input.value).toBe("2026-07-20");
    expect(isOpen(popup)).toBe(false);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(changed).toBe(1);
    expect(detail).not.toBeNull();
    const d = detail as unknown as SelectDetail;
    expect(d.formatted).toBe("2026-07-20");
    expect(d.date.getFullYear()).toBe(2026);
    expect(d.date.getMonth()).toBe(6);
    expect(d.date.getDate()).toBe(20);
  });

  it("honours a custom YYYY/MM/DD format for parsing the value and formatting output", () => {
    const wrapper = mountDp({
      value: "2026/07/15",
      "data-vd-datepicker-format": "YYYY/MM/DD",
    });
    const input = getInput(wrapper);
    let detail: SelectDetail | null = null;
    input.addEventListener("datepicker:select", (e: Event) => {
      detail = (e as CustomEvent<SelectDetail>).detail;
    });

    fireFocus(input);
    const popup = getPopup();
    // The value was parsed as July 2026.
    expect(popup.querySelector(".vd-datepicker-title")?.textContent).toBe(
      "July 2026",
    );
    const day = popup.querySelector<HTMLElement>('[data-vd-date="2026-07-20"]');
    clickEl(day!);

    expect(input.value).toBe("2026/07/20");
    expect((detail as unknown as SelectDetail).formatted).toBe("2026/07/20");
  });

  it("disables days outside the min/max range", () => {
    const wrapper = mountDp({
      value: "2026-07-15",
      "data-vd-datepicker-min": "2026-07-10",
      "data-vd-datepicker-max": "2026-07-20",
    });
    const input = getInput(wrapper);
    fireFocus(input);
    const popup = getPopup();

    const below = popup.querySelector<HTMLElement>(
      '[data-vd-date="2026-07-05"]',
    )!;
    const inRange = popup.querySelector<HTMLElement>(
      '[data-vd-date="2026-07-15"]',
    )!;
    const above = popup.querySelector<HTMLElement>(
      '[data-vd-date="2026-07-25"]',
    )!;

    expect(below.classList.contains("is-disabled")).toBe(true);
    expect(below.getAttribute("aria-disabled")).toBe("true");
    expect(below.tabIndex).toBe(-1);

    expect(above.classList.contains("is-disabled")).toBe(true);
    expect(inRange.classList.contains("is-disabled")).toBe(false);
  });

  it("navigates between months with the prev/next header buttons", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    fireFocus(getInput(wrapper));
    const popup = getPopup();

    clickEl(popup.querySelector(".vd-datepicker-next")!);
    expect(popup.querySelector(".vd-datepicker-title")?.textContent).toBe(
      "August 2026",
    );
    clickEl(popup.querySelector(".vd-datepicker-prev")!);
    expect(popup.querySelector(".vd-datepicker-title")?.textContent).toBe(
      "July 2026",
    );
  });

  it("switches to the month view via the title and back to days when a month is picked", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    fireFocus(getInput(wrapper));
    const popup = getPopup();

    clickEl(popup.querySelector(".vd-datepicker-title")!);
    const months = popup.querySelectorAll<HTMLElement>(
      ".vd-datepicker-month-btn",
    );
    expect(months).toHaveLength(12);

    clickEl(months[2]); // March
    expect(popup.querySelector(".vd-datepicker-grid")).not.toBeNull();
    expect(popup.querySelector(".vd-datepicker-title")?.textContent).toBe(
      "March 2026",
    );
  });

  it("switches from month view to the decade (years) view via the title", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    fireFocus(getInput(wrapper));
    const popup = getPopup();

    clickEl(popup.querySelector(".vd-datepicker-title")!); // -> months
    clickEl(popup.querySelector(".vd-datepicker-title")!); // -> years
    const years = popup.querySelectorAll<HTMLElement>(
      ".vd-datepicker-year-btn",
    );
    expect(years).toHaveLength(12);
    expect(popup.querySelector(".vd-datepicker-title")?.textContent).toBe(
      "2020 - 2029",
    );
  });

  it("moves grid focus with ArrowRight and preventDefaults the key", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    fireFocus(getInput(wrapper));
    const popup = getPopup();

    const focused = popup.querySelector<HTMLElement>(
      '[data-vd-date="2026-07-15"]',
    )!;
    expect(document.activeElement).toBe(focused);

    const prevented = keydown(focused, "ArrowRight");
    expect(prevented).toBe(false); // preventDefault
    expect(
      (document.activeElement as HTMLElement).getAttribute("data-vd-date"),
    ).toBe("2026-07-16");
  });

  it("selects the focused day on Enter within the grid", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    const input = getInput(wrapper);
    let detail: SelectDetail | null = null;
    input.addEventListener("datepicker:select", (e: Event) => {
      detail = (e as CustomEvent<SelectDetail>).detail;
    });
    fireFocus(input);
    const popup = getPopup();
    const focused = popup.querySelector<HTMLElement>(
      '[data-vd-date="2026-07-15"]',
    )!;

    keydown(focused, "Enter");
    expect(input.value).toBe("2026-07-15");
    expect(isOpen(popup)).toBe(false);
    expect((detail as unknown as SelectDetail).formatted).toBe("2026-07-15");
  });

  it("closes on Escape from the document keydown handler", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    const input = getInput(wrapper);
    fireFocus(input);
    const popup = getPopup();
    expect(isOpen(popup)).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(isOpen(popup)).toBe(false);
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("ignores an outside click within the post-open ignore window", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
    const wrapper = mountDp({ value: "2026-07-15" });
    fireFocus(getInput(wrapper));
    const popup = getPopup();
    expect(isOpen(popup)).toBe(true);

    // Still within 100ms of open -> outside click ignored.
    clickEl(document.body);
    expect(isOpen(popup)).toBe(true);
    nowSpy.mockRestore();
  });

  it("closes on an outside click once the ignore window has elapsed", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
    const wrapper = mountDp({ value: "2026-07-15" });
    fireFocus(getInput(wrapper));
    const popup = getPopup();
    expect(isOpen(popup)).toBe(true);

    nowSpy.mockReturnValue(2000); // past ignoreOutsideUntil (1100)
    clickEl(document.body);
    expect(isOpen(popup)).toBe(false);
    nowSpy.mockRestore();
  });

  it("keeps the popup open when clicking inside it", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
    const wrapper = mountDp({ value: "2026-07-15" });
    fireFocus(getInput(wrapper));
    const popup = getPopup();

    nowSpy.mockReturnValue(2000);
    clickEl(popup); // target inside popup -> not an outside click
    expect(isOpen(popup)).toBe(true);
    nowSpy.mockRestore();
  });

  it("removes the popup and detaches listeners on unmount", () => {
    const wrapper = mountDp({ value: "2026-07-15" });
    const input = getInput(wrapper);
    expect(document.body.querySelectorAll(".vd-datepicker-popup")).toHaveLength(
      1,
    );

    wrapper.unmount();
    active = null;

    expect(document.body.querySelectorAll(".vd-datepicker-popup")).toHaveLength(
      0,
    );
    // Focus handler was removed: no new popup appears.
    fireFocus(input);
    expect(document.body.querySelectorAll(".vd-datepicker-popup")).toHaveLength(
      0,
    );
  });
});
