import type { App, Plugin } from "vue";
import { setThemeDefaults, type ThemeDefaults } from "./composables/useTheme";

export interface VanduoVueOptions {
  /**
   * Site-specific theme default overrides, shallow-merged over the generic
   * generated baseline (e.g. `{ PRIMARY_DARK: "blue" }`). Applied
   * synchronously on install, before the theme model first reads defaults.
   */
  themeDefaults?: Partial<ThemeDefaults>;
}

/**
 * Vue plugin: `app.use(VanduoVue, options?)`. Applies any `themeDefaults`
 * overrides — and nothing else. vd3 is fully standalone: there is no
 * framework IIFE runtime to load (the old `loadVanduoRuntime` export is gone).
 */
export const VanduoVue: Plugin<VanduoVueOptions> = {
  install(_app: App, options: VanduoVueOptions = {}) {
    if (options.themeDefaults) {
      setThemeDefaults(options.themeDefaults);
    }
  },
};

export default VanduoVue;
