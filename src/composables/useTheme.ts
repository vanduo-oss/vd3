/**
 * Theme model for the vd3 line. Token *data* (palette/neutral/radius/font
 * options + defaults) is generated in-repo by `scripts/build-tokens.mjs` into
 * `src/theme/generated/tokens.data.ts` — the design-system source of truth
 * derived from `tokens/*.tokens.json`. This file keeps only the Vue-side
 * application logic that drives the same `data-*` attributes the vd3 CSS
 * reads. Re-exports the generated data so consumers keep a single import
 * surface (the package root).
 *
 * Defaults are the generic Vanduo baseline from the generated data.
 * Applications that need site-specific defaults (e.g. a different default dark
 * primary) override them with `setThemeDefaults()` — typically via
 * `app.use(VanduoVue, { themeDefaults })` — before the theme model first reads
 * them.
 */
import {
  DEFAULTS as CORE_DEFAULTS,
  FONT_OPTIONS,
  NEUTRAL_COLORS,
  PALETTE_OPTIONS,
  PRIMARY_COLORS,
  RADIUS_OPTIONS,
  THEME_MODES,
  type ColorDef,
  type FontDef,
  type Palette,
  type PaletteDef,
  type RadiusOption,
  type ThemeDefaults,
  type ThemeMode,
} from "../theme/generated/tokens.data";

export type {
  ColorDef,
  FontDef,
  Palette,
  PaletteDef,
  RadiusOption,
  ThemeDefaults,
  ThemeMode,
};
export {
  FONT_OPTIONS,
  NEUTRAL_COLORS,
  PALETTE_OPTIONS,
  PRIMARY_COLORS,
  RADIUS_OPTIONS,
  THEME_MODES,
};
// The generated baseline + resolved token map, re-exported so the package
// root is the one JS import surface for token data (old core-package
// consumers: `import { DEFAULTS, tokens } from "@vanduo-oss/vd3"`).
export { DEFAULTS, tokens } from "../theme/generated/tokens.data";

/**
 * Effective theme defaults: the generic core baseline, plus any site overrides
 * applied via `setThemeDefaults()`. Read lazily by the helpers below so a single
 * bootstrap-time override is reflected everywhere.
 */
let activeDefaults: ThemeDefaults = { ...CORE_DEFAULTS };

/**
 * The defaults currently in effect (core baseline merged with overrides).
 * Returns a shallow copy so `setThemeDefaults()` stays the only mutation path —
 * callers can't accidentally corrupt the shared state via the returned object.
 */
export const getThemeDefaults = (): ThemeDefaults => ({ ...activeDefaults });

/**
 * Override site-specific theme defaults. Shallow-merges over the current
 * defaults and returns the result. Call once during app bootstrap, before the
 * theme store first reads defaults (e.g.
 * `app.use(VanduoVue, { themeDefaults })`).
 */
export const setThemeDefaults = (
  overrides: Partial<ThemeDefaults>,
): ThemeDefaults => {
  activeDefaults = { ...activeDefaults, ...overrides };
  return activeDefaults;
};

const PALETTE_KEYS = PALETTE_OPTIONS.map((p) => p.key);
const isPalette = (value: string): value is Palette =>
  (PALETTE_KEYS as readonly string[]).includes(value);

export interface ThemePreference {
  palette: Palette;
  theme: ThemeMode;
  primary: string;
  neutral: string;
  radius: RadiusOption;
  font: string;
}

const STORAGE_KEYS = {
  PALETTE: "vanduo-palette",
  PRIMARY: "vanduo-primary-color",
  NEUTRAL: "vanduo-neutral-color",
  RADIUS: "vanduo-radius",
  FONT: "vanduo-font-preference",
  THEME: "vanduo-theme-preference",
} as const;

const isClient = (): boolean => typeof window !== "undefined";

const prefersDark = (): boolean => {
  if (!isClient() || typeof window.matchMedia !== "function") return false;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  return !!mq && mq.matches;
};

/** Default primary depends on the effective light/dark scheme. */
export const defaultPrimary = (theme: ThemeMode): string => {
  if (theme === "system") {
    return prefersDark()
      ? activeDefaults.PRIMARY_DARK
      : activeDefaults.PRIMARY_LIGHT;
  }
  return theme === "dark"
    ? activeDefaults.PRIMARY_DARK
    : activeDefaults.PRIMARY_LIGHT;
};

const read = (key: string, fallback: string): string => {
  if (!isClient()) return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: string): void => {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage may be unavailable (private mode, quota) */
  }
};

export const defaultPreference = (): ThemePreference => ({
  palette: activeDefaults.PALETTE,
  theme: activeDefaults.THEME,
  primary: defaultPrimary(activeDefaults.THEME),
  neutral: activeDefaults.NEUTRAL,
  radius: activeDefaults.RADIUS,
  font: activeDefaults.FONT,
});

export const loadPreference = (): ThemePreference => {
  const theme = read(STORAGE_KEYS.THEME, activeDefaults.THEME) as ThemeMode;
  const radius = read(
    STORAGE_KEYS.RADIUS,
    activeDefaults.RADIUS,
  ) as RadiusOption;
  const palette = read(STORAGE_KEYS.PALETTE, activeDefaults.PALETTE);
  return {
    palette: isPalette(palette) ? palette : activeDefaults.PALETTE,
    theme: THEME_MODES.includes(theme) ? theme : activeDefaults.THEME,
    primary: read(STORAGE_KEYS.PRIMARY, defaultPrimary(theme)),
    neutral: read(STORAGE_KEYS.NEUTRAL, activeDefaults.NEUTRAL),
    radius: RADIUS_OPTIONS.includes(radius) ? radius : activeDefaults.RADIUS,
    font: read(STORAGE_KEYS.FONT, activeDefaults.FONT),
  };
};

const isDefaultPrimary = (primary: string): boolean =>
  primary === activeDefaults.PRIMARY_LIGHT ||
  primary === activeDefaults.PRIMARY_DARK;

/** Apply a full preference set to <html>, mirroring framework attribute logic. */
export const applyPreference = (prefs: ThemePreference): void => {
  if (!isClient()) return;
  const root = document.documentElement;

  // Keep auto-default primary aligned with the active scheme (black <-> blue).
  if (isDefaultPrimary(prefs.primary)) {
    prefs.primary = defaultPrimary(prefs.theme);
  }

  root.setAttribute("data-palette", prefs.palette);
  root.setAttribute("data-primary", prefs.primary);
  root.setAttribute("data-neutral", prefs.neutral);
  root.setAttribute("data-radius", prefs.radius);
  root.style.setProperty("--vd-radius-scale", prefs.radius);

  if (prefs.font === "system") {
    root.removeAttribute("data-font");
  } else {
    root.setAttribute("data-font", prefs.font);
  }

  if (prefs.theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", prefs.theme);
  }
};

export const persistPreference = (prefs: ThemePreference): void => {
  write(STORAGE_KEYS.PALETTE, prefs.palette);
  write(STORAGE_KEYS.THEME, prefs.theme);
  write(STORAGE_KEYS.PRIMARY, prefs.primary);
  write(STORAGE_KEYS.NEUTRAL, prefs.neutral);
  write(STORAGE_KEYS.RADIUS, prefs.radius);
  write(STORAGE_KEYS.FONT, prefs.font);
};

export { isDefaultPrimary };
