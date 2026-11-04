import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULTS,
  DEFAULT_STORAGE_PREFIX,
  FONT_OPTIONS,
  applyPreference,
  defaultPreference,
  defaultPrimary,
  getFontOptions,
  getStoragePrefix,
  getThemeDefaults,
  isDefaultPrimary,
  loadPreference,
  persistPreference,
  setFontOptions,
  setStoragePrefix,
  setThemeDefaults,
  type ThemePreference,
} from "../../src/composables/useTheme";

/**
 * Behaviour specs for the useTheme model. These functions mutate three pieces of
 * global-ish state: the module-scope `activeDefaults` singleton (via
 * setThemeDefaults), <html> attributes/inline style (applyPreference), and
 * localStorage (persistPreference). Every test resets all three so nothing bleeds
 * across specs or into the wider suite.
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
  root.style.removeProperty("--vd-font-family-sans");
  root.style.removeProperty("--vd-font-family-base");
  root.style.removeProperty("--vd-font-family-mono");
}

/** A full, valid preference using non-default values so nothing auto-re-derives. */
const basePrefs = (over: Partial<ThemePreference> = {}): ThemePreference => ({
  palette: "open-color",
  theme: "light",
  primary: "blue",
  neutral: "slate",
  radius: "0.25",
  font: "lato",
  ...over,
});

/** Stub the matchMedia jsdom lacks so the "system" branch is deterministic. */
function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches,
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  cleanRoot();
  setFontOptions(FONT_OPTIONS);
});

afterEach(() => {
  // Restore the defaults singleton to the generated baseline for the next test.
  setThemeDefaults({ ...DEFAULTS });
  setStoragePrefix(DEFAULT_STORAGE_PREFIX);
  window.localStorage.clear();
  cleanRoot();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useTheme defaults singleton", () => {
  it("getThemeDefaults returns the generated baseline initially", () => {
    expect(getThemeDefaults()).toEqual({ ...DEFAULTS });
  });

  it("getThemeDefaults returns a copy that cannot corrupt internal state", () => {
    // The returned object is a defensive shallow copy; the readonly type is
    // cast away here purely to prove a runtime mutation cannot leak back.
    const copy = getThemeDefaults() as unknown as Record<string, string>;
    copy.THEME = "dark";
    copy.FONT = "mutated";
    expect(getThemeDefaults().THEME).toBe(DEFAULTS.THEME);
    expect(getThemeDefaults().FONT).toBe(DEFAULTS.FONT);
  });

  it("setThemeDefaults shallow-merges overrides and leaves other keys intact", () => {
    const result = setThemeDefaults({ THEME: "dark", PRIMARY_DARK: "violet" });
    expect(result.THEME).toBe("dark");
    expect(result.PRIMARY_DARK).toBe("violet");
    // Untouched keys retain the baseline.
    expect(result.PALETTE).toBe(DEFAULTS.PALETTE);
    expect(result.FONT).toBe(DEFAULTS.FONT);
    expect(getThemeDefaults()).toEqual(result);
  });

  it("overrides flow through defaultPreference and defaultPrimary", () => {
    setThemeDefaults({ THEME: "dark", PRIMARY_DARK: "violet", FONT: "lato" });
    const pref = defaultPreference();
    expect(pref.theme).toBe("dark");
    expect(pref.font).toBe("lato");
    // dark scheme -> the overridden dark primary.
    expect(pref.primary).toBe("violet");
    expect(defaultPrimary("dark")).toBe("violet");
  });
});

describe("useTheme defaultPrimary / isDefaultPrimary", () => {
  it("returns PRIMARY_DARK for dark and PRIMARY_LIGHT for light", () => {
    expect(defaultPrimary("dark")).toBe(DEFAULTS.PRIMARY_DARK); // amber
    expect(defaultPrimary("light")).toBe(DEFAULTS.PRIMARY_LIGHT); // black
  });

  it("system falls to PRIMARY_LIGHT when matchMedia is absent (jsdom default)", () => {
    // No matchMedia stub: prefersDark() short-circuits to false.
    expect(defaultPrimary("system")).toBe(DEFAULTS.PRIMARY_LIGHT);
  });

  it("system uses PRIMARY_DARK when matchMedia reports dark", () => {
    stubMatchMedia(true);
    expect(defaultPrimary("system")).toBe(DEFAULTS.PRIMARY_DARK);
  });

  it("system uses PRIMARY_LIGHT when matchMedia reports light", () => {
    stubMatchMedia(false);
    expect(defaultPrimary("system")).toBe(DEFAULTS.PRIMARY_LIGHT);
  });

  it("isDefaultPrimary is true only for the two default accents", () => {
    expect(isDefaultPrimary("black")).toBe(true);
    expect(isDefaultPrimary("amber")).toBe(true);
    expect(isDefaultPrimary("blue")).toBe(false);
    expect(isDefaultPrimary("")).toBe(false);
  });
});

describe("useTheme applyPreference DOM side effects", () => {
  it("writes every data-* attribute and the --vd-radius-scale custom property", () => {
    applyPreference(basePrefs());
    const root = document.documentElement;
    expect(root.getAttribute("data-palette")).toBe("open-color");
    expect(root.getAttribute("data-primary")).toBe("blue");
    expect(root.getAttribute("data-neutral")).toBe("slate");
    expect(root.getAttribute("data-radius")).toBe("0.25");
    expect(root.getAttribute("data-font")).toBe("lato");
    expect(root.getAttribute("data-theme")).toBe("light");
    expect(root.style.getPropertyValue("--vd-radius-scale")).toBe("0.25");
  });

  it("font 'system' sets data-font='system' (not removed)", () => {
    document.documentElement.setAttribute("data-font", "stale");
    applyPreference(basePrefs({ font: "system" }));
    expect(document.documentElement.getAttribute("data-font")).toBe("system");
  });

  it("theme 'system' removes data-theme instead of setting it", () => {
    document.documentElement.setAttribute("data-theme", "stale");
    applyPreference(basePrefs({ theme: "system", primary: "blue" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("re-derives a default primary to the dark accent when theme is dark", () => {
    const prefs = basePrefs({ primary: "black", theme: "dark" });
    applyPreference(prefs);
    // black is the default light accent -> re-derived to the dark accent.
    expect(document.documentElement.getAttribute("data-primary")).toBe("amber");
    // applyPreference mutates the passed object in place.
    expect(prefs.primary).toBe("amber");
  });

  it("re-derives a default primary to the light accent when theme is light", () => {
    const prefs = basePrefs({ primary: "amber", theme: "light" });
    applyPreference(prefs);
    expect(document.documentElement.getAttribute("data-primary")).toBe("black");
    expect(prefs.primary).toBe("black");
  });

  it("leaves a non-default primary untouched across schemes", () => {
    applyPreference(basePrefs({ primary: "violet", theme: "dark" }));
    expect(document.documentElement.getAttribute("data-primary")).toBe(
      "violet",
    );
  });
});

describe("useTheme loadPreference", () => {
  it("returns baseline defaults when localStorage is empty", () => {
    const pref = loadPreference();
    expect(pref.palette).toBe(DEFAULTS.PALETTE);
    expect(pref.theme).toBe(DEFAULTS.THEME);
    expect(pref.neutral).toBe(DEFAULTS.NEUTRAL);
    expect(pref.radius).toBe(DEFAULTS.RADIUS);
    expect(pref.font).toBe(DEFAULTS.FONT);
    // theme defaults to system, matchMedia absent -> light accent.
    expect(pref.primary).toBe(DEFAULTS.PRIMARY_LIGHT);
  });

  it("reads persisted valid values back out of the vanduo-* keys", () => {
    window.localStorage.setItem("vanduo-palette", "fibonacci");
    window.localStorage.setItem("vanduo-theme-preference", "dark");
    window.localStorage.setItem("vanduo-radius", "0.125");
    window.localStorage.setItem("vanduo-neutral-color", "zinc");
    window.localStorage.setItem("vanduo-font-preference", "open-sans");
    window.localStorage.setItem("vanduo-primary-color", "teal");
    const pref = loadPreference();
    expect(pref.palette).toBe("fibonacci");
    expect(pref.theme).toBe("dark");
    expect(pref.radius).toBe("0.125");
    expect(pref.neutral).toBe("zinc");
    expect(pref.font).toBe("open-sans");
    expect(pref.primary).toBe("teal");
  });

  it("falls back to defaults for invalid palette / theme / radius", () => {
    window.localStorage.setItem("vanduo-palette", "not-a-palette");
    window.localStorage.setItem("vanduo-theme-preference", "not-a-mode");
    window.localStorage.setItem("vanduo-radius", "999");
    const pref = loadPreference();
    expect(pref.palette).toBe(DEFAULTS.PALETTE);
    expect(pref.theme).toBe(DEFAULTS.THEME);
    expect(pref.radius).toBe(DEFAULTS.RADIUS);
  });

  it("falls back to defaults for invalid primary / neutral / font", () => {
    window.localStorage.setItem("vanduo-primary-color", "not-a-color");
    window.localStorage.setItem("vanduo-neutral-color", "not-a-neutral");
    window.localStorage.setItem("vanduo-font-preference", "not-a-font");
    const pref = loadPreference();
    // Invalid primary falls back to the scheme default.
    expect(pref.primary).toBe(DEFAULTS.PRIMARY_LIGHT);
    expect(pref.neutral).toBe(DEFAULTS.NEUTRAL);
    expect(pref.font).toBe(DEFAULTS.FONT);
  });

  it("accepts valid primary / neutral / font values from storage", () => {
    window.localStorage.setItem("vanduo-primary-color", "emerald");
    window.localStorage.setItem("vanduo-neutral-color", "stone");
    window.localStorage.setItem("vanduo-font-preference", "nunito");
    const pref = loadPreference();
    expect(pref.primary).toBe("emerald");
    expect(pref.neutral).toBe("stone");
    expect(pref.font).toBe("nunito");
  });

  it("derives the primary fallback from the stored theme when no primary is saved", () => {
    window.localStorage.setItem("vanduo-theme-preference", "dark");
    // No vanduo-primary-color saved -> defaultPrimary("dark").
    expect(loadPreference().primary).toBe(DEFAULTS.PRIMARY_DARK);
  });
});

describe("useTheme persistPreference", () => {
  it("writes all six vanduo-* keys", () => {
    persistPreference(basePrefs());
    expect(window.localStorage.getItem("vanduo-palette")).toBe("open-color");
    expect(window.localStorage.getItem("vanduo-theme-preference")).toBe(
      "light",
    );
    expect(window.localStorage.getItem("vanduo-primary-color")).toBe("blue");
    expect(window.localStorage.getItem("vanduo-neutral-color")).toBe("slate");
    expect(window.localStorage.getItem("vanduo-radius")).toBe("0.25");
    expect(window.localStorage.getItem("vanduo-font-preference")).toBe("lato");
  });

  it("round-trips through loadPreference", () => {
    const prefs = basePrefs({ theme: "dark", primary: "teal" });
    persistPreference(prefs);
    const loaded = loadPreference();
    expect(loaded).toEqual(prefs);
  });
});

describe("useTheme storagePrefix", () => {
  it("defaults to vanduo-", () => {
    expect(getStoragePrefix()).toBe(DEFAULT_STORAGE_PREFIX);
    expect(DEFAULT_STORAGE_PREFIX).toBe("vanduo-");
  });

  it("rejects empty or non-string prefixes", () => {
    expect(() => setStoragePrefix("")).toThrow(/non-empty string/);
    expect(() => setStoragePrefix(null as unknown as string)).toThrow(
      /non-empty string/,
    );
    expect(getStoragePrefix()).toBe(DEFAULT_STORAGE_PREFIX);
  });

  it("remaps persist and load under a custom prefix", () => {
    setStoragePrefix("ts-school-");
    expect(getStoragePrefix()).toBe("ts-school-");

    persistPreference(basePrefs({ theme: "dark", primary: "teal" }));

    expect(window.localStorage.getItem("ts-school-palette")).toBe("open-color");
    expect(window.localStorage.getItem("ts-school-theme-preference")).toBe(
      "dark",
    );
    expect(window.localStorage.getItem("ts-school-primary-color")).toBe("teal");
    expect(window.localStorage.getItem("ts-school-neutral-color")).toBe(
      "slate",
    );
    expect(window.localStorage.getItem("ts-school-radius")).toBe("0.25");
    expect(window.localStorage.getItem("ts-school-font-preference")).toBe(
      "lato",
    );
    // Default namespace stays empty.
    expect(window.localStorage.getItem("vanduo-palette")).toBeNull();

    expect(loadPreference()).toEqual(
      basePrefs({ theme: "dark", primary: "teal" }),
    );
  });
});

describe("useTheme font catalog", () => {
  const brand = {
    key: "brand",
    name: "Brand",
    family: "Brand Sans, sans-serif",
    mono: "Brand Mono, monospace",
  };

  it("applies a custom family and mono stack and round-trips the key", () => {
    setFontOptions([brand]);
    window.localStorage.setItem("vanduo-font-preference", "brand");
    const pref = loadPreference();
    expect(pref.font).toBe("brand");
    applyPreference(pref);
    persistPreference(pref);
    expect(loadPreference().font).toBe("brand");
    const root = document.documentElement;
    expect(root.getAttribute("data-font")).toBe("brand");
    expect(root.style.getPropertyValue("--vd-font-family-sans")).toBe(
      "Brand Sans, sans-serif",
    );
    expect(root.style.getPropertyValue("--vd-font-family-base")).toBe(
      "Brand Sans, sans-serif",
    );
    expect(root.style.getPropertyValue("--vd-font-family-mono")).toBe(
      "Brand Mono, monospace",
    );
  });

  it("clears inline stacks for catalog fonts so data-font rules apply", () => {
    const root = document.documentElement;
    root.style.setProperty("--vd-font-family-sans", "Brand Sans, sans-serif");
    root.style.setProperty("--vd-font-family-base", "Brand Sans, sans-serif");
    root.style.setProperty("--vd-font-family-mono", "Brand Mono, monospace");
    applyPreference(basePrefs({ font: "lato" }));
    expect(root.getAttribute("data-font")).toBe("lato");
    expect(root.style.getPropertyValue("--vd-font-family-sans")).toBe("");
    expect(root.style.getPropertyValue("--vd-font-family-base")).toBe("");
    expect(root.style.getPropertyValue("--vd-font-family-mono")).toBe("");
  });

  it("restores the generated catalog when reset with FONT_OPTIONS", () => {
    setFontOptions([brand]);
    expect(setFontOptions(FONT_OPTIONS)).toBe(FONT_OPTIONS);
    expect(getFontOptions()).toBe(FONT_OPTIONS);
    window.localStorage.setItem("vanduo-font-preference", "brand");
    expect(loadPreference().font).toBe(DEFAULTS.FONT);
  });

  it("keeps system and the configured default when they are not in the list", () => {
    setThemeDefaults({ FONT: "nunito" });
    setFontOptions([{ key: "brand", name: "Brand" }]);
    window.localStorage.setItem("vanduo-font-preference", "nunito");
    expect(loadPreference().font).toBe("nunito");
    window.localStorage.setItem("vanduo-font-preference", "system");
    expect(loadPreference().font).toBe("system");
    window.localStorage.setItem("vanduo-font-preference", "lato");
    expect(loadPreference().font).toBe("nunito");
  });

  it("rejects font entries without a key and name", () => {
    expect(() => setFontOptions([{ key: "", name: "Nope" }])).toThrow(
      /key and name/,
    );
    expect(() =>
      setFontOptions([null as unknown as (typeof FONT_OPTIONS)[number]]),
    ).toThrow(/key and name/);
    expect(() =>
      setFontOptions(null as unknown as typeof FONT_OPTIONS),
    ).toThrow(/array of font/);
    expect(() =>
      setFontOptions([
        {
          key: "brand",
          name: "Brand",
          family: 1 as unknown as string,
        },
      ]),
    ).toThrow(/family must be a string/);
    expect(() =>
      setFontOptions([
        {
          key: "brand",
          name: "Brand",
          mono: 1 as unknown as string,
        },
      ]),
    ).toThrow(/mono must be a string/);
    expect(getFontOptions()).toBe(FONT_OPTIONS);
  });
});
