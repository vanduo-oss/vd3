# Add auth screens

## Why

vd3 has no login, sign-up, or password-reset UI. Apps assemble Cover + Card +
Input by hand, and `VdInput` cannot host a password-reveal control because
prefix/suffix are static text. A design-system login must be headless (emit
events, never fetch), credential-manager friendly, and composed from existing
primitives (`VdAvatar`, `VdAlert`, `VdButton`, `VdIcon`, `useValidate` messages).

## What Changes

- `VdInput` gains `#prefix` / `#suffix` slots, `revealPassword`, credential
  defaults (`spellcheck`, `autocapitalize`), and `.label-required` when `required`.
- New `VdCheckbox` (boolean remember-me / terms; `VdCheckboxGroup` stays for sets).
- New `VdOtpInput` (grouped digits, paste-to-fill, `autocomplete="one-time-code"`).
- `VdCard` gains additive `glass` (existing `.vd-card-glass`).
- New composed screens: `VdAuthCard`, `VdLogin`, `VdSignUp`, `VdForgotPassword`.
  They emit `submit` / `social`; parents own sessions, CSRF tokens, OAuth SDKs.

## Capabilities

### New Capabilities

- `auth-screens`: composed headless auth UI plus the primitive gaps those
  screens require (checkbox, OTP, password reveal, glass card).

### Modified Capabilities

- `components`: `VdInput` affixes/reveal/required asterisk; `VdCard` `glass`.

## Semver

**Minor — additive.** `1.3.0 → 1.4.0` (shared with `add-data-table` on `dev-v140`).
Existing `VdInput` / `VdCard` / `VdCheckboxGroup` renderings without the new
props are unchanged.

## Migration note (`@vanduo-oss/vue` → vd3)

None. Auth screens are vd3-only surface. vd2 had no equivalent.

## Non-goals

- Sessions, JWT, cookies, CSRF generation, captcha vendors, OAuth SDKs, lockout
  timers (the parent passes error copy).
- Rewriting `VdAvatar` (compose it in the `brand` slot).
- File-upload avatar on sign-up.
- SMS retriever / WebOTP APIs.
- New runtime npm dependencies.
- A sibling `vd3-admin` / `vd3-kit` package.
