import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref, type Ref } from "vue";
import {
  useDropdown,
  type UseDropdownController,
} from "../../src/composables/useDropdown";

// Each composable runs in a component scope: mount a host whose root ref is
// handed to the composable, with the fixture markup injected as innerHTML so
// the composable's onMounted `querySelectorAll` scan sees real DOM.
const mounted: VueWrapper[] = [];

function mountHost<T>(
  html: string,
  use: (root: Ref<HTMLElement | null>) => T,
): { wrapper: VueWrapper; api: T } {
  let api!: T;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = use(root);
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

const key = (el: Element, k: string): KeyboardEvent => {
  const ev = new KeyboardEvent("keydown", {
    key: k,
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(ev);
  return ev;
};

const menu = `
  <div class="vd-dropdown">
    <button type="button" class="vd-dropdown-toggle">File</button>
    <div class="vd-dropdown-menu">
      <a class="vd-dropdown-item" href="#a">Alpha</a>
      <a class="vd-dropdown-item" data-value="b" href="#b">Beta</a>
      <a class="vd-dropdown-item" href="#g">Gamma</a>
      <a class="vd-dropdown-item is-disabled" href="#d">Delta</a>
    </div>
  </div>`;

const toggleEl = (w: VueWrapper): HTMLElement =>
  w.get(".vd-dropdown-toggle").element as HTMLElement;
const menuEl = (w: VueWrapper): HTMLElement =>
  w.get(".vd-dropdown-menu").element as HTMLElement;
const items = (w: VueWrapper): HTMLElement[] =>
  Array.from(
    (w.element as HTMLElement).querySelectorAll<HTMLElement>(
      ".vd-dropdown-item",
    ),
  );

beforeEach(() => {
  vi.useFakeTimers();
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
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("useDropdown", () => {
  it("wires ARIA on mount: aria-haspopup/aria-expanded on the toggle, role/aria-hidden on the menu", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);
    const m = menuEl(wrapper);

    expect(toggle.getAttribute("aria-haspopup")).toBe("true");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(m.getAttribute("role")).toBe("menu");
    expect(m.getAttribute("aria-hidden")).toBe("true");
  });

  it("preserves a component-authored aria-haspopup instead of overwriting it", () => {
    const { wrapper } = mountHost(
      `<div class="vd-dropdown">
         <button class="vd-dropdown-toggle" aria-haspopup="menu">M</button>
         <div class="vd-dropdown-menu"><a class="vd-dropdown-item" href="#">X</a></div>
       </div>`,
      useDropdown,
    );
    expect(toggleEl(wrapper).getAttribute("aria-haspopup")).toBe("menu");
  });

  it("opens on toggle click: is-open on container and menu, ARIA flips, first enabled item focused", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);
    const m = menuEl(wrapper);

    click(toggle);
    expect(
      wrapper.get(".vd-dropdown").element.classList.contains("is-open"),
    ).toBe(true);
    expect(m.classList.contains("is-open")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(m.getAttribute("aria-hidden")).toBe("false");

    vi.runAllTimers(); // first-item focus is deferred via setTimeout(…, 0)
    expect(document.activeElement).toBe(items(wrapper)[0]); // Alpha
  });

  it("toggles closed on a second click and restores focus to the toggle", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);

    click(toggle); // open
    click(toggle); // close
    expect(menuEl(wrapper).classList.contains("is-open")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });

  it("selects an item on click: active classes, dropdown:select payload, close, button label, refocus", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);
    const beta = items(wrapper)[1]!; // data-value="b"

    const events: CustomEvent[] = [];
    wrapper.element.addEventListener("dropdown:select", (e: Event) =>
      events.push(e as CustomEvent),
    );

    click(toggle); // open
    click(beta); // select

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.value).toBe("b");
    expect(events[0]!.detail.item).toBe(beta);
    expect(beta.classList.contains("active")).toBe(true);
    expect(beta.classList.contains("is-active")).toBe(true);
    expect(menuEl(wrapper).classList.contains("is-open")).toBe(false);
    expect(toggle.textContent).toBe("Beta"); // button label updated
    expect(document.activeElement).toBe(toggle);
  });

  it("falls back to trimmed text for the select value when there is no data-value", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const alpha = items(wrapper)[0]!;
    const events: CustomEvent[] = [];
    wrapper.element.addEventListener("dropdown:select", (e: Event) =>
      events.push(e as CustomEvent),
    );

    click(toggleEl(wrapper));
    click(alpha);
    expect(events[0]!.detail.value).toBe("Alpha");
  });

  it("selects a focused item via Enter and via Space", () => {
    for (const k of ["Enter", " "]) {
      const { wrapper } = mountHost(menu, useDropdown);
      const gamma = items(wrapper)[2]!;
      const events: CustomEvent[] = [];
      wrapper.element.addEventListener("dropdown:select", (e: Event) =>
        events.push(e as CustomEvent),
      );
      click(toggleEl(wrapper));
      gamma.focus();
      key(gamma, k);
      expect(events).toHaveLength(1);
      expect(events[0]!.detail.item).toBe(gamma);
      wrapper.unmount();
    }
  });

  it("typeahead focuses the first item whose text starts with the buffer, resetting after 500ms", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);
    click(toggle); // open

    key(toggle, "g");
    expect(document.activeElement).toBe(items(wrapper)[2]); // Gamma

    // Within the 500ms window the buffer accumulates: "g" + "a" = "ga" matches
    // nothing, so focus stays on Gamma rather than jumping to Alpha.
    key(toggle, "a");
    expect(document.activeElement).toBe(items(wrapper)[2]); // still Gamma

    // After the timeout the buffer resets, so a lone "a" now matches Alpha.
    vi.advanceTimersByTime(600);
    key(toggle, "a");
    expect(document.activeElement).toBe(items(wrapper)[0]); // Alpha
  });

  it("ArrowDown/ArrowUp cycle focus across enabled items with wrap-around", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);
    const [alpha, beta, gamma] = items(wrapper);

    key(toggle, "ArrowDown"); // opens
    vi.runAllTimers();
    expect(document.activeElement).toBe(alpha);

    key(alpha!, "ArrowDown");
    expect(document.activeElement).toBe(beta);
    key(beta!, "ArrowDown");
    expect(document.activeElement).toBe(gamma);
    key(gamma!, "ArrowDown"); // wraps (Delta is disabled and skipped)
    expect(document.activeElement).toBe(alpha);
    key(alpha!, "ArrowUp"); // wraps backward to the last enabled item
    expect(document.activeElement).toBe(gamma);
  });

  it("Home and End jump to the first and last enabled items", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);
    click(toggle);
    const [alpha, , gamma] = items(wrapper);

    key(toggle, "End");
    expect(document.activeElement).toBe(gamma); // Delta is disabled
    key(gamma!, "Home");
    expect(document.activeElement).toBe(alpha);
  });

  it("Escape closes an open dropdown and returns focus to the toggle", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);
    click(toggle);
    vi.runAllTimers();
    const alpha = items(wrapper)[0]!;
    expect(document.activeElement).toBe(alpha);

    const ev = key(alpha, "Escape");
    expect(ev.defaultPrevented).toBe(true);
    expect(menuEl(wrapper).classList.contains("is-open")).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it("disabled items are excluded from focus and selection", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);
    const delta = items(wrapper)[3]!; // .is-disabled
    const events: CustomEvent[] = [];
    wrapper.element.addEventListener("dropdown:select", (e: Event) =>
      events.push(e as CustomEvent),
    );

    click(toggle);
    click(delta);
    expect(events).toHaveLength(0);
    expect(delta.classList.contains("is-active")).toBe(false);
    expect(menuEl(wrapper).classList.contains("is-open")).toBe(true);
  });

  it("closes on an outside click without stealing focus back to the toggle", () => {
    const { wrapper } = mountHost(menu, useDropdown);
    const toggle = toggleEl(wrapper);
    click(toggle);
    expect(menuEl(wrapper).classList.contains("is-open")).toBe(true);

    click(document.body);
    expect(menuEl(wrapper).classList.contains("is-open")).toBe(false);
    expect(document.activeElement).not.toBe(toggle);
  });

  it("auto-placement adds -start by default, -top for dropup, and nothing for dropright/dropleft", () => {
    const { wrapper: def } = mountHost(menu, useDropdown);
    click(toggleEl(def));
    const dm = menuEl(def);
    expect(dm.classList.contains("vd-dropdown-menu-start")).toBe(true);
    expect(dm.classList.contains("vd-dropdown-menu-top")).toBe(false);

    const { wrapper: up } = mountHost(
      menu.replace('vd-dropdown"', 'vd-dropdown vd-dropdown-dropup"'),
      useDropdown,
    );
    click(toggleEl(up));
    const um = menuEl(up);
    expect(um.classList.contains("vd-dropdown-menu-top")).toBe(true);
    expect(um.classList.contains("vd-dropdown-menu-start")).toBe(false);
    expect(um.classList.contains("vd-dropdown-menu-end")).toBe(false);

    const { wrapper: right } = mountHost(
      menu.replace('vd-dropdown"', 'vd-dropdown vd-dropdown-dropright"'),
      useDropdown,
    );
    click(toggleEl(right));
    const rm = menuEl(right);
    expect(rm.classList.contains("vd-dropdown-menu-start")).toBe(false);
    expect(rm.classList.contains("vd-dropdown-menu-end")).toBe(false);
    expect(rm.classList.contains("vd-dropdown-menu-top")).toBe(false);
  });

  it("opening one dropdown closes the others wired by the same instance", () => {
    const two = `
      <div class="vd-dropdown" id="d1">
        <button class="vd-dropdown-toggle">One</button>
        <div class="vd-dropdown-menu"><a class="vd-dropdown-item" href="#1">A</a></div>
      </div>
      <div class="vd-dropdown" id="d2">
        <button class="vd-dropdown-toggle">Two</button>
        <div class="vd-dropdown-menu"><a class="vd-dropdown-item" href="#2">B</a></div>
      </div>`;
    const { wrapper } = mountHost(two, useDropdown);
    const t1 = wrapper.get("#d1 .vd-dropdown-toggle").element;
    const t2 = wrapper.get("#d2 .vd-dropdown-toggle").element;
    const m1 = wrapper.get("#d1 .vd-dropdown-menu").element;
    const m2 = wrapper.get("#d2 .vd-dropdown-menu").element;

    click(t1);
    expect(m1.classList.contains("is-open")).toBe(true);
    click(t2);
    expect(m2.classList.contains("is-open")).toBe(true);
    expect(m1.classList.contains("is-open")).toBe(false);
  });

  it("sibling useDropdown instances stay isolated (opening one does not close the other's)", () => {
    const single = `
      <div class="vd-dropdown">
        <button class="vd-dropdown-toggle">T</button>
        <div class="vd-dropdown-menu"><a class="vd-dropdown-item" href="#">I</a></div>
      </div>`;
    const { wrapper: a } = mountHost(single, useDropdown);
    const { wrapper: b } = mountHost(single, useDropdown);

    click(toggleEl(a));
    click(toggleEl(b));
    expect(menuEl(a).classList.contains("is-open")).toBe(true);
    expect(menuEl(b).classList.contains("is-open")).toBe(true);
  });

  it("exposes an open/close controller that resolves by element, selector, or the sole dropdown", () => {
    const { wrapper, api } = mountHost(menu, useDropdown);
    const controller: UseDropdownController = api;
    const m = menuEl(wrapper);

    controller.open(); // sole dropdown
    expect(m.classList.contains("is-open")).toBe(true);
    controller.close();
    expect(m.classList.contains("is-open")).toBe(false);

    controller.open(".vd-dropdown"); // selector
    expect(m.classList.contains("is-open")).toBe(true);
    controller.close(wrapper.get(".vd-dropdown").element as HTMLElement); // element
    expect(m.classList.contains("is-open")).toBe(false);
  });

  it("removes its document listener and clears timers on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { wrapper } = mountHost(menu, useDropdown);
    const m = menuEl(wrapper);
    click(toggleEl(wrapper)); // open (document click listener is live)
    expect(m.classList.contains("is-open")).toBe(true);

    wrapper.unmount();
    expect(removeSpy.mock.calls.some((c) => c[0] === "click")).toBe(true);

    // After unmount the document listener is gone: an outside click no longer
    // touches the (now detached) menu, which keeps its last state.
    click(document.body);
    expect(m.classList.contains("is-open")).toBe(true);
    removeSpy.mockRestore();
  });
});
