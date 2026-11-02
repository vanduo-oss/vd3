import { onMounted, onUnmounted, watch, type Ref } from "vue";
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
 *   useThemeBridge(computed(() => colorMode.preference as ThemeMode), {
 *     syncDarkClass: true, // keep Tailwind / Nuxt UI `.dark` aligned
 *   });
 */
export interface UseThemeBridgeOptions {
  /**
   * Mirror the resolved scheme onto `document.documentElement` class `dark`.
   * Tailwind CSS and Nuxt UI read `.dark`; Vanduo reads `[data-theme]`.
   * `system` follows `prefers-color-scheme`.
   */
  syncDarkClass?: boolean;
}

const DARK_CLASS = "dark";

/** Whether `mode` should paint a dark document, including system preference. */
export function resolvedSchemeIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Toggle the Tailwind / Nuxt UI `dark` class from a Vanduo theme mode. */
export function applyDarkClass(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(
    DARK_CLASS,
    resolvedSchemeIsDark(mode),
  );
}

export function useThemeBridge(
  mode: Ref<ThemeMode>,
  options: UseThemeBridgeOptions = {},
): void {
  const theme = useThemePreference();

  const sync = (value: ThemeMode): void => {
    theme.setTheme(value);
    if (options.syncDarkClass) applyDarkClass(value);
  };

  let media: MediaQueryList | null = null;
  let hadDarkClass: boolean | null = null;
  const onScheme = (): void => {
    if (options.syncDarkClass && mode.value === "system") {
      applyDarkClass("system");
    }
  };

  onMounted(() => {
    if (options.syncDarkClass && typeof document !== "undefined") {
      hadDarkClass = document.documentElement.classList.contains(DARK_CLASS);
    }
    sync(mode.value);
    if (
      !options.syncDarkClass ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", onScheme);
  });

  onUnmounted(() => {
    media?.removeEventListener("change", onScheme);
    media = null;
    if (
      options.syncDarkClass &&
      hadDarkClass !== null &&
      typeof document !== "undefined"
    ) {
      document.documentElement.classList.toggle(DARK_CLASS, hadDarkClass);
      hadDarkClass = null;
    }
  });

  watch(() => mode.value, sync);

  if (options.syncDarkClass) {
    watch(
      () => theme.state.theme,
      (value) => applyDarkClass(value),
    );
  }
}
