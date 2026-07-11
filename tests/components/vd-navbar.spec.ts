import { afterEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import VdNavbar from "../../src/components/VdNavbar.vue";

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.classList.remove("body-navbar-open");
  setViewportWidth(1024);
  setScrollY(0);
});

const menuSlot = `
  <ul class="vd-navbar-nav">
    <li><a class="vd-nav-link active" href="#home">Home</a></li>
    <li><a class="vd-nav-link" href="#docs">Docs</a></li>
    <li class="vd-navbar-dropdown">
      <a class="vd-nav-link" href="#more">More</a>
      <ul class="vd-navbar-dropdown-menu">
        <li><a class="vd-navbar-dropdown-item" href="#a">A</a></li>
      </ul>
    </li>
  </ul>`;

const factory = (
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
  options: Record<string, unknown> = {},
) =>
  mount(VdNavbar, {
    props,
    slots: {
      brand: '<a href="#" class="brand-link">Vanduo</a>',
      default: menuSlot,
      actions: '<button class="cta">Sign in</button>',
      ...slots,
    },
    ...options,
  });

function setViewportWidth(value: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value,
  });
}

function setScrollY(value: number): void {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    writable: true,
    value,
  });
}

const overlay = () =>
  document.body.querySelector<HTMLElement>(".vd-navbar-overlay");

describe("VdNavbar", () => {
  it("renders the slot-driven structure with the class contract", () => {
    const wrapper = factory();
    const nav = wrapper.find("nav.vd-navbar");
    expect(nav.exists()).toBe(true);

    const container = nav.find(".vd-navbar-container");
    expect(container.exists()).toBe(true);

    // brand slot wrapped in .vd-navbar-brand
    const brand = container.find(".vd-navbar-brand");
    expect(brand.exists()).toBe(true);
    expect(brand.find("a.brand-link").text()).toBe("Vanduo");

    // burger toggle with three bars
    const toggle = container.find("button.vd-navbar-toggle");
    expect(toggle.exists()).toBe(true);
    expect(toggle.attributes("type")).toBe("button");
    expect(toggle.findAll("span")).toHaveLength(3);

    // default slot wrapped in .vd-navbar-menu, actions wrapped in .vd-navbar-actions
    const menu = container.find(".vd-navbar-menu");
    expect(menu.exists()).toBe(true);
    expect(menu.find("ul.vd-navbar-nav").exists()).toBe(true);
    const actions = menu.find(".vd-navbar-actions");
    expect(actions.exists()).toBe(true);
    expect(actions.find("button.cta").exists()).toBe(true);

    // generated overlay teleported to body
    expect(overlay()).not.toBeNull();
  });

  it("omits the brand and actions wrappers when their slots are empty", () => {
    const wrapper = mount(VdNavbar, { slots: { default: menuSlot } });
    expect(wrapper.find(".vd-navbar-brand").exists()).toBe(false);
    expect(wrapper.find(".vd-navbar-actions").exists()).toBe(false);
  });

  it("wires the toggle aria contract to the menu id, closed by default", () => {
    const wrapper = factory();
    const toggle = wrapper.find(".vd-navbar-toggle");
    const menu = wrapper.find(".vd-navbar-menu");

    expect(toggle.attributes("aria-label")).toBe("Toggle navigation");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.classes()).not.toContain("is-active");

    const menuId = menu.attributes("id");
    expect(menuId).toBeTruthy();
    expect(toggle.attributes("aria-controls")).toBe(menuId);
    expect(menu.attributes("aria-hidden")).toBe("true");
    expect(menu.classes()).not.toContain("is-open");
  });

  it("maps variant/dark/position props to their vd-* classes", () => {
    expect(factory({ variant: "glass" }).find("nav").classes()).toContain(
      "vd-navbar-glass",
    );
    expect(factory({ variant: "transparent" }).find("nav").classes()).toContain(
      "vd-navbar-transparent",
    );
    expect(factory({ dark: true }).find("nav").classes()).toContain(
      "vd-navbar-dark",
    );
    expect(factory({ position: "fixed" }).find("nav").classes()).toContain(
      "vd-navbar-fixed",
    );
    expect(
      factory({ position: "fixed-bottom" }).find("nav").classes(),
    ).toContain("vd-navbar-fixed-bottom");
    expect(factory({ position: "sticky" }).find("nav").classes()).toContain(
      "vd-navbar-sticky",
    );
    // solid + static → none of the surface/position modifiers
    const plain = factory().find("nav").classes();
    expect(plain).not.toContain("vd-navbar-glass");
    expect(plain).not.toContain("vd-navbar-fixed");
  });

  it("toggles the open state machine (menu/toggle/body/overlay/aria)", async () => {
    const wrapper = factory();
    const toggle = wrapper.find(".vd-navbar-toggle");
    const menu = wrapper.find(".vd-navbar-menu");

    await toggle.trigger("click");

    expect(menu.classes()).toContain("is-open");
    expect(toggle.classes()).toContain("is-active");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(menu.attributes("aria-hidden")).toBe("false");
    expect(document.body.classList.contains("body-navbar-open")).toBe(true);
    expect(overlay()?.classList.contains("is-active")).toBe(true);
    expect(wrapper.emitted("open")).toHaveLength(1);
    expect(wrapper.emitted("toggle")?.[0]).toEqual([true]);

    await toggle.trigger("click");

    expect(menu.classes()).not.toContain("is-open");
    expect(toggle.classes()).not.toContain("is-active");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(document.body.classList.contains("body-navbar-open")).toBe(false);
    expect(overlay()?.classList.contains("is-active")).toBe(false);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("closes on Escape and returns focus to the toggle", async () => {
    const wrapper = factory({}, {}, { attachTo: document.body });
    const toggle = wrapper.find(".vd-navbar-toggle");
    await toggle.trigger("click");
    expect(wrapper.find(".vd-navbar-menu").classes()).toContain("is-open");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(wrapper.find(".vd-navbar-menu").classes()).not.toContain("is-open");
    expect(document.activeElement).toBe(toggle.element);
  });

  it("keeps the menu open on inner clicks but closes on an outside click", async () => {
    const wrapper = factory();
    await wrapper.find(".vd-navbar-toggle").trigger("click");
    expect(wrapper.find(".vd-navbar-menu").classes()).toContain("is-open");

    // a click inside the navbar (the brand link) must not close the menu
    wrapper
      .find(".brand-link")
      .element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(wrapper.find(".vd-navbar-menu").classes()).toContain("is-open");

    // a click landing outside the navbar closes it
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(wrapper.find(".vd-navbar-menu").classes()).not.toContain("is-open");
  });

  it("closes on overlay click", async () => {
    const wrapper = factory();
    await wrapper.find(".vd-navbar-toggle").trigger("click");
    expect(overlay()?.classList.contains("is-active")).toBe(true);

    overlay()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    expect(wrapper.find(".vd-navbar-menu").classes()).not.toContain("is-open");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("closes (debounced) when the viewport resizes past the breakpoint", async () => {
    vi.useFakeTimers();
    try {
      setViewportWidth(500);
      const wrapper = factory();
      await wrapper.find(".vd-navbar-toggle").trigger("click");
      expect(wrapper.find(".vd-navbar-menu").classes()).toContain("is-open");

      setViewportWidth(1200);
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(250);
      await nextTick();

      expect(wrapper.find(".vd-navbar-menu").classes()).not.toContain(
        "is-open",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("toggles a mobile dropdown submenu without navigating", async () => {
    setViewportWidth(500);
    const wrapper = factory();
    const dropdownLink = wrapper.find(".vd-navbar-dropdown > .vd-nav-link");
    const submenu = wrapper.find(".vd-navbar-dropdown-menu");

    const first = new MouseEvent("click", { bubbles: true, cancelable: true });
    dropdownLink.element.dispatchEvent(first);
    await nextTick();
    expect(first.defaultPrevented).toBe(true);
    expect(submenu.classes()).toContain("is-open");

    const second = new MouseEvent("click", { bubbles: true, cancelable: true });
    dropdownLink.element.dispatchEvent(second);
    await nextTick();
    expect(submenu.classes()).not.toContain("is-open");
  });

  it("closes the menu when a plain nav link is clicked (closeOnNavigate)", async () => {
    setViewportWidth(500);
    const wrapper = factory();
    await wrapper.find(".vd-navbar-toggle").trigger("click");
    expect(wrapper.find(".vd-navbar-menu").classes()).toContain("is-open");

    const plain = wrapper.findAll(".vd-nav-link")[0];
    plain.element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    expect(wrapper.find(".vd-navbar-menu").classes()).not.toContain("is-open");
  });

  it("keeps the menu open on link click when closeOnNavigate=false", async () => {
    setViewportWidth(500);
    const wrapper = factory({ closeOnNavigate: false });
    await wrapper.find(".vd-navbar-toggle").trigger("click");

    const plain = wrapper.findAll(".vd-nav-link")[0];
    plain.element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    expect(wrapper.find(".vd-navbar-menu").classes()).toContain("is-open");
  });

  it("delegates scrolled-state to useNavbarGlassScroll for glass", async () => {
    const wrapper = factory({ variant: "glass" });
    expect(wrapper.find("nav").classes()).toContain("vd-navbar-glass");
    expect(wrapper.find("nav").classes()).not.toContain("vd-navbar-scrolled");

    setScrollY(1000);
    window.dispatchEvent(new Event("scroll"));
    await nextTick();

    expect(wrapper.find("nav").classes()).toContain("vd-navbar-scrolled");
  });

  it("does not track scroll for the solid variant", async () => {
    const wrapper = factory();
    setScrollY(1000);
    window.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(wrapper.find("nav").classes()).not.toContain("vd-navbar-scrolled");
  });

  it("cleans up the body class and overlay on unmount", async () => {
    const wrapper = factory();
    await wrapper.find(".vd-navbar-toggle").trigger("click");
    expect(document.body.classList.contains("body-navbar-open")).toBe(true);
    expect(overlay()).not.toBeNull();

    wrapper.unmount();

    expect(document.body.classList.contains("body-navbar-open")).toBe(false);
    expect(overlay()).toBeNull();
  });
});
