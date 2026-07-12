## MODIFIED Requirements

### Requirement: vd-theme-switcher-component

`VdThemeSwitcher` MUST port `framework/js/components/theme-switcher.js`
(466 lines) onto the vd3 theme layer: all reads/writes go through the
theme-preference singleton (which persists to `vanduo-theme-preference`
and applies/removes `data-theme` per the existing `theme-preference-model`
requirement) — the component SHALL NOT touch localStorage or
`document.documentElement` directly. In menu mode (default) it renders
the `.vd-theme-switcher[data-theme-ui="menu"]` contract: a
`.vd-theme-switcher-toggle` (`aria-expanded`, `aria-label` "Theme: X",
Phosphor icon `ph-desktop`/`ph-sun`/`ph-moon` for the active mode) and a
`.vd-theme-switcher-menu` of `menuitemradio` options
(`data-theme-value`, `is-active` + `aria-checked` on the active mode)
supporting click, Enter/Space, ArrowDown/ArrowUp cycling, and outside-click
close. Focus management MUST match the donor: **opening the menu** by click,
Enter, or Space (in addition to the existing ArrowDown-to-open path) SHALL
move focus into the menu — to the active `menuitemradio`, or the first option
when none is active (donor `openMenu`); **pressing Escape while the menu is
open** — whether the key is handled on the toggle or within the menu — SHALL
close the menu AND return focus to the `.vd-theme-switcher-toggle` button
(donor `handleMenuKeydown`), so focus is never stranded on the now-hidden
menu. With `menu=false` it renders the cycle button unchanged: each
activation advances system → light → dark → system, and it manages no menu
focus. While the preference is `system`, a `prefers-color-scheme` change
SHALL re-apply the effective theme (via the singleton's media listener).

#### Scenario: menu selection applies and persists

- **GIVEN** a mounted menu-mode switcher with preference `system`
- **WHEN** the `dark` option is chosen
- **THEN** `<html>` carries `data-theme="dark"`,
  `localStorage["vanduo-theme-preference"]` is `dark`, the option has
  `is-active` + `aria-checked="true"`, and the toggle icon/label reflect
  dark

#### Scenario: cycle mode advances modes

- **GIVEN** a cycle-mode switcher at `light`
- **WHEN** it is clicked
- **THEN** the preference becomes `dark`, and a further click returns to
  `system` (removing `data-theme`)

#### Scenario: opening by click moves focus into the menu

- **GIVEN** a mounted menu-mode switcher whose menu is closed, with `dark`
  the active mode
- **WHEN** the toggle is activated by click (or Enter/Space)
- **THEN** the menu opens (`aria-expanded="true"`) and focus moves to the
  active `dark` `menuitemradio` option (the first option when no mode is
  active)

#### Scenario: escape closes and refocuses the toggle

- **GIVEN** an open switcher menu with focus on one of its options
- **WHEN** Escape is pressed
- **THEN** the menu closes (`aria-expanded="false"`) and focus returns to
  the `.vd-theme-switcher-toggle` button

#### Scenario: menu keyboard contract

- **GIVEN** an open switcher menu
- **WHEN** ArrowDown then Escape are pressed
- **THEN** focus moves to the next option, then the menu closes and the
  toggle regains focus

#### Scenario: two theme components stay in sync

- **GIVEN** a mounted `VdThemeSwitcher` and `VdThemeCustomizer`
- **WHEN** the switcher sets `dark`
- **THEN** the customizer's reactive state reflects `dark` without a
  reload (shared singleton)
