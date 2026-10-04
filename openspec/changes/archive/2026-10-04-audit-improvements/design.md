# Design

Anchor sanitization applies the same attribute whitelist to every allowed element. Tooltip triggers remain visible, with separate surfaces, focus semantics, dismissal and cleanup.

Preserve public imports and existing explicit core calls. Extend current components and engines. Browser access remains behind client lifecycle hooks. This work fixes the current Vue implementation; it is not a new port from framework/js.

Complete focused regression tests before broader package gates. Validate built output as well as source. Synchronize user-facing examples with public declarations. Record manual gaps honestly in the QA log.
