import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref, type Ref } from "vue";
import { useSidenav } from "../../src/composables/useSidenav";

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

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted by the test under test */
    }
  }
  mounted.length = 0;
  document.body
    .querySelectorAll(".vd-sidenav-overlay")
    .forEach((n) => n.remove());
  document.body.classList.remove("body-sidenav-open");
});

const overlay = (): HTMLElement =>
  document.querySelector<HTMLElement>(".vd-sidenav-overlay")!;

describe("useSidenav", () => {
  const html = `
    <button data-sidenav-toggle="#drawer">Open</button>
    <nav id="drawer" class="vd-sidenav" data-vd-position="left">
      <button class="vd-sidenav-close">x</button>
      <a href="#foo">Link</a>
    </nav>`;

  it("initializes each drawer: role, aria-hidden, position class, and a body overlay", () => {
    const { wrapper } = mountHost(html, useSidenav);
    const nav = wrapper.get("#drawer").element;

    expect(nav.getAttribute("role")).toBe("navigation");
    expect(nav.getAttribute("aria-hidden")).toBe("true");
    // data-vd-position="left" on a .vd-sidenav -> vd-sidenav-left
    expect(nav.classList.contains("vd-sidenav-left")).toBe(true);

    const overlays = document.body.querySelectorAll(".vd-sidenav-overlay");
    expect(overlays).toHaveLength(1);
  });

  it("uses the vd-offcanvas prefix for the position class on offcanvas drawers", () => {
    const { wrapper } = mountHost(
      `<nav id="oc" class="vd-offcanvas" data-vd-position="end"></nav>`,
      useSidenav,
    );
    expect(
      wrapper.get("#oc").element.classList.contains("vd-offcanvas-end"),
    ).toBe(true);
  });

  it("opens on toggle click: preventDefault, is-open, overlay visible, body lock, event", () => {
    const { wrapper } = mountHost(html, useSidenav);
    const nav = wrapper.get("#drawer").element;
    const opens: Event[] = [];
    nav.addEventListener("sidenav:open", (e) => opens.push(e));

    const ev = click(wrapper.get("[data-sidenav-toggle]").element);

    expect(ev.defaultPrevented).toBe(true);
    expect(nav.classList.contains("is-open")).toBe(true);
    expect(nav.getAttribute("aria-hidden")).toBe("false");
    expect(overlay().classList.contains("is-visible")).toBe(true);
    expect(document.body.classList.contains("body-sidenav-open")).toBe(true);
    expect(opens).toHaveLength(1);
  });

  it("toggles closed on a second click: clears classes, body lock, fires sidenav:close", () => {
    const { wrapper } = mountHost(html, useSidenav);
    const nav = wrapper.get("#drawer").element;
    const closes: Event[] = [];
    nav.addEventListener("sidenav:close", (e) => closes.push(e));
    const toggle = wrapper.get("[data-sidenav-toggle]").element;

    click(toggle); // open
    click(toggle); // close

    expect(nav.classList.contains("is-open")).toBe(false);
    expect(nav.getAttribute("aria-hidden")).toBe("true");
    expect(overlay().classList.contains("is-visible")).toBe(false);
    expect(document.body.classList.contains("body-sidenav-open")).toBe(false);
    expect(closes).toHaveLength(1);
  });

  it("closes when the close button is clicked", () => {
    const { wrapper } = mountHost(html, useSidenav);
    const nav = wrapper.get("#drawer").element;
    click(wrapper.get("[data-sidenav-toggle]").element);
    expect(nav.classList.contains("is-open")).toBe(true);

    click(wrapper.get(".vd-sidenav-close").element);
    expect(nav.classList.contains("is-open")).toBe(false);
  });

  it("closes on overlay click, but not when data-backdrop='static'", () => {
    const { wrapper } = mountHost(html, useSidenav);
    const nav = wrapper.get("#drawer").element;
    click(wrapper.get("[data-sidenav-toggle]").element);

    click(overlay());
    expect(nav.classList.contains("is-open")).toBe(false);

    // Static backdrop: overlay click is ignored.
    const { wrapper: w2 } = mountHost(
      `<button data-sidenav-toggle="#d2">o</button>
       <nav id="d2" class="vd-sidenav" data-backdrop="static"></nav>`,
      useSidenav,
    );
    const nav2 = w2.get("#d2").element;
    click(w2.get("[data-sidenav-toggle]").element);
    const overlays = document.body.querySelectorAll<HTMLElement>(
      ".vd-sidenav-overlay",
    );
    click(overlays[overlays.length - 1]!);
    expect(nav2.classList.contains("is-open")).toBe(true);
  });

  it("closes on Escape only while open and unless data-keyboard='false'", () => {
    const { wrapper } = mountHost(html, useSidenav);
    const nav = wrapper.get("#drawer").element;
    const esc = (): void =>
      void document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape" }),
      );

    // Not open yet -> Escape is a no-op (no body class churn).
    esc();
    expect(nav.classList.contains("is-open")).toBe(false);

    click(wrapper.get("[data-sidenav-toggle]").element);
    esc();
    expect(nav.classList.contains("is-open")).toBe(false);
  });

  it("does not close on Escape when data-keyboard='false'", () => {
    const { wrapper } = mountHost(
      `<button data-sidenav-toggle="#d3">o</button>
       <nav id="d3" class="vd-sidenav" data-keyboard="false"></nav>`,
      useSidenav,
    );
    const nav = wrapper.get("#d3").element;
    click(wrapper.get("[data-sidenav-toggle]").element);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(nav.classList.contains("is-open")).toBe(true);
  });

  it("does not mark the overlay visible for fixed drawers, but still opens", () => {
    const { wrapper } = mountHost(
      `<button data-sidenav-toggle="#d4">o</button>
       <nav id="d4" class="vd-sidenav vd-sidenav-fixed"></nav>`,
      useSidenav,
    );
    const nav = wrapper.get("#d4").element;
    click(wrapper.get("[data-sidenav-toggle]").element);

    expect(nav.classList.contains("is-open")).toBe(true);
    expect(overlay().classList.contains("is-visible")).toBe(false);
  });

  it("removes overlays, the body lock, and its keydown listener on unmount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const { wrapper } = mountHost(html, useSidenav);
    click(wrapper.get("[data-sidenav-toggle]").element); // sets body lock
    const keydownAdds = addSpy.mock.calls.filter(
      (c) => c[0] === "keydown",
    ).length;

    wrapper.unmount();

    const keydownRemoves = removeSpy.mock.calls.filter(
      (c) => c[0] === "keydown",
    ).length;
    expect(keydownAdds).toBeGreaterThan(0);
    expect(keydownRemoves).toBe(keydownAdds);
    expect(document.body.querySelectorAll(".vd-sidenav-overlay")).toHaveLength(
      0,
    );
    expect(document.body.classList.contains("body-sidenav-open")).toBe(false);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
