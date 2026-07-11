import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import {
  defaultPreference,
  useThemePreference,
} from "../../src/composables/useTheme";

/**
 * Behaviour specs for the `useThemePreference()` singleton — the de-pinia'd
 * theme store shared by `VdThemeSwitcher` and `VdThemeCustomizer`
 * (theme-preference-singleton requirement). It mutates three global-ish
 * surfaces: the module-scope reactive state, `<html>` data-* attributes, and
 * localStorage. Every test resets all three.
 *
 * Because the state lives at module scope, tests that must observe the *first*
 * lazy initialization (or a fresh media-listener refcount) import a fresh copy
 * of the module via `vi.resetModules()`; the sharing/effect tests use the
 * statically imported singleton and set explicit values so they are
 * order-independent.
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

beforeEach(() => {
  window.localStorage.clear();
  cleanRoot();
});

afterEach(() => {
  window.localStorage.clear();
  cleanRoot();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useThemePreference shared singleton", () => {
  it("returns one reactive state shared across consumers", () => {
    const a = useThemePreference();
    const b = useThemePreference();
    // Same underlying reactive object.
    expect(b.state).toBe(a.state);
  });

  it("a setter updates the shared state, <html>, and storage", () => {
    const a = useThemePreference();
    const b = useThemePreference();

    a.setPrimary("indigo");

    expect(b.state.primary).toBe("indigo");
    expect(document.documentElement.getAttribute("data-primary")).toBe(
      "indigo",
    );
    expect(window.localStorage.getItem("vanduo-primary-color")).toBe("indigo");
  });

  it("each setter routes through applyPreference + persistPreference", () => {
    const api = useThemePreference();
    const root = document.documentElement;

    api.setNeutral("zinc");
    expect(root.getAttribute("data-neutral")).toBe("zinc");
    expect(window.localStorage.getItem("vanduo-neutral-color")).toBe("zinc");

    api.setRadius("0.125");
    expect(root.getAttribute("data-radius")).toBe("0.125");
    expect(root.style.getPropertyValue("--vd-radius-scale")).toBe("0.125");
    expect(window.localStorage.getItem("vanduo-radius")).toBe("0.125");

    api.setFont("lato");
    expect(root.getAttribute("data-font")).toBe("lato");
    expect(window.localStorage.getItem("vanduo-font-preference")).toBe("lato");

    api.setTheme("dark");
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem("vanduo-theme-preference")).toBe("dark");
  });

  it("setTheme re-derives a default primary for the new scheme", () => {
    const api = useThemePreference();
    // Start from the default light accent, then flip to dark.
    api.setPrimary(defaultPreference().primary); // light default accent
    api.setTheme("dark");
    // The default accent re-derives to the dark accent (black -> amber).
    expect(document.documentElement.getAttribute("data-primary")).toBe("amber");
    expect(api.state.primary).toBe("amber");
  });

  it("reset restores every field to defaultPreference() and re-applies", () => {
    const api = useThemePreference();
    api.setPrimary("teal");
    api.setRadius("0.125");
    api.setTheme("dark");

    api.reset();

    expect({ ...api.state }).toEqual(defaultPreference());
    // system default -> data-theme removed; radius/font back to defaults.
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem("vanduo-radius")).toBe(
      defaultPreference().radius,
    );
  });
});

describe("useThemePreference lazy client initialization", () => {
  it("hydrates from seeded storage on the first client access", async () => {
    // Fresh module so this is genuinely the first `useThemePreference()` call.
    window.localStorage.setItem("vanduo-radius", "0.25");
    window.localStorage.setItem("vanduo-neutral-color", "zinc");
    vi.resetModules();
    const mod = await import("../../src/composables/useTheme");

    const api = mod.useThemePreference();

    expect(api.state.radius).toBe("0.25");
    expect(api.state.neutral).toBe("zinc");
    // First access also syncs <html>.
    expect(document.documentElement.getAttribute("data-radius")).toBe("0.25");
  });
});

describe("useThemePreference media-listener refcount", () => {
  it("attaches on the first consumer mount and detaches with the last", async () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: add,
        removeEventListener: remove,
      }),
    );

    // Fresh module so the refcount starts at zero regardless of test order.
    vi.resetModules();
    const mod = await import("../../src/composables/useTheme");

    const Host = defineComponent({
      setup() {
        mod.useThemePreference();
        return () => null;
      },
    });

    const a = mount(Host);
    const b = mount(Host);
    await nextTick();
    // Attached exactly once, on the first consumer.
    expect(add).toHaveBeenCalledTimes(1);

    a.unmount();
    // One consumer remains -> not detached yet.
    expect(remove).toHaveBeenCalledTimes(0);

    b.unmount();
    // Last consumer gone -> detached once.
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
