## ADDED Requirements

### Requirement: vd-modal-component

`VdModal` SHALL render its dialog panel with a base `vd-modal-panel` class plus a
size modifier `vd-modal-panel-<size>` derived from a `size` prop whose type is
`"sm" | "md" | "lg" | "xl"` (default `"md"`). Each size modifier SHALL resolve the
panel's max width from the corresponding `--vd-modal-width-*` token, and every
size modifier the component can render MUST have a matching selector in the
shipped CSS (enforced by the class-coverage gate). Widening the union is additive
and MUST NOT change the default or the `sm` / `md` / `lg` behavior.

#### Scenario: size maps to a panel width class

- **GIVEN** a `VdModal` rendered with `size="xl"`
- **WHEN** the panel element is inspected
- **THEN** it carries `vd-modal-panel xl` as `vd-modal-panel vd-modal-panel-xl`, and `.vd-modal-panel-xl` resolves `--vd-modal-dialog-max-width` to `var(--vd-modal-width-xl)` (987px)

#### Scenario: default size is md

- **GIVEN** a `VdModal` rendered without a `size` prop
- **WHEN** the panel element is inspected
- **THEN** it carries `vd-modal-panel-md`
