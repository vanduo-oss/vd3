// @vanduo-oss/vd3 — Vanduo UI for Vue 3 (the vd3 line).
// Auto-organized barrel. Tree-shakeable named exports.
//
// The pure-Vue surface of the old @vanduo-oss/vue package, minus
// `loadVanduoRuntime` (vd3 is standalone — there is no IIFE runtime).
// The `vd3-rewrites` change restored `VdMenu` plus the 12 previously
// deferred delegating/DOM-scan composables (useDropdown, useDraggable,
// useImageBox, useRipple, useSpotlight, useTimeline, useExpandingCards,
// useFlow, useTabs, useValidate, useSearch, usePopover) as pure Vue
// composables; the `vd3-new-components` change added seven new components
// (VdBreadcrumb, VdFooter, VdFab, VdNavbar, VdThemeSwitcher,
// VdThemeCustomizer, VdDocSearch) and four composables (useClickOutside,
// useDocSearch, useLazyLoad, useGrid + `setGridSystem`).

export const VD3_VERSION = "0.1.0";

// ── Plugin ───────────────────────────────────────────────────
export { VanduoVue } from "./plugin";

// ── Components ───────────────────────────────────────────────
export { default as VdAccordion } from "./components/VdAccordion.vue";
export { default as VdAlert } from "./components/VdAlert.vue";
export { default as VdAvatar } from "./components/VdAvatar.vue";
export { default as VdBadge } from "./components/VdBadge.vue";
export { default as VdBreadcrumb } from "./components/VdBreadcrumb.vue";
export { default as VdButton } from "./components/VdButton.vue";
export { default as VdButtonGroup } from "./components/VdButtonGroup.vue";
export { default as VdCard } from "./components/VdCard.vue";
export { default as VdCheckboxGroup } from "./components/VdCheckboxGroup.vue";
export { default as VdChip } from "./components/VdChip.vue";
export { default as VdCodeSnippet } from "./components/VdCodeSnippet.vue";
export { default as VdCollection } from "./components/VdCollection.vue";
export { default as VdCustomSelect } from "./components/VdCustomSelect.vue";
export { default as VdDocSearch } from "./components/VdDocSearch.vue";
export { default as VdFab } from "./components/VdFab.vue";
export { default as VdFlow } from "./components/VdFlow.vue";
export { default as VdFooter } from "./components/VdFooter.vue";
export { default as VdIcon } from "./components/VdIcon.vue";
export { default as VdInput } from "./components/VdInput.vue";
export { default as VdMenu } from "./components/VdMenu.vue";
export { default as VdModal } from "./components/VdModal.vue";
export { default as VdNavbar } from "./components/VdNavbar.vue";
export { default as VdOffcanvas } from "./components/VdOffcanvas.vue";
export { default as VdPagination } from "./components/VdPagination.vue";
export { default as VdPreloader } from "./components/VdPreloader.vue";
export { default as VdProgress } from "./components/VdProgress.vue";
export { default as VdRadioGroup } from "./components/VdRadioGroup.vue";
export { default as VdRating } from "./components/VdRating.vue";
export { default as VdSelect } from "./components/VdSelect.vue";
export { default as VdSeparator } from "./components/VdSeparator.vue";
export { default as VdSidenav } from "./components/VdSidenav.vue";
export { default as VdSkeleton } from "./components/VdSkeleton.vue";
export { default as VdSlider } from "./components/VdSlider.vue";
export { default as VdSpinner } from "./components/VdSpinner.vue";
export { default as VdSwitch } from "./components/VdSwitch.vue";
export { default as VdTable } from "./components/VdTable.vue";
export { default as VdTabs } from "./components/VdTabs.vue";
export { default as VdThemeCustomizer } from "./components/VdThemeCustomizer.vue";
export { default as VdThemeSwitcher } from "./components/VdThemeSwitcher.vue";
export { default as VdToast } from "./components/VdToast.vue";
export { default as VdToastContainer } from "./components/VdToastContainer.vue";
export { default as VdTooltip } from "./components/VdTooltip.vue";
export { default as VdTransfer } from "./components/VdTransfer.vue";
export { default as VdTree } from "./components/VdTree.vue";
export { default as VdTreeNode } from "./components/VdTreeNode.vue";

// ── Layout primitives ────────────────────────────────────────
export { default as VdBox } from "./components/primitives/VdBox.vue";
export { default as VdCenter } from "./components/primitives/VdCenter.vue";
export { default as VdCover } from "./components/primitives/VdCover.vue";
export { default as VdFrame } from "./components/primitives/VdFrame.vue";
export { default as VdInline } from "./components/primitives/VdInline.vue";
export { default as VdStack } from "./components/primitives/VdStack.vue";
export { default as VdSwitcher } from "./components/primitives/VdSwitcher.vue";

// ── Composables ──────────────────────────────────────────────
export * from "./composables/useAffix";
export * from "./composables/useClickOutside";
export * from "./composables/useDatepicker";
export * from "./composables/useDocSearch";
export * from "./composables/useDraggable";
export * from "./composables/useDropdown";
export * from "./composables/useExpandingCards";
export * from "./composables/useFlow";
export * from "./composables/useFocusTrap";
export * from "./composables/useGlass";
export * from "./composables/useGrid";
export * from "./composables/useImageBox";
export * from "./composables/useKeyboardNav";
export * from "./composables/useLazyLoad";
export * from "./composables/useMorph";
export * from "./composables/useMorphBadges";
export * from "./composables/useNavbarGlassScroll";
export * from "./composables/useParallax";
export * from "./composables/usePopover";
export * from "./composables/useRipple";
export * from "./composables/useScrollspy";
export * from "./composables/useSearch";
export * from "./composables/useSidenav";
export * from "./composables/useSpotlight";
export * from "./composables/useStepper";
export * from "./composables/useSuggest";
export * from "./composables/useTabs";
export * from "./composables/useTheme";
export * from "./composables/useThemeBridge";
export * from "./composables/useTimeline";
export * from "./composables/useTimepicker";
export * from "./composables/useToast";
export * from "./composables/useTooltips";
export * from "./composables/useValidate";
export * from "./composables/useWaypoint";

// ── Utilities ────────────────────────────────────────────────
export * from "./utils/sanitizeHtml";

// ── Shared types ──────────────────────────────────────────────
export type { StatusVariant } from "./types";

// ── Re-exported component types ───────────────────────────────
export type { BreadcrumbItem } from "./components/VdBreadcrumb.vue";
export type { TreeNode } from "./components/VdTreeNode.vue";
