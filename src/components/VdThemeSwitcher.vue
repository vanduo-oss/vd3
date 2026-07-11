<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import {
  applyPreference,
  defaultPreference,
  loadPreference,
  persistPreference,
  type ThemeMode,
  type ThemePreference,
} from "../composables/useTheme";

/**
 * VdThemeSwitcher — the UI half of the light/dark/system theme control.
 *
 * Behavior source: `framework/js/components/theme-switcher.js`. The
 * persistence / apply / system-preference logic already lives in vd3's theme
 * layer (`loadPreference`/`applyPreference`/`persistPreference`), so this
 * component is purely the markup + interaction. It renders either the
 * vd2-proven icon menu (`menu`, default) or a single button that cycles
 * `system -> light -> dark`.
 */
interface Props {
  /** Icon-menu variant (recommended for navbars). When false, a single cycling button is rendered. */
  menu?: boolean;
  /** Menu alignment: "end" aligns the dropdown to the toggle's trailing edge. */
  align?: "start" | "end";
}

const props = withDefaults(defineProps<Props>(), {
  menu: true,
  align: "start",
});

const emit = defineEmits<{ change: [mode: ThemeMode] }>();

/** Cycle order + Phosphor icon / label mapping mirror the framework donor. */
const MODES = ["system", "light", "dark"] as const;

const ICONS: Record<ThemeMode, string> = {
  system: "ph-desktop",
  light: "ph-sun",
  dark: "ph-moon",
};

const LABELS: Record<ThemeMode, string> = {
  system: "Theme: System",
  light: "Theme: Light",
  dark: "Theme: Dark",
};

const OPTION_LABELS: Record<ThemeMode, string> = {
  system: "Use system preference",
  light: "Light theme",
  dark: "Dark theme",
};

// The full preference set is kept so every write carries all the fields the
// theme layer applies; only `theme` is mutated here. Hydrated from storage on
// mount (SSR-safe: no storage/DOM read at setup time).
const pref = ref<ThemePreference>(defaultPreference());
const open = ref(false);
const root = ref<HTMLElement | null>(null);

const mode = computed<ThemeMode>(() => pref.value.theme);
const currentLabel = computed(() => LABELS[mode.value]);
const iconClass = (m: ThemeMode): string => ICONS[m];

const commit = (m: ThemeMode): void => {
  pref.value = { ...pref.value, theme: m };
  // `applyPreference` re-derives the default primary for the new scheme and
  // writes the `data-*` attributes; `persistPreference` stores every key.
  applyPreference(pref.value);
  persistPreference(pref.value);
  emit("change", m);
};

const select = (m: ThemeMode): void => {
  commit(m);
  open.value = false;
};

const cycle = (): void => {
  const i = MODES.indexOf(mode.value);
  commit(MODES[(i + 1) % MODES.length] ?? "system");
};

const toggleMenu = (): void => {
  open.value = !open.value;
};

const optionEls = (): HTMLElement[] =>
  Array.from(
    root.value?.querySelectorAll<HTMLElement>("[data-theme-value]") ?? [],
  );

const focusOption = (index: number): void => {
  const options = optionEls();
  if (options.length === 0) return;
  const target = options[(index + options.length) % options.length];
  target?.focus();
};

const focusActiveOption = (): void => {
  const active = root.value?.querySelector<HTMLElement>(
    "[data-theme-value].is-active",
  );
  (active ?? optionEls()[0])?.focus();
};

const onToggleKeydown = (e: KeyboardEvent): void => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    open.value = true;
    void nextTick(focusActiveOption);
  } else if (e.key === "Escape" && open.value) {
    e.preventDefault();
    open.value = false;
  }
};

const onMenuKeydown = (e: KeyboardEvent): void => {
  const options = optionEls();
  const current = options.indexOf(document.activeElement as HTMLElement);
  if (e.key === "Escape") {
    e.preventDefault();
    open.value = false;
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    focusOption(current + 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    focusOption(current - 1);
  }
};

const onDocumentClick = (e: MouseEvent): void => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) {
    open.value = false;
  }
};

const onMediaChange = (): void => {
  // While tracking the system scheme, re-apply so the default primary follows.
  if (pref.value.theme === "system") applyPreference(pref.value);
};

let mq: MediaQueryList | null = null;

onMounted(() => {
  if (typeof window === "undefined") return;
  // Now on the client: hydrate the live preference from storage.
  pref.value = loadPreference();
  document.addEventListener("click", onDocumentClick);
  if (typeof window.matchMedia === "function") {
    mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", onMediaChange);
  }
});

onBeforeUnmount(() => {
  if (typeof window === "undefined") return;
  document.removeEventListener("click", onDocumentClick);
  if (mq) mq.removeEventListener("change", onMediaChange);
});
</script>

<template>
  <div
    v-if="menu"
    ref="root"
    class="vd-theme-switcher"
    :class="{
      'vd-theme-switcher-menu-end': align === 'end',
      'is-open': open,
    }"
    data-theme-ui="menu"
  >
    <button
      type="button"
      class="vd-theme-switcher-toggle"
      :aria-label="currentLabel"
      aria-haspopup="true"
      :aria-expanded="open ? 'true' : 'false'"
      @click="toggleMenu"
      @keydown="onToggleKeydown"
    >
      <i
        class="ph"
        :class="iconClass(mode)"
        data-theme-icon
        aria-hidden="true"
      />
    </button>
    <div
      class="vd-theme-switcher-menu"
      role="menu"
      :aria-hidden="open ? 'false' : 'true'"
      @keydown="onMenuKeydown"
    >
      <button
        v-for="m in MODES"
        :key="m"
        type="button"
        class="vd-theme-switcher-option"
        :class="{ 'is-active': mode === m }"
        role="menuitemradio"
        :data-theme-value="m"
        :aria-checked="mode === m ? 'true' : 'false'"
        :aria-label="OPTION_LABELS[m]"
        @click="select(m)"
      >
        <i class="ph" :class="iconClass(m)" aria-hidden="true" />
      </button>
    </div>
  </div>

  <button
    v-else
    ref="root"
    type="button"
    class="vd-theme-switcher-toggle"
    :aria-label="currentLabel"
    @click="cycle"
  >
    <i class="ph" :class="iconClass(mode)" data-theme-icon aria-hidden="true" />
  </button>
</template>
