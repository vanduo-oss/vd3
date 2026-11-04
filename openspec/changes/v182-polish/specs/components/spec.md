## ADDED Requirements

### Requirement: v182-component-polish
Datepicker, sidenav, offcanvas, and waypoint behavior SHALL match their documented layout and accessibility contract.

#### Scenario: Datepicker on a wide input
- **GIVEN** a `[data-vd-datepicker]` input wider than the calendar
- **WHEN** the popup opens
- **THEN** the popup MUST NOT receive an inline min-width from the input
- **AND** each weekday header MUST be horizontally centered over its day column

#### Scenario: Waypoint click inside an overflow container
- **GIVEN** a nav whose `data-vd-waypoint-nav` resolves to a scroll container
- **WHEN** a link is clicked
- **THEN** only that container MUST scroll, the document scroll position MUST NOT change, and the clicked link MUST become active
- **AND** scrolling MUST be instant when `prefers-reduced-motion: reduce` matches

#### Scenario: Sidenav trigger state
- **GIVEN** a `[data-sidenav-toggle]` trigger wired by `useSidenav`
- **WHEN** its drawer opens or closes by any path (toggle, close button, backdrop, Escape)
- **THEN** the trigger MUST carry `aria-controls` for the drawer id and an `aria-expanded` matching the open state

#### Scenario: Sidenav unmounted while open
- **GIVEN** an open `VdSidenav`
- **WHEN** it unmounts
- **THEN** `document.body` MUST no longer be scroll-locked
