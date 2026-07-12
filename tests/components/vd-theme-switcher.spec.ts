import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import VdThemeSwitcher from "../../src/components/VdThemeSwitcher.vue";
import VdThemeCustomizer from "../../src/components/VdThemeCustomizer.vue";

const THEME_KEY = "vanduo-theme-preference";

const resetEnv = (): void => {
  window.localStorage.clear();
  const root = document.documentElement;
  for (const attr of [
    "data-theme",
    "data-palette",
    "data-primary",
    "data-neutral",
    "data-radius",
    "data-font",
  ]) {
    root.removeAttribute(attr);
  }
  root.style.removeProperty("--vd-radius-scale");
};

beforeEach(resetEnv);
afterEach(resetEnv);

describe("VdThemeSwitcher — menu variant", () => {
  it("renders the vd2 menu contract with system active by default", () => {
    const wrapper = mount(VdThemeSwitcher);

    const rootEl = wrapper.get(".vd-theme-switcher");
    expect(rootEl.attributes("data-theme-ui")).toBe("menu");
    expect(rootEl.classes()).not.toContain("is-open");

    const toggle = wrapper.get("button.vd-theme-switcher-toggle");
    expect(toggle.attributes("type")).toBe("button");
    expect(toggle.attributes("aria-haspopup")).toBe("true");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-label")).toBe("Theme: System");
    // Toggle icon reflects the current mode and is sync-tagged.
    const toggleIcon = toggle.get("i[data-theme-icon]");
    expect(toggleIcon.classes()).toContain("ph");
    expect(toggleIcon.classes()).toContain("ph-desktop");
    expect(toggleIcon.attributes("aria-hidden")).toBe("true");

    const menu = wrapper.get(".vd-theme-switcher-menu");
    expect(menu.attributes("role")).toBe("menu");
    expect(menu.attributes("aria-hidden")).toBe("true");

    // Three menuitemradio options in donor order with icon mapping.
    const options = wrapper.findAll(".vd-theme-switcher-option");
    expect(options.map((o) => o.attributes("data-theme-value"))).toEqual([
      "system",
      "light",
      "dark",
    ]);
    for (const opt of options) {
      expect(opt.attributes("role")).toBe("menuitemradio");
    }
    expect(options[0]!.get("i").classes()).toContain("ph-desktop");
    expect(options[1]!.get("i").classes()).toContain("ph-sun");
    expect(options[2]!.get("i").classes()).toContain("ph-moon");

    // The active (system) option is flagged via is-active + aria-checked.
    expect(options[0]!.classes()).toContain("is-active");
    expect(options[0]!.attributes("aria-checked")).toBe("true");
    expect(options[1]!.attributes("aria-checked")).toBe("false");
    expect(options[2]!.classes()).not.toContain("is-active");
  });

  it("opens and closes the menu via the toggle, reflecting aria-expanded", async () => {
    const wrapper = mount(VdThemeSwitcher, { attachTo: document.body });
    const toggle = wrapper.get(".vd-theme-switcher-toggle");

    await toggle.trigger("click");
    expect(wrapper.get(".vd-theme-switcher").classes()).toContain("is-open");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(
      wrapper.get(".vd-theme-switcher-menu").attributes("aria-hidden"),
    ).toBe("false");

    await toggle.trigger("click");
    expect(wrapper.get(".vd-theme-switcher").classes()).not.toContain(
      "is-open",
    );
    expect(toggle.attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });

  it("selecting a mode applies data-theme, persists, emits, and closes", async () => {
    const wrapper = mount(VdThemeSwitcher);
    await wrapper.get(".vd-theme-switcher-toggle").trigger("click");

    await wrapper.get('[data-theme-value="dark"]').trigger("click");

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(wrapper.emitted("change")).toEqual([["dark"]]);
    // Menu closes after a selection.
    expect(wrapper.get(".vd-theme-switcher").classes()).not.toContain(
      "is-open",
    );

    // Active flag + toggle icon/label move to the chosen mode.
    const dark = wrapper.get('[data-theme-value="dark"]');
    expect(dark.classes()).toContain("is-active");
    expect(dark.attributes("aria-checked")).toBe("true");
    const toggle = wrapper.get(".vd-theme-switcher-toggle");
    expect(toggle.attributes("aria-label")).toBe("Theme: Dark");
    expect(toggle.get("i[data-theme-icon]").classes()).toContain("ph-moon");
  });

  it("selecting system removes data-theme from <html>", async () => {
    const wrapper = mount(VdThemeSwitcher);
    await wrapper.get('[data-theme-value="light"]').trigger("click");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    await wrapper.get('[data-theme-value="system"]').trigger("click");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem(THEME_KEY)).toBe("system");
  });

  it("hydrates the active mode from stored preference on mount", async () => {
    window.localStorage.setItem(THEME_KEY, "dark");
    const wrapper = mount(VdThemeSwitcher);
    // Hydration happens in onMounted; let the reactive re-render flush.
    await flushPromises();

    expect(
      wrapper.get(".vd-theme-switcher-toggle").attributes("aria-label"),
    ).toBe("Theme: Dark");
    const dark = wrapper.get('[data-theme-value="dark"]');
    expect(dark.classes()).toContain("is-active");
    expect(dark.attributes("aria-checked")).toBe("true");
  });

  it("closes on Escape from the menu", async () => {
    const wrapper = mount(VdThemeSwitcher, { attachTo: document.body });
    await wrapper.get(".vd-theme-switcher-toggle").trigger("click");
    expect(wrapper.get(".vd-theme-switcher").classes()).toContain("is-open");

    await wrapper.get(".vd-theme-switcher-menu").trigger("keydown", {
      key: "Escape",
    });
    expect(wrapper.get(".vd-theme-switcher").classes()).not.toContain(
      "is-open",
    );
    wrapper.unmount();
  });

  it("opening by click moves focus to the active option", async () => {
    // Hydrate to a non-default active mode so we prove focus lands on the
    // *active* menuitemradio (donor `openMenu`), not merely the first.
    window.localStorage.setItem(THEME_KEY, "dark");
    const wrapper = mount(VdThemeSwitcher, { attachTo: document.body });
    await flushPromises();

    const toggle = wrapper.get(".vd-theme-switcher-toggle");
    await toggle.trigger("click");
    await nextTick();

    expect(wrapper.get(".vd-theme-switcher").classes()).toContain("is-open");
    const darkOption = wrapper.get('[data-theme-value="dark"]');
    expect(darkOption.classes()).toContain("is-active");
    expect(document.activeElement).toBe(darkOption.element);
    wrapper.unmount();
  });

  it("Escape from the open menu returns focus to the toggle button", async () => {
    const wrapper = mount(VdThemeSwitcher, { attachTo: document.body });
    const toggle = wrapper.get(".vd-theme-switcher-toggle");
    await toggle.trigger("click");
    await nextTick();
    // Focus starts inside the menu (on the active option) after opening.
    expect(document.activeElement).not.toBe(toggle.element);

    await wrapper.get(".vd-theme-switcher-menu").trigger("keydown", {
      key: "Escape",
    });
    await nextTick();

    expect(wrapper.get(".vd-theme-switcher").classes()).not.toContain(
      "is-open",
    );
    expect(toggle.attributes("aria-expanded")).toBe("false");
    // Focus is not stranded on the now-hidden menu — it returns to the toggle.
    expect(document.activeElement).toBe(toggle.element);
    wrapper.unmount();
  });

  it("align=end adds the menu-end modifier class", () => {
    const wrapper = mount(VdThemeSwitcher, { props: { align: "end" } });
    expect(wrapper.get(".vd-theme-switcher").classes()).toContain(
      "vd-theme-switcher-menu-end",
    );
  });
});

describe("VdThemeSwitcher — cross-component sync (shared singleton)", () => {
  const q = (sel: string): HTMLElement | null =>
    document.querySelector(sel) as HTMLElement | null;

  it("a customizer primary change does not revert a switcher dark selection", async () => {
    const switcher = mount(VdThemeSwitcher, { attachTo: document.body });
    const customizer = mount(VdThemeCustomizer, { attachTo: document.body });

    // Switcher -> dark.
    await switcher.get('[data-theme-value="dark"]').trigger("click");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");

    // Customizer -> primary color: must NOT clobber the dark selection (the
    // pre-singleton regression, where each control held a stale full snapshot).
    q('.tc-color-swatch[data-color="blue"]')!.click();
    await nextTick();

    expect(document.documentElement.getAttribute("data-primary")).toBe("blue");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(window.localStorage.getItem("vanduo-primary-color")).toBe("blue");

    switcher.unmount();
    customizer.unmount();
    document.body.innerHTML = "";
  });

  it("a switcher mode change does not clobber a customizer primary color", async () => {
    const switcher = mount(VdThemeSwitcher, { attachTo: document.body });
    const customizer = mount(VdThemeCustomizer, { attachTo: document.body });

    q('.tc-color-swatch[data-color="teal"]')!.click();
    await nextTick();
    expect(window.localStorage.getItem("vanduo-primary-color")).toBe("teal");

    await switcher.get('[data-theme-value="light"]').trigger("click");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    // The non-default primary survives the scheme change (shared singleton).
    expect(document.documentElement.getAttribute("data-primary")).toBe("teal");
    expect(window.localStorage.getItem("vanduo-primary-color")).toBe("teal");

    switcher.unmount();
    customizer.unmount();
    document.body.innerHTML = "";
  });
});

describe("VdThemeSwitcher — cycle variant", () => {
  it("renders a single toggle button (no menu)", () => {
    const wrapper = mount(VdThemeSwitcher, { props: { menu: false } });
    expect(wrapper.find(".vd-theme-switcher").exists()).toBe(false);
    expect(wrapper.find(".vd-theme-switcher-menu").exists()).toBe(false);

    const btn = wrapper.get("button.vd-theme-switcher-toggle");
    expect(btn.attributes("type")).toBe("button");
    expect(btn.attributes("aria-label")).toBe("Theme: System");
    expect(btn.get("i[data-theme-icon]").classes()).toContain("ph-desktop");
  });

  it("cycles system -> light -> dark -> system on each click", async () => {
    const wrapper = mount(VdThemeSwitcher, { props: { menu: false } });
    const btn = wrapper.get("button.vd-theme-switcher-toggle");

    await btn.trigger("click"); // system -> light
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    expect(btn.attributes("aria-label")).toBe("Theme: Light");
    expect(btn.get("i[data-theme-icon]").classes()).toContain("ph-sun");

    await btn.trigger("click"); // light -> dark
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(btn.get("i[data-theme-icon]").classes()).toContain("ph-moon");

    await btn.trigger("click"); // dark -> system
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem(THEME_KEY)).toBe("system");
    expect(btn.attributes("aria-label")).toBe("Theme: System");

    expect(wrapper.emitted("change")).toEqual([
      ["light"],
      ["dark"],
      ["system"],
    ]);
  });
});
