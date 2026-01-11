import { GLOB_JSX, GLOB_TSX } from "../globs";
import type { TypedFlatConfigItem } from "../types";
import { ensurePackages, interopDefault } from "../utils";

export async function jsx(): Promise<Array<TypedFlatConfigItem>> {
  // Base JSX configuration without a11y
  const baseConfig: TypedFlatConfigItem = {
    name: "antfu/jsx/setup",
    files: [GLOB_JSX, GLOB_TSX],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {},
    plugins: {},
  };

  await ensurePackages(["eslint-plugin-jsx-a11y", "@stylistic/eslint-plugin"]);

  const [pluginStylistic, jsxA11yPlugin] = await Promise.all([
    interopDefault(import("@stylistic/eslint-plugin")),
    interopDefault(import("eslint-plugin-jsx-a11y")),
  ] as const);

  const a11yConfig = jsxA11yPlugin.flatConfigs.recommended;

  return [
    {
      ...baseConfig,
      ...a11yConfig,
      files: baseConfig.files,
      languageOptions: {
        ...baseConfig.languageOptions,
        ...a11yConfig.languageOptions,
      },
      name: baseConfig.name,
      plugins: {
        ...baseConfig.plugins,
        "jsx-a11y": jsxA11yPlugin,
        "@stylistic": pluginStylistic,
      },
      rules: {
        ...baseConfig.rules,
        ...a11yConfig.rules,
        "@stylistic/jsx-quotes": "warn",
        "@stylistic/jsx-self-closing-comp": "warn",
      },
    },
  ];
}
