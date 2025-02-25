import { nirtamir2 } from "./src";

export default nirtamir2(
  {
    vue: true,
    react: true,
    solid: true,
    svelte: true,
    astro: true,
    typescript: {
      tsconfigPath: "tsconfig.json",
    },
    formatters: false,
    stylistic: false,
  },
  [
    { ignores: [".prettierrc.mjs", "README.md"] },
    {
      rules: {
        "@typescript-eslint/promise-function-async": "off",
        "@typescript-eslint/strict-boolean-expressions": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/require-await": "off",
        "@typescript-eslint/prefer-nullish-coalescing": "off",
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "sonarjs/deprecation": "off",
        "@typescript-eslint/no-deprecated": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-redundant-type-constituents": "off",
        "sonarjs/no-redundant-optional": "off",
        "no-use-before-define": "off",
        "@typescript-eslint/no-unnecessary-type-parameters": "off",
        //
        "@typescript-eslint/init-declarations": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unused-expressions": "off",
        "github/array-foreach": "off",
        "github/no-then": "off",
        "sonarjs/no-duplicate-string": "off",
        "sonarjs/no-gratuitous-expressions": "off",
        "sonarjs/no-nested-template-literals": "off",
        "sonarjs/cognitive-complexity": "off",
        "sonarjs/no-nested-conditional": "off",
        "sonarjs/no-commented-code": "off",
        "unicorn/consistent-destructuring": "off",
        "unicorn/import-style": "off",
        "unicorn/no-array-for-each": "off",
        "unicorn/no-array-reduce": "off",
        "unicorn/no-await-expression-member": "off",
        "unicorn/no-object-as-default-parameter": "off",
        "unicorn/no-process-exit": "off",
        "unicorn/prefer-module": "off",
      },
    },
    {
      ignores: ["fixtures/input", "_fixtures"],
    },
  ],
);
