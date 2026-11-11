# Fibonacci Motion System

## Why

vd3 lacked smooth transitions on interactive components (accordion, code snippet, tree, modals, offcanvas, dropdowns, etc.), leading to jarring instant disclosure. In line with vd3's golden ratio and Fibonacci design philosophy, this change introduces a unified Fibonacci-derived motion system with golden ratio easing curves, accessible reduced-motion controls, and default-on smooth transitional animations.

## What changes

- Add Fibonacci duration tokens (55ms, 89ms, 144ms, 233ms, 377ms, 610ms, 987ms) and golden cubic-bezier easing tokens (`--vd-ease-out`, `--vd-ease-in`, `--vd-ease-in-out`, `--vd-ease-linear`).
- Add `css/core/motion.css` with runtime mode switches (`[data-motion="full|reduce|off"]`), Vue `<Transition>` classes (`vd-fade`, `vd-slide-*`, `vd-scale`), and utilities.
- Clean up `css/utilities/transitions.css`: point legacy duration variables to Fibonacci tokens, resolve token naming collisions, remove indiscriminate `*` reduced-motion rule in favour of targeted rules.
- Retoken 190+ hardcoded CSS transition durations across the component library to use Fibonacci tokens.
- Add `useMotion` composable with `setMotion()`, `getMotion()`, `motionMode`, and `useReducedMotion()`.
- Add public transition components: `VdTransition` and `VdExpandTransition` (with adaptive height-based duration selection).
- Enable smooth transitions across components: `VdAccordion`, `VdCodeSnippet`, `VdTreeNode`, `VdNavbar`, `VdModal`, `VdOffcanvas`, `VdSidenav`, `VdGlobalSearch`, `VdDocSearch`, `VdCustomSelect`, `VdMenu`, `VdThemeSwitcher`, `VdFab`, `VdTooltip`, `VdAlert`, `VdChip`, `VdTabs`, and `.vd-collapsible`.
- Add Motion mode selection to `VdThemeCustomizer`.
- Update package version to 1.9.0.

Semver: minor (new features and backward-compatible deprecations).

