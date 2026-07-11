import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import VdThemeCustomizer from "../../src/components/VdThemeCustomizer.vue";

/**
 * VdThemeCustomizer is the de-pinia'd promotion of the vd2 donor. It teleports
 * its overlay + panel to <body>, so structural assertions query `document`
 * (not the wrapper). Every control writes through the theme layer, so each test
 * resets the three shared side-effect surfaces: <html> attributes, the
 * `--vd-radius-scale` custom property, and localStorage.
 */

const ROOT_ATTRS = [
  "data-palette",
  "data-primary",
  "data-neutral",
  "data-radius",
  "data-font",
  "data-theme",
];

function cleanRoot(): void {
  const root = document.documentElement;
  ROOT_ATTRS.forEach((a) => root.removeAttribute(a));
  root.style.removeProperty("--vd-radius-scale");
}

const q = (sel: string): HTMLElement | null =>
  document.querySelector(sel) as HTMLElement | null;

const panel = (): HTMLElement | null => q(".vd-theme-customizer-panel");

/** Resolve after the deferred (setTimeout 0) click-outside attach has run. */
const settle = async (): Promise<void> => {
  await nextTick();
  await new Promise((r) => setTimeout(r, 0));
};

let wrapper: VueWrapper | null = null;

function mountCustomizer(
  props: Record<string, unknown> = {},
): VueWrapper<InstanceType<typeof VdThemeCustomizer>> {
  wrapper = mount(VdThemeCustomizer, {
    props,
    attachTo: document.body,
  }) as VueWrapper<InstanceType<typeof VdThemeCustomizer>>;
  return wrapper as VueWrapper<InstanceType<typeof VdThemeCustomizer>>;
}

async function openViaTrigger(w: VueWrapper): Promise<void> {
  await w.get(".vd-theme-customizer-trigger").trigger("click");
  await nextTick();
}

beforeEach(() => {
  window.localStorage.clear();
  cleanRoot();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  window.localStorage.clear();
  cleanRoot();
  vi.restoreAllMocks();
});

describe("VdThemeCustomizer structure + a11y", () => {
  it("renders the root, paint-roller trigger, teleported overlay + dialog panel", () => {
    const w = mountCustomizer();

    const root = w.get(".vd-theme-customizer");
    expect(root.classes()).not.toContain("is-open");

    const trigger = w.get(".vd-theme-customizer-trigger");
    expect(trigger.attributes("type")).toBe("button");
    expect(trigger.attributes("aria-label")).toBe("Open theme customizer");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.find("i.ph-paint-roller").exists()).toBe(true);

    // Teleported to <body> — not inside the wrapper element.
    expect(q(".vd-theme-customizer-overlay")).not.toBeNull();
    const p = panel();
    expect(p).not.toBeNull();
    expect(p!.getAttribute("role")).toBe("dialog");
    expect(p!.getAttribute("aria-label")).toBe("Theme customizer");
    expect(p!.classList.contains("is-open")).toBe(false);
  });

  it("renders every tc-* control section", () => {
    mountCustomizer();
    expect(q(".tc-color-grid")).not.toBeNull();
    expect(document.querySelectorAll(".tc-color-swatch").length).toBe(18);
    expect(q(".tc-neutral-grid")).not.toBeNull();
    expect(document.querySelectorAll(".tc-neutral-swatch").length).toBe(6);
    expect(q(".tc-radius-group")).not.toBeNull();
    expect(document.querySelectorAll(".tc-radius-btn").length).toBe(5);
    expect(q(".tc-font-select")).not.toBeNull();
    expect(document.querySelectorAll(".tc-font-select option").length).toBe(5);
    expect(q(".customizer-reset")).not.toBeNull();
  });
});

describe("VdThemeCustomizer open / close", () => {
  it("toggles open on trigger click and marks aria-expanded + is-open", async () => {
    const w = mountCustomizer();
    await openViaTrigger(w);

    expect(
      w.get(".vd-theme-customizer-trigger").attributes("aria-expanded"),
    ).toBe("true");
    expect(w.get(".vd-theme-customizer").classes()).toContain("is-open");
    expect(panel()!.classList.contains("is-open")).toBe(true);
    expect(
      q(".vd-theme-customizer-overlay")!.classList.contains("is-active"),
    ).toBe(true);
  });

  it("closes on Escape", async () => {
    const w = mountCustomizer();
    await openViaTrigger(w);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(panel()!.classList.contains("is-open")).toBe(false);
    expect(
      w.get(".vd-theme-customizer-trigger").attributes("aria-expanded"),
    ).toBe("false");
  });

  it("closes on overlay click", async () => {
    const w = mountCustomizer();
    await openViaTrigger(w);

    q(".vd-theme-customizer-overlay")!.click();
    await nextTick();

    expect(panel()!.classList.contains("is-open")).toBe(false);
  });

  it("closes on an outside pointerdown (trigger excluded)", async () => {
    const w = mountCustomizer();
    await openViaTrigger(w);
    await settle();

    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await nextTick();

    expect(panel()!.classList.contains("is-open")).toBe(false);
  });

  it("opens on the vd:open-customizer window event", async () => {
    mountCustomizer();
    window.dispatchEvent(new Event("vd:open-customizer"));
    await nextTick();
    expect(panel()!.classList.contains("is-open")).toBe(true);
  });

  it("exposes open / close / toggle", async () => {
    const w = mountCustomizer();
    const vm = w.vm as unknown as {
      open: () => void;
      close: () => void;
      toggle: () => void;
    };

    vm.open();
    await nextTick();
    expect(panel()!.classList.contains("is-open")).toBe(true);

    vm.toggle();
    await nextTick();
    expect(panel()!.classList.contains("is-open")).toBe(false);
  });
});

describe("VdThemeCustomizer controls write through the theme layer", () => {
  it("a primary swatch sets data-primary, persists, and marks is-active", async () => {
    mountCustomizer();
    const swatch = q('.tc-color-swatch[data-color="blue"]')!;
    swatch.click();
    await nextTick();

    expect(document.documentElement.getAttribute("data-primary")).toBe("blue");
    expect(window.localStorage.getItem("vanduo-primary-color")).toBe("blue");
    expect(swatch.classList.contains("is-active")).toBe(true);
  });

  it("a neutral swatch sets data-neutral and persists", async () => {
    mountCustomizer();
    const swatch = q('.tc-neutral-swatch[data-neutral="zinc"]')!;
    swatch.click();
    await nextTick();

    expect(document.documentElement.getAttribute("data-neutral")).toBe("zinc");
    expect(window.localStorage.getItem("vanduo-neutral-color")).toBe("zinc");
    expect(swatch.classList.contains("is-active")).toBe(true);
  });

  it("a radius button sets data-radius, --vd-radius-scale, and persists", async () => {
    mountCustomizer();
    const btn = q('.tc-radius-btn[data-radius="0.125"]')!;
    btn.click();
    await nextTick();

    const root = document.documentElement;
    expect(root.getAttribute("data-radius")).toBe("0.125");
    expect(root.style.getPropertyValue("--vd-radius-scale")).toBe("0.125");
    expect(window.localStorage.getItem("vanduo-radius")).toBe("0.125");
    expect(btn.classList.contains("is-active")).toBe(true);
  });

  it("the font select absorbs font-switcher: sets then removes data-font", async () => {
    mountCustomizer();
    const select = q(".tc-font-select") as HTMLSelectElement;

    select.value = "lato";
    select.dispatchEvent(new Event("change"));
    await nextTick();
    expect(document.documentElement.getAttribute("data-font")).toBe("lato");
    expect(window.localStorage.getItem("vanduo-font-preference")).toBe("lato");

    select.value = "system";
    select.dispatchEvent(new Event("change"));
    await nextTick();
    expect(document.documentElement.hasAttribute("data-font")).toBe(false);
    expect(window.localStorage.getItem("vanduo-font-preference")).toBe(
      "system",
    );
  });

  it("reset restores the defaults (radius, font, storage)", async () => {
    mountCustomizer();
    q('.tc-radius-btn[data-radius="0.125"]')!.click();
    q(".tc-font-select") &&
      ((): void => {
        const s = q(".tc-font-select") as HTMLSelectElement;
        s.value = "lato";
        s.dispatchEvent(new Event("change"));
      })();
    await nextTick();

    q(".customizer-reset")!.click();
    await nextTick();

    const root = document.documentElement;
    expect(root.getAttribute("data-radius")).toBe("0.5"); // DEFAULTS.RADIUS
    expect(root.getAttribute("data-font")).toBe("ubuntu"); // DEFAULTS.FONT
    expect(window.localStorage.getItem("vanduo-radius")).toBe("0.5");
    expect(window.localStorage.getItem("vanduo-font-preference")).toBe(
      "ubuntu",
    );
  });
});

describe("VdThemeCustomizer show-palette prop", () => {
  it("renders the palette section by default (show-palette true)", async () => {
    mountCustomizer();
    expect(q(".tc-palette-group")).not.toBeNull();
    expect(document.querySelectorAll(".tc-palette-btn").length).toBe(2);

    const fib = q('.tc-palette-btn[data-palette="fibonacci"]')!;
    fib.click();
    await nextTick();
    expect(document.documentElement.getAttribute("data-palette")).toBe(
      "fibonacci",
    );
    expect(window.localStorage.getItem("vanduo-palette")).toBe("fibonacci");
    expect(fib.classList.contains("is-active")).toBe(true);
  });

  it("omits the palette section when show-palette is false", () => {
    mountCustomizer({ showPalette: false });
    expect(q(".tc-palette-group")).toBeNull();
    // Other sections still render.
    expect(q(".tc-color-grid")).not.toBeNull();
  });
});

describe("VdThemeCustomizer lifecycle cleanup", () => {
  it("removes its window listeners on unmount", () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const w = mountCustomizer();
    w.unmount();
    wrapper = null;

    const events = spy.mock.calls.map((c) => c[0]);
    expect(events).toContain("keydown");
    expect(events).toContain("vd:open-customizer");
    expect(events).toContain("resize");
  });
});
