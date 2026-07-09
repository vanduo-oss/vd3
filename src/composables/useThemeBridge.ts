import { onMounted, watch, type Ref } from "vue";
import { applyPreference, loadPreference, type ThemeMode } from "./useTheme";

/**
 * Bridge an app-owned light/dark/system ref onto Vanduo's `data-theme` state.
 *
 * Vanduo keys dark mode off `[data-theme]` on `<html>`. When another system owns
 * the toggle (e.g. `@nuxtjs/color-mode`), pass its mode ref here and Vanduo
 * components follow it — `applyPreference()` also re-derives the default primary
 * accent for the active scheme. Re-syncs on mount and whenever the ref changes.
 *
 *   const colorMode = useColorMode(); // app's own state
 *   useThemeBridge(computed(() => colorMode.preference as ThemeMode));
 */
export function useThemeBridge(mode: Ref<ThemeMode>): void {
  const sync = (value: ThemeMode): void => {
    const prefs = loadPreference();
    prefs.theme = value;
    applyPreference(prefs);
  };
  onMounted(() => sync(mode.value));
  watch(() => mode.value, sync);
}
