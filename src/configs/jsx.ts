import { GLOB_JSX, GLOB_TSX } from "../globs";
import type { TypedFlatConfigItem } from "../types";
import { interopDefault } from "../utils";

export async function jsx(): Promise<Array<TypedFlatConfigItem>> {
  const [pluginStylistic] = await Promise.all([
    interopDefault(import("@stylistic/eslint-plugin")),
  ] as const);

  return [
    {
      files: [GLOB_JSX, GLOB_TSX],
      languageOptions: {
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      name: "antfu/jsx/setup",
    },
    {
      files: [GLOB_JSX, GLOB_TSX],
      plugins: {
        "@stylistic": pluginStylistic,
      },
      name: "nirtamir/jsx/stylistic",
      rules: {
        "@stylistic/jsx-quotes": "warn",
        "@stylistic/jsx-self-closing-comp": "warn",
      },
    },
  ];
}
