/**
 * Shared status-variant vocabulary for Vanduo components.
 *
 * A single palette applied consistently across VdButton, VdAlert, VdBadge,
 * VdChip (and the validation subset on form controls). Replaces the per-component
 * variant sets that existed through 0.2.x — notably unifying the `error`/`danger`
 * spelling onto `danger`.
 */
export type StatusVariant =
  "primary" | "secondary" | "success" | "warning" | "danger" | "info";

/**
 * `VdThemeCustomizer` presentation. `panel` is the full slide-in editor
 * (palette / primary / neutral / radius / font); `swatches` is the hinged
 * primary-only fan meant for dock and toolbar chrome.
 */
export type ThemeCustomizerVariant = "panel" | "swatches";

/** Axis the swatches fan unfolds along. */
export type SwatchFanDirection = "up" | "down" | "left" | "right";

/**
 * `direction` prop value. `auto` fans away from the nearest viewport edge and
 * re-resolves whenever the trigger moves.
 */
export type SwatchFanDirectionOption = "auto" | SwatchFanDirection;
