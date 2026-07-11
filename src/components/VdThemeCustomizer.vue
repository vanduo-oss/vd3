<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useClickOutside } from "../composables/useClickOutside";
import {
  useThemePreference,
  FONT_OPTIONS,
  NEUTRAL_COLORS,
  PALETTE_OPTIONS,
  PRIMARY_COLORS,
  RADIUS_OPTIONS,
  type Palette,
  type RadiusOption,
} from "../composables/useTheme";

/**
 * VdThemeCustomizer — promoted from `vd2/src/overlays/VdThemeCustomizer.vue`.
 *
 * De-pinia'd onto the shared `useThemePreference()` singleton (the de-pinia'd
 * theme store). Every control writes through the singleton's setters, so the
 * `data-*` attribute contract and `vanduo-*` storage keys stay the single
 * source of truth and the customizer stays in sync with `VdThemeSwitcher` — a
 * dark-mode selection in the switcher is never clobbered by a color change here
 * (and vice versa).
 *
 * The font select absorbs the framework `font-switcher.js` capability: a
 * non-`system` choice stamps `data-font` (removed for `system`) and persists to
 * `vanduo-font-preference`, all via the theme layer.
 */
interface Props {
  /**
   * Render the palette-selection section (Open Color / Fibonacci). Restored to
   * the library default the vd2 docs site hid site-side.
   */
  showPalette?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showPalette: true,
});

// Shared theme singleton — the de-pinia'd replacement for vd2's theme store.
// `prefs` is its reactive state (SSR-safe seed, hydrated from storage on mount
// by the singleton), shared live with VdThemeSwitcher.
const theme = useThemePreference();
const prefs = theme.state;

const isOpen = ref(false);
const panelRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);

const PANEL_WIDTH = 320;
const MOBILE_BREAKPOINT = 768;

// Each control writes only the field it owns through the shared singleton, so a
// mutation never carries a stale copy of another control's field.
const setPalette = (palette: Palette): void => theme.setPalette(palette);
const setPrimary = (primary: string): void => theme.setPrimary(primary);
const setNeutral = (neutral: string): void => theme.setNeutral(neutral);
const setRadius = (radius: RadiusOption): void => theme.setRadius(radius);
const setFont = (font: string): void => theme.setFont(font);
const reset = (): void => theme.reset();

const resetPanelPosition = (): void => {
  const panel = panelRef.value;
  if (!panel) return;
  panel.style.top = "";
  panel.style.right = "";
  panel.style.left = "";
  panel.style.height = "";
  panel.style.maxHeight = "";
};

/** Align teleported panel under the navbar trigger (framework customizer parity). */
const positionPanel = (): void => {
  const panel = panelRef.value;
  const trigger = triggerRef.value;
  if (!panel || !trigger) return;

  if (window.innerWidth < MOBILE_BREAKPOINT) {
    resetPanelPosition();
    return;
  }

  const triggerRect = trigger.getBoundingClientRect();
  const panelTop = triggerRect.bottom + 8;
  const viewportWidth = window.innerWidth;
  let panelRight = viewportWidth - triggerRect.right;

  const panelLeft = viewportWidth - panelRight - PANEL_WIDTH;
  if (panelLeft < 8) {
    panelRight = viewportWidth - PANEL_WIDTH - 8;
  }

  panel.style.top = `${panelTop}px`;
  panel.style.right = `${panelRight}px`;
  panel.style.left = "";
  panel.style.height = "auto";
  panel.style.maxHeight = `calc(100vh - ${panelTop}px)`;
};

const open = (): void => {
  isOpen.value = true;
};
const close = (): void => {
  isOpen.value = false;
};
const toggle = (): void => {
  isOpen.value ? close() : open();
};

// Close when a click lands outside the panel (and isn't the trigger). The
// teleported panel + corner trigger made the backdrop unreliable, so this is
// the authoritative outside-click close.
useClickOutside([panelRef, triggerRef], close, isOpen);

const onFont = (event: Event): void => {
  setFont((event.target as HTMLSelectElement).value);
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape" && isOpen.value) close();
};

const onReposition = (): void => {
  positionPanel();
};

watch(isOpen, async (open) => {
  if (open) {
    await nextTick();
    positionPanel();
  }
});

onMounted(() => {
  // The shared singleton hydrates the preference from storage and syncs <html>
  // on mount; this component only owns its overlay/keyboard window listeners.
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("vd:open-customizer", open);
  window.addEventListener("resize", onReposition);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("vd:open-customizer", open);
  window.removeEventListener("resize", onReposition);
});

defineExpose({ open, close, toggle });
</script>

<template>
  <div class="vd-theme-customizer" :class="{ 'is-open': isOpen }">
    <button
      ref="triggerRef"
      type="button"
      class="vd-theme-customizer-trigger"
      data-theme-customizer-trigger
      aria-label="Open theme customizer"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <i class="ph ph-paint-roller" aria-hidden="true"></i>
    </button>

    <Teleport to="body">
      <div
        class="vd-theme-customizer-overlay"
        :class="{ 'is-active': isOpen }"
        @click="close"
      ></div>

      <aside
        ref="panelRef"
        class="vd-theme-customizer-panel"
        :class="{ 'is-open': isOpen }"
        role="dialog"
        aria-label="Theme customizer"
      >
        <div class="vd-theme-customizer-panel-inner">
          <div class="tc-header">
            <h3 class="tc-title">Customize Theme</h3>
            <button
              type="button"
              class="customizer-mobile-close"
              aria-label="Close"
              @click="close"
            >
              <i class="ph ph-x"></i>
            </button>
          </div>
          <div class="tc-body">
            <!--
              Palette switch (Open Color / Fibonacci). vd2 hid it site-side
              (Open Color everywhere); vd3 restores it by default via the
              `show-palette` prop so the library ships full customizer parity.
            -->
            <div v-if="showPalette" class="tc-section">
              <label class="tc-label">Palette</label>
              <div class="tc-palette-group">
                <button
                  v-for="p in PALETTE_OPTIONS"
                  :key="p.key"
                  type="button"
                  class="tc-palette-btn"
                  :class="{ 'is-active': prefs.palette === p.key }"
                  :data-palette="p.key"
                  :title="p.description"
                  @click="setPalette(p.key as Palette)"
                >
                  {{ p.name }}
                </button>
              </div>
            </div>

            <div class="tc-section">
              <label class="tc-label">Primary Color</label>
              <div class="tc-color-grid">
                <button
                  v-for="c in PRIMARY_COLORS"
                  :key="c.key"
                  type="button"
                  class="tc-color-swatch"
                  :class="{ 'is-active': prefs.primary === c.key }"
                  :data-color="c.key"
                  :style="{ '--vd-swatch-color': c.color }"
                  :title="c.name"
                  :aria-label="c.name"
                  @click="setPrimary(c.key)"
                ></button>
              </div>
            </div>

            <div class="tc-section">
              <label class="tc-label">Neutral Color</label>
              <div class="tc-neutral-grid">
                <button
                  v-for="c in NEUTRAL_COLORS"
                  :key="c.key"
                  type="button"
                  class="tc-neutral-swatch"
                  :class="{ 'is-active': prefs.neutral === c.key }"
                  :data-neutral="c.key"
                  :style="{ '--vd-swatch-color': c.color }"
                  :title="c.name"
                  @click="setNeutral(c.key)"
                >
                  <span>{{ c.name }}</span>
                </button>
              </div>
            </div>

            <div class="tc-section">
              <label class="tc-label">Border Radius</label>
              <div class="tc-radius-group">
                <button
                  v-for="r in RADIUS_OPTIONS"
                  :key="r"
                  type="button"
                  class="tc-radius-btn"
                  :class="{ 'is-active': prefs.radius === r }"
                  :data-radius="r"
                  @click="setRadius(r as RadiusOption)"
                >
                  {{ r }}
                </button>
              </div>
            </div>

            <div class="tc-section">
              <label class="tc-label">Font Family</label>
              <select
                class="tc-font-select"
                data-customizer-font
                :value="prefs.font"
                @change="onFont"
              >
                <option v-for="f in FONT_OPTIONS" :key="f.key" :value="f.key">
                  {{ f.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="tc-footer">
            <button
              type="button"
              class="customizer-reset btn btn-sm btn-outline"
              @click="reset"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </aside>
    </Teleport>
  </div>
</template>
