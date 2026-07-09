import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "vue";
import VanduoVue, * as pluginModule from "../src/plugin";
import {
  DEFAULTS,
  getThemeDefaults,
  setThemeDefaults,
} from "../src/composables/useTheme";

/**
 * The plugin's only side effect is applying `themeDefaults` through the
 * module-scope defaults singleton, so every test restores that singleton to the
 * generated baseline afterwards.
 */
afterEach(() => {
  setThemeDefaults({ ...DEFAULTS });
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

  it("leaves the baseline defaults intact when installed without themeDefaults", () => {
    const app = createApp({ render: () => null });
    app.use(VanduoVue, {});
    expect(getThemeDefaults()).toEqual({ ...DEFAULTS });
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
