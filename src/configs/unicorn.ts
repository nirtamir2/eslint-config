import type { TypedFlatConfigItem } from "../types";
import { pluginUnicorn } from "../plugins";

export interface OptionsUnicornExtended {
  allRecommended?: boolean;
  overrides?: TypedFlatConfigItem["rules"];
}

export async function unicorn(options: OptionsUnicornExtended = {}): Promise<Array<TypedFlatConfigItem>> {
  const {
    allRecommended = true,
    overrides = {},
  } = options;
  return [
    {
      name: "nirtamir2/unicorn/rules",
      plugins: {
        unicorn: pluginUnicorn,
      },
      rules: {
        ...(allRecommended
          ? pluginUnicorn.configs["flat/recommended"].rules
          : {
              "unicorn/consistent-empty-array-spread": "error",
              "unicorn/error-message": "error",
              "unicorn/escape-case": "error",
              "unicorn/new-for-builtins": "error",
              "unicorn/no-instanceof-builtins": "error",
              "unicorn/no-new-array": "error",
              "unicorn/no-new-buffer": "error",
              "unicorn/number-literal-case": "error",
              "unicorn/prefer-dom-node-text-content": "error",
              "unicorn/prefer-includes": "error",
              "unicorn/prefer-node-protocol": "error",
              "unicorn/prefer-number-properties": "error",
              "unicorn/prefer-string-starts-ends-with": "error",
              "unicorn/prefer-type-error": "error",
              "unicorn/throw-new-error": "error",
            }),
        // Nirtamir2 overrides
        "unicorn/consistent-destructuring": "warn",
        "unicorn/filename-case": 0,
        "unicorn/no-null": 0,
        "unicorn/numeric-separators-style": 0,
        "unicorn/prevent-abbreviations": 0,
        ...overrides,
      },
    },
  ];
}
