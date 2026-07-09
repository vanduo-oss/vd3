import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default [
  js.configs.recommended,
  // `flat/essential` = bug-prevention rules only. Formatting is owned by
  // Prettier, so we deliberately avoid `flat/recommended`'s stylistic rules
  // (max-attributes-per-line, singleline-html-element-content-newline, …).
  ...vue.configs['flat/essential'],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: vueParser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        performance: 'readonly',
        getComputedStyle: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        Node: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        URL: 'readonly',
        CSS: 'readonly',
        HTMLElementTagNameMap: 'readonly',
        SVGElementTagNameMap: 'readonly',
        ElementTagNameMap: 'readonly',
      },
    },
    rules: {
      // TypeScript (vue-tsc) handles undefined identifiers and DOM lib types;
      // base `no-undef` only produces false positives on types in a TS project.
      'no-undef': 'off',
      // SFC <script> strings must escape `</script>` as `<\/script>` to avoid
      // closing the block early — a necessary escape eslint can't see is needed.
      'no-useless-escape': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
      // TypeScript (vue-tsc, noUnusedLocals/noUnusedParameters) already enforces
      // unused-variable checks across the typed codebase and understands type
      // signatures; base `no-unused-vars` only adds false positives here.
      'no-unused-vars': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'warn',
        {
          selector: "AssignmentExpression[left.type='MemberExpression'][left.property.name='innerHTML']",
          message:
            'Avoid assigning to innerHTML directly; route HTML through a sanitizer or build nodes with the DOM API.',
        },
      ],
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  },
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      // Generated color partials (Phase 1 token/CSS pipeline output).
      'css/core/generated/**',
      // Generated token-data module (build-tokens.mjs output, gitignored).
      'src/theme/generated/**',
      // Node build scripts (not app code).
      'scripts/**',
      // Spec-driven change artifacts and agent config — not lintable code.
      'openspec/**',
      '.claude/**',
    ],
  },
];
