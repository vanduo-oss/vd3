import type { App, Plugin } from "vue";
import {
  setStoragePrefix,
  setThemeDefaults,
  setThemePersistence,
  type ThemeDefaults,
} from "./composables/useTheme";

export interface VanduoVueOptions {
  /**
   * Site-specific theme default overrides, shallow-merged over the generic
   * generated baseline (e.g. `{ PRIMARY_DARK: "blue" }`). Applied
   * synchronously on install, before the theme model first reads defaults.
   */
  themeDefaults?: Partial<ThemeDefaults>;
  /**
   * localStorage key prefix for theme preferences (default `"vanduo-"`).
   * Applied synchronously on install, before the theme model first reads
   * storage. Example: `"ts-school-"` → `ts-school-theme-preference`, etc.
   */
  storagePrefix?: string;
  /** Automatic singleton storage reads/writes (default true). Set false when
   * the app owns saved preferences and controls are temporary previews.
   * Explicit loadPreference/persistPreference helpers remain available.
   */
  themePersistence?: boolean;
}

/**
 * Vue plugin: `app.use(VanduoVue, options?)`. Configures `storagePrefix`,
 * `themeDefaults` and automatic theme persistence. vd3 is fully standalone: there
 * is no framework IIFE runtime to load (the old `loadVanduoRuntime` export is
 * gone).
 */
export const VanduoVue: Plugin<VanduoVueOptions> = {
  install(_app: App, options: VanduoVueOptions = {}) {
    if (options.themePersistence !== undefined) {
      setThemePersistence(options.themePersistence);
    }
    if (options.storagePrefix !== undefined) {
      setStoragePrefix(options.storagePrefix);
    }
    if (options.themeDefaults) {
      setThemeDefaults(options.themeDefaults);
    }
  },
};

export default VanduoVue;
