/**
 * VdMenu — a `.vd-dropdown` toggle + menu whose open/close, outside-click,
 * keyboard, and typeahead behavior is delegated to the rewritten `useDropdown`
 * composable. The component only renders the donor markup and emits `select`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import VdMenu from "../../src/components/VdMenu.vue";

type MenuProps = InstanceType<typeof VdMenu>["$props"];

let wrapper: VueWrapper | undefined;

const items = [
  { label: "Copy", value: "c" },
  { label: "Cut", href: "#cut" },
  { divider: true },
  { label: "Paste", disabled: true },
] as const;

const mountMenu = (props: Partial<MenuProps> = {}): VueWrapper => {
  wrapper = mount(VdMenu, {
    props: { label: "File", items: items as MenuProps["items"], ...props },
    attachTo: document.body,
  });
  return wrapper;
};

const toggle = (): HTMLElement =>
  wrapper!.get(".vd-dropdown-toggle").element as HTMLElement;
const menu = (): HTMLElement =>
  wrapper!.get(".vd-dropdown-menu").element as HTMLElement;
const itemEls = (): HTMLElement[] =>
  Array.from(
    (wrapper!.element as HTMLElement).querySelectorAll<HTMLElement>(
      ".vd-dropdown-item",
    ),
  );

const click = (el: Element): void => {
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};
const keydown = (el: Element, key: string): void => {
  el.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("VdMenu", () => {
  it("renders the donor markup: toggle, menu role, divider, disabled item", () => {
    mountMenu();

    const t = toggle();
    expect(t.tagName).toBe("BUTTON");
    expect(t.classList.contains("vd-btn")).toBe(true);
    expect(t.classList.contains("vd-btn-secondary")).toBe(true);
    expect(t.textContent?.trim()).toBe("File");
    // useDropdown preserves the component-authored aria-haspopup.
    expect(t.getAttribute("aria-haspopup")).toBe("menu");

    expect(menu().getAttribute("role")).toBe("menu");

    const links = itemEls();
    links.forEach((a) => {
      expect(a.tagName).toBe("A");
      expect(a.getAttribute("role")).toBe("menuitem");
    });
    // Copy, Cut, Paste are items; the divider is not a .vd-dropdown-item.
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      "Copy",
      "Cut",
      "Paste",
    ]);

    const divider = wrapper!.get(".vd-dropdown-divider").element;
    expect(divider.getAttribute("role")).toBe("separator");

    const paste = links[2]!;
    expect(paste.classList.contains("is-disabled")).toBe(true);
    expect(paste.getAttribute("aria-disabled")).toBe("true");
  });

  it("adds vd-dropdown-menu-end only when align='end'", () => {
    mountMenu({ align: "start" });
    expect(menu().classList.contains("vd-dropdown-menu-end")).toBe(false);
    wrapper!.unmount();

    mountMenu({ align: "end" });
    expect(menu().classList.contains("vd-dropdown-menu-end")).toBe(true);
  });

  it("opens on toggle click and closes on Escape — behavior delegated to useDropdown", () => {
    mountMenu();
    const t = toggle();

    click(t);
    expect(menu().classList.contains("is-open")).toBe(true);
    expect(t.getAttribute("aria-expanded")).toBe("true");

    keydown(t, "Escape");
    expect(menu().classList.contains("is-open")).toBe(false);
    expect(t.getAttribute("aria-expanded")).toBe("false");
  });

  it("emits exactly one select with item.value and closes the menu", () => {
    const w = mountMenu();
    click(toggle());
    click(itemEls()[0]!); // Copy -> value "c"

    expect(w.emitted("select")).toEqual([["c"]]);
    expect(menu().classList.contains("is-open")).toBe(false);
  });

  it("falls back to the label when an item has no value", () => {
    const w = mountMenu();
    click(toggle());
    click(itemEls()[1]!); // Cut -> no value, emits label
    expect(w.emitted("select")).toEqual([["Cut"]]);
  });

  it("does not emit select when a disabled item is clicked", () => {
    const w = mountMenu();
    click(toggle());
    click(itemEls()[2]!); // Paste (disabled)
    expect(w.emitted("select")).toBeUndefined();
    expect(menu().classList.contains("is-open")).toBe(true);
  });
});
