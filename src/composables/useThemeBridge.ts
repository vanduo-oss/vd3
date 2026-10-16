import { onMounted, watch, type Ref } from "vue";
import { useThemePreference, type ThemeMode } from "./useTheme";

/**
 * Bridge an app-owned light/dark/system ref onto Vanduo's `data-theme` state.
 *
 * Vanduo keys dark mode off `[data-theme]` on `<html>`. When another system owns
 * the toggle (e.g. `@nuxtjs/color-mode`), pass its mode ref here and Vanduo
 * components follow it — the shared `useThemePreference()` singleton is updated
 * so `VdThemeCustomizer` and other consumers stay in sync.
 *
 *   const colorMode = useColorMode(); // app's own state
 *   useThemeBridge(computed(() => colorMode.preference as ThemeMode));
 */
export function useThemeBridge(mode: Ref<ThemeMode>): void {
  const theme = useThemePreference();
  const sync = (value: ThemeMode): void => {
    theme.setTheme(value);
  };
  onMounted(() => sync(mode.value));
  watch(() => mode.value, sync);
}
