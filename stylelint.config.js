/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'no-descending-specificity': null,
    // Vendor prefixes (e.g. -webkit-backdrop-filter) are intentional for
    // cross-browser support; keep the existing media-query syntax as-is.
    'property-no-vendor-prefix': null,
    'value-no-vendor-prefix': null,
    'media-feature-range-notation': null,
  },
  ignoreFiles: ['dist/**', 'node_modules/**', 'css/core/generated/**'],
};
