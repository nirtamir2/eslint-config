// The package's `src` graph uses bundler-style extensionless imports that Node's ESM
// loader cannot resolve, and Oxlint loads this file with plain Node. Consuming the
// built entry also means this config exercises exactly what consumers get, so it
// deliberately depends on `nr build` having run.
// eslint-disable-next-line antfu/no-import-dist
import oxlint from "./dist/oxlint.mjs";

export default oxlint({
  query: true,
  react: true,
  solid: true,
  storybook: true,
  typescript: {
    typeAware: true,
  },
  ignores: [
    "dist/**",
    "fixtures/**",
    "_fixtures/**",
    "stuff/**",
    "src/generated/**",
    "src/typegen.d.ts",
  ],
  rules: {
    // #region parity with this repo's own eslint.config.ts
    "init-declarations": "off",
    "no-unused-expressions": "off",
    "no-use-before-define": "off",
    "github/array-foreach": "off",
    "github/no-then": "off",
    "sonarjs/cognitive-complexity": "off",
    "sonarjs/deprecation": "off",
    "sonarjs/no-commented-code": "off",
    "sonarjs/no-duplicate-string": "off",
    "sonarjs/no-gratuitous-expressions": "off",
    "sonarjs/no-nested-conditional": "off",
    "sonarjs/no-nested-template-literals": "off",
    "sonarjs/no-redundant-optional": "off",
    "typescript/no-deprecated": "off",
    "typescript/no-explicit-any": "off",
    "typescript/no-non-null-assertion": "off",
    "typescript/no-redundant-type-constituents": "off",
    "typescript/no-unnecessary-condition": "off",
    "typescript/no-unnecessary-type-parameters": "off",
    "typescript/no-unsafe-argument": "off",
    "typescript/no-unsafe-assignment": "off",
    "typescript/no-unsafe-call": "off",
    "typescript/no-unsafe-member-access": "off",
    "typescript/no-unsafe-return": "off",
    "typescript/prefer-nullish-coalescing": "off",
    "typescript/promise-function-async": "off",
    "typescript/require-await": "off",
    "typescript/restrict-template-expressions": "off",
    "typescript/strict-boolean-expressions": "off",
    "eslint-unicorn/consistent-boolean-name": "off",
    "eslint-unicorn/consistent-destructuring": "off",
    "eslint-unicorn/name-replacements": "off",
    "eslint-unicorn/no-break-in-nested-loop": "off",
    "eslint-unicorn/no-computed-property-existence-check": "off",
    "eslint-unicorn/no-declarations-before-early-exit": "off",
    "eslint-unicorn/no-top-level-assignment-in-function": "off",
    "eslint-unicorn/prefer-await": "off",
    "eslint-unicorn/prefer-iterator-to-array": "off",
    "eslint-unicorn/prefer-simple-condition-first": "off",
    "unicorn/import-style": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-await-expression-member": "off",
    "unicorn/no-object-as-default-parameter": "off",
    "unicorn/no-process-exit": "off",
    "unicorn/prefer-module": "off",
    // #endregion

    // Build and release scripts are console programs.
    "no-console": "off",
    // `src/compat.ts` and `src/plugins.ts` deliberately opt out of type checking.
    "typescript/ban-ts-comment": "off",
    // Optional peer plugins are loaded through `Promise.all([...] as const)` even when a
    // single plugin is involved, so adding one later stays a one-line change.
    "unicorn/no-single-promise-in-promise-methods": "off",
    // Conditional spreads read better than the ternary-of-arrays alternative here.
    "unicorn/no-useless-spread": "off",
    // Nested ternaries are used for option normalisation throughout the configs.
    "unicorn/no-nested-ternary": "off",
  },
});
