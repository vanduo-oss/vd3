/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  // The css/ tree is carried unmodified from the old framework repo, so the
  // framework's rule relaxations are merged here — the linter adapts to the
  // carried code (kept diffable against its source), not the reverse.
  rules: {
    // Naming & patterns
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,

    // Specificity & structure
    'no-descending-specificity': null,

    // Color
    'color-hex-length': null,
    'color-function-notation': null,
    'alpha-value-notation': null,
    'color-function-alias-notation': null,

    // Values
    'value-keyword-case': null,
    'shorthand-property-no-redundant-values': null,
    'number-max-precision': null,

    // Declaration blocks
    'declaration-block-single-line-max-declarations': null,
    'declaration-block-no-redundant-longhand-properties': null,

    // Fonts
    'font-family-no-missing-generic-family-keyword': null,
    'font-family-name-quotes': null,

    // Empty lines
    'comment-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,

    // Deprecated properties
    'property-no-deprecated': null,
    'declaration-property-value-keyword-no-deprecated': null,

    // Vendor prefixes (e.g. -webkit-backdrop-filter) are intentional for
    // cross-browser support; keep the existing media-query syntax as-is.
    'property-no-vendor-prefix': null,
    'selector-no-vendor-prefix': null,
    'value-no-vendor-prefix': null,

    // Import & selectors
    'import-notation': null,
    'selector-not-notation': null,

    // Media
    'media-feature-range-notation': null,
  },
  // css/core/generated/** is build output (scripts/build-tokens.mjs) with its
  // own determinism + rule-parity tests — linting it would re-lint the
  // generator, so it stays excluded.
  ignoreFiles: ['dist/**', 'node_modules/**', 'css/core/generated/**'],
};
