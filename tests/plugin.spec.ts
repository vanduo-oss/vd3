import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "vue";
import VanduoVue, * as pluginModule from "../src/plugin";
import {
  DEFAULTS,
  DEFAULT_STORAGE_PREFIX,
  getStoragePrefix,
  getThemeDefaults,
  setStoragePrefix,
  setThemeDefaults,
} from "../src/composables/useTheme";

/**
 * The plugin's only side effects are applying `storagePrefix` /
 * `themeDefaults` through the module-scope singletons, so every test restores
 * those singletons to the generated baseline afterwards.
 */
afterEach(() => {
  setThemeDefaults({ ...DEFAULTS });
  setStoragePrefix(DEFAULT_STORAGE_PREFIX);
});

describe("VanduoVue plugin", () => {
  it("installs via app.use and applies themeDefaults overrides synchronously", () => {
    const app = createApp({ render: () => null });
    app.use(VanduoVue, {
      themeDefaults: { PRIMARY_DARK: "violet", THEME: "dark" },
    });

    expect(getThemeDefaults().PRIMARY_DARK).toBe("violet");
    expect(getThemeDefaults().THEME).toBe("dark");
    // Keys not in the override retain the generated baseline.
    expect(getThemeDefaults().PALETTE).toBe(DEFAULTS.PALETTE);
    expect(getThemeDefaults().FONT).toBe(DEFAULTS.FONT);
  });

  it("applies storagePrefix on install before themeDefaults", () => {
    const app = createApp({ render: () => null });
    app.use(VanduoVue, {
      storagePrefix: "labs-",
      themeDefaults: { PRIMARY_DARK: "blue" },
    });

    expect(getStoragePrefix()).toBe("labs-");
    expect(getThemeDefaults().PRIMARY_DARK).toBe("blue");
  });

  it("leaves the baseline defaults intact when installed without themeDefaults", () => {
    const app = createApp({ render: () => null });
    app.use(VanduoVue, {});
    expect(getThemeDefaults()).toEqual({ ...DEFAULTS });
    expect(getStoragePrefix()).toBe(DEFAULT_STORAGE_PREFIX);
  });

  it("does not export loadVanduoRuntime (the IIFE runtime loader is gone)", () => {
    const mod = pluginModule as Record<string, unknown>;
    expect(mod.loadVanduoRuntime).toBeUndefined();
    expect(Object.keys(pluginModule)).not.toContain("loadVanduoRuntime");
    expect(
      (VanduoVue as unknown as Record<string, unknown>).loadVanduoRuntime,
    ).toBeUndefined();
  });

  it("exposes VanduoVue as both the named and default export", () => {
    expect(pluginModule.VanduoVue).toBe(VanduoVue);
    expect(pluginModule.default).toBe(VanduoVue);
  });
});
