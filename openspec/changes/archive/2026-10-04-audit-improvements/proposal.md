# Safe content and usable tooltips

## Why

The September 16 audit reproduced defects and identified avoidable integration and documentation costs.

## What changes

Anchor sanitization applies the same attribute whitelist to every allowed element. Tooltip triggers remain visible, with separate surfaces, focus semantics, dismissal and cleanup.

## Impact

Initial defect fixes preserve existing imports and need no migration from the Vue package. Additive APIs will be documented and require a minor release; release numbers are deferred until local QA is approved. No runtime dependencies are added.

## Non-goals

No remote writes, publication, deployment, new widget families, or replacement rendering engines. No edits to the old-line reference repositories.
