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
