<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
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
import type {
  SwatchFanDirection,
  SwatchFanDirectionOption,
  ThemeCustomizerVariant,
} from "../types";

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
   * the library default the vd2 docs site hid site-side. `panel` only.
   */
  showPalette?: boolean;
  /**
   * `panel` is the full editor. `swatches` swaps it for a hinged primary-only
   * fan hinged at the trigger — dock / toolbar chrome that has no room for a
   * 320px panel.
   */
  variant?: ThemeCustomizerVariant;
  /**
   * Restrict the fan to these `PRIMARY_COLORS` keys, in `PRIMARY_COLORS`
   * order. Unknown keys are ignored; unset (or empty) offers every hue. All 18
   * make for a crowded fan, so chrome usually passes a curated handful.
   */
  swatches?: readonly string[];
  /** Fan axis. `auto` points away from the nearest viewport edge. */
  direction?: SwatchFanDirectionOption;
  /** Apply a hue on hover and restore it if the fan closes uncommitted. */
  preview?: boolean;
  /**
   * Bind to take control of the primary hue: the component then renders from
   * this value and reports changes through `update:primary` instead of writing
   * the theme singleton. Leave unbound for the singleton-backed default.
   */
  primary?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showPalette: true,
  variant: "panel",
  swatches: undefined,
  direction: "auto",
  preview: true,
  primary: undefined,
});

const emit = defineEmits<{
  "update:primary": [value: string];
}>();

// Shared theme singleton — the de-pinia'd replacement for vd2's theme store.
// `prefs` is its reactive state (SSR-safe seed, hydrated from storage on mount
// by the singleton), shared live with VdThemeSwitcher.
const theme = useThemePreference();
const prefs = theme.state;

const isOpen = ref(false);
const panelRef = ref<HTMLElement | null>(null);
const fanRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);

const PANEL_WIDTH = 320;
const MOBILE_BREAKPOINT = 768;

const isSwatches = computed(() => props.variant === "swatches");

/**
 * Controlled when `primary` is bound: the parent owns the value and
 * persistence, and we only report intent. Unbound, the singleton is both the
 * source of truth and the sink, exactly as it was before the prop existed.
 */
const isControlled = computed(() => props.primary !== undefined);
const activePrimary = computed(() =>
  isControlled.value ? (props.primary as string) : prefs.primary,
);

const applyPrimary = (primary: string): void => {
  if (isControlled.value) {
    emit("update:primary", primary);
    return;
  }
  theme.setPrimary(primary);
};

// Each control writes only the field it owns through the shared singleton, so a
// mutation never carries a stale copy of another control's field.
const setPalette = (palette: Palette): void => theme.setPalette(palette);
const setPrimary = (primary: string): void => applyPrimary(primary);
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

// ── Swatches fan ─────────────────────────────────────────────
// Every blade is hinged at the trigger center (its own left-center via CSS
// transform-origin), so `rotate()` swings them around one point like a hand fan.

const FAN_SPREAD = 120;
const FAN_SPREAD_MIN = 30;
const HINGE_GAP = 26;
const VIEWPORT_GAP = 12;
const FAN_BLADE_FALLBACK = 96;

const FAN_BASE_ANGLES: Record<SwatchFanDirection, number> = {
  up: -90,
  down: 90,
  left: 180,
  right: 0,
};

const autoDir = ref<SwatchFanDirection>("up");
const fanSpread = ref(FAN_SPREAD);
const fanBaseOffset = ref(0);
const snapshotPrimary = ref("");
const finalized = ref(false);
const hoverKey = ref<string | null>(null);

const fanDir = computed<SwatchFanDirection>(() =>
  props.direction === "auto" ? autoDir.value : props.direction,
);

const fanSwatches = computed(() => {
  const allow = props.swatches;
  if (!allow || allow.length === 0) return PRIMARY_COLORS;
  const allowed = new Set(allow);
  return PRIMARY_COLORS.filter((c) => allowed.has(c.key));
});

const toDeg = (rad: number): number => (rad * 180) / Math.PI;
const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/** Fan away from whichever viewport edge the trigger sits closest to. */
const resolveAutoDirection = (rect: DOMRect): SwatchFanDirection => {
  const toTop = rect.top;
  const toBottom = window.innerHeight - rect.bottom;
  const toLeft = rect.left;
  const toRight = window.innerWidth - rect.right;
  const nearest = Math.min(toTop, toBottom, toLeft, toRight);
  // Bottom first so the common bottom-dock case wins ties with "up".
  if (nearest === toBottom) return "up";
  if (nearest === toTop) return "down";
  if (nearest === toLeft) return "right";
  return "left";
};

/**
 * Fit the fan inside the viewport. Blades spread along the axis perpendicular
 * to the fan direction (x for up/down, y for left/right); a blade at offset
 * δ° from the fan axis reaches c + sign · L · sin δ along that axis, where L is
 * the blade length from the hinge. Solve for the largest symmetric arc and the
 * base-angle tilt that keeps every blade tip on screen.
 */
const fitFanToViewport = (
  cx: number,
  cy: number,
  dir: SwatchFanDirection,
): void => {
  const blade = fanRef.value?.querySelector<HTMLElement>(".tc-fan-item");
  const bladeLength =
    HINGE_GAP + (blade?.offsetWidth ?? FAN_BLADE_FALLBACK) + 10;

  const horizontal = dir === "up" || dir === "down";
  const sign = dir === "up" || dir === "right" ? 1 : -1;
  const c = horizontal ? cx : cy;
  const minC = VIEWPORT_GAP;
  const maxC =
    (horizontal ? window.innerWidth : window.innerHeight) - VIEWPORT_GAP;

  let lo = toDeg(Math.asin(clamp(((minC - c) * sign) / bladeLength, -1, 1)));
  let hi = toDeg(Math.asin(clamp(((maxC - c) * sign) / bladeLength, -1, 1)));
  if (lo > hi) [lo, hi] = [hi, lo];

  fanSpread.value = clamp(
    Math.min(FAN_SPREAD, hi - lo),
    FAN_SPREAD_MIN,
    FAN_SPREAD,
  );
  fanBaseOffset.value = (lo + hi) / 2;
};

/** Anchor the teleported fan at the trigger center for any edge. */
const positionFan = (): void => {
  const fan = fanRef.value;
  const trigger = triggerRef.value;
  if (!fan || !trigger) return;

  const rect = trigger.getBoundingClientRect();
  if (props.direction === "auto") {
    autoDir.value = resolveAutoDirection(rect);
  }

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  fan.style.left = `${cx}px`;
  fan.style.top = `${cy}px`;
  fitFanToViewport(cx, cy, fanDir.value);
};

const fanItemAngle = (index: number): number => {
  const count = fanSwatches.value.length;
  const mid = (count - 1) / 2;
  const step = count > 1 ? fanSpread.value / (count - 1) : 0;
  const base = FAN_BASE_ANGLES[fanDir.value] + fanBaseOffset.value;
  return base + (index - mid) * step;
};

/**
 * Open pose keeps each blade tilted at its fan angle; closed folds every blade
 * onto the fan axis. `--i` staggers the transition, reversed on close so the
 * fan unfolds outward and folds inward.
 */
const fanItemStyle = (index: number): Record<string, string | number> => {
  const count = fanSwatches.value.length;
  const mid = (count - 1) / 2;
  const base = FAN_BASE_ANGLES[fanDir.value] + fanBaseOffset.value;
  const angle = fanItemAngle(index);

  return {
    "--i": isOpen.value ? index : count - 1 - index,
    "--fan-z": String(count - Math.abs(index - mid)),
    "--fan-transform-open": `rotate(${angle.toFixed(2)}deg) translateX(${HINGE_GAP}px)`,
    "--fan-transform-closed": `rotate(${base.toFixed(2)}deg) translateX(${HINGE_GAP}px) scale(0.5)`,
  };
};

const previewSwatch = (key: string): void => {
  if (!isOpen.value || !props.preview) return;
  hoverKey.value = key;
  applyPrimary(key);
};

const clearPreview = (): void => {
  if (!isOpen.value || finalized.value || !props.preview) return;
  hoverKey.value = null;
  applyPrimary(snapshotPrimary.value);
};

const onFanPointerLeave = (event: MouseEvent): void => {
  const related = event.relatedTarget;
  if (related instanceof Node && fanRef.value?.contains(related)) return;
  clearPreview();
};

const selectSwatch = (key: string): void => {
  applyPrimary(key);
  finalized.value = true;
  hoverKey.value = null;
  isOpen.value = false;
};

const open = (): void => {
  if (isSwatches.value) {
    snapshotPrimary.value = activePrimary.value;
    finalized.value = false;
    hoverKey.value = null;
  }
  isOpen.value = true;
};
const close = (): void => {
  // Closing without a pick is a cancel — put the hue back where it was.
  if (isSwatches.value && isOpen.value && !finalized.value && props.preview) {
    applyPrimary(snapshotPrimary.value);
  }
  hoverKey.value = null;
  isOpen.value = false;
};
const toggle = (): void => {
  isOpen.value ? close() : open();
};

// Close when a click lands outside the panel / fan (and isn't the trigger). The
// teleported surface + corner trigger made the backdrop unreliable, so this is
// the authoritative outside-click close. The inactive variant's ref is null,
// which useClickOutside skips.
useClickOutside([panelRef, fanRef, triggerRef], close, isOpen);

const onFont = (event: Event): void => {
  setFont((event.target as HTMLSelectElement).value);
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape" && isOpen.value) close();
};

const reposition = (): void => {
  if (isSwatches.value) {
    positionFan();
    return;
  }
  positionPanel();
};

const onReposition = (): void => {
  reposition();
};

watch(isOpen, async (open) => {
  if (open) {
    await nextTick();
    reposition();
  }
});

// An explicit direction change re-fits the open fan without waiting for a
// resize (chrome that moves the trigger between dock edges relies on this).
watch(fanDir, () => {
  if (isSwatches.value && isOpen.value) positionFan();
});

onMounted(() => {
  // The shared singleton hydrates the preference from storage and syncs <html>
  // on mount; this component only owns its overlay/keyboard window listeners.
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("vd:open-customizer", open);
  window.addEventListener("resize", onReposition);
  if (isSwatches.value) {
    // Fixed chrome moves with the page, so scroll has to re-anchor the hinge.
    window.addEventListener("scroll", onReposition, true);
    // Pre-fit so the first open already animates to the correct pose.
    void nextTick(() => positionFan());
  }
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("vd:open-customizer", open);
  window.removeEventListener("resize", onReposition);
  window.removeEventListener("scroll", onReposition, true);
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
      :aria-label="isSwatches ? 'Choose theme color' : 'Open theme customizer'"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <i
        :class="isSwatches ? 'ph-bold ph-swatches' : 'ph ph-paint-roller'"
        aria-hidden="true"
      ></i>
    </button>

    <Teleport v-if="isSwatches" to="body">
      <div
        ref="fanRef"
        class="vd-theme-customizer-fan"
        :class="[`fan-${fanDir}`, { 'is-open': isOpen }]"
        role="listbox"
        aria-label="Primary color"
        @mouseleave="onFanPointerLeave"
      >
        <button
          v-for="(c, i) in fanSwatches"
          :key="c.key"
          type="button"
          class="tc-fan-item"
          :class="{
            'is-active': activePrimary === c.key,
            'is-hovered': hoverKey === c.key,
          }"
          :data-color="c.key"
          :style="fanItemStyle(i)"
          role="option"
          :aria-selected="activePrimary === c.key"
          :aria-label="c.name"
          @mouseenter="previewSwatch(c.key)"
          @click="selectSwatch(c.key)"
        >
          <span class="tc-fan-label">{{ c.name }}</span>
          <span
            class="tc-fan-swatch"
            :style="{ '--vd-swatch-color': c.color }"
          ></span>
        </button>
      </div>
    </Teleport>

    <Teleport v-else to="body">
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
                  :class="{ 'is-active': activePrimary === c.key }"
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
            <button type="button" class="customizer-reset" @click="reset">
              Reset to Defaults
            </button>
          </div>
        </div>
      </aside>
    </Teleport>
  </div>
</template>
