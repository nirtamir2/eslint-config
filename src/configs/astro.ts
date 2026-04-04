import { GLOB_ASTRO } from "../globs";
import type {
  OptionsFiles,
  OptionsOverrides,
  OptionsStylistic,
  TypedFlatConfigItem,
} from "../types";
import { ensurePackages, interopDefault } from "../utils";

export async function astro(
  options: OptionsOverrides & OptionsStylistic & OptionsFiles = {},
): Promise<Array<TypedFlatConfigItem>> {
  const { overrides = {}, stylistic = false, files = [GLOB_ASTRO] } = options;

  await ensurePackages(["eslint-plugin-astro"]);

  const [pluginAstro, parserAstro, parserTs] = await Promise.all([
    interopDefault(import("eslint-plugin-astro")),
    interopDefault(import("astro-eslint-parser")),
    interopDefault(import("@typescript-eslint/parser")),
  ] as const);

  const recommendedRules = pluginAstro.configs["flat/recommended"].reduce(
    (
      rules: NonNullable<TypedFlatConfigItem["rules"]>,
      config: TypedFlatConfigItem,
    ) => ({
      ...rules,
      ...(config.rules ?? {}),
    }),
    {},
  );

  return [
    {
      name: "antfu/astro/setup",
      plugins: {
        astro: pluginAstro,
      },
    },
    {
      files,
      languageOptions: {
        globals: pluginAstro.environments.astro.globals,
        parser: parserAstro,
        parserOptions: {
          extraFileExtensions: [".astro"],
          parser: parserTs,
        },
        sourceType: "module",
      },
      name: "antfu/astro/rules",
      processor: "astro/client-side-ts",
      rules: {
        ...recommendedRules,
        "antfu/no-top-level-await": "off",
        "astro/no-set-html-directive": "off",
        "astro/semi": "off",

        ...(stylistic
          ? {
              "@stylistic/indent": "off",
              "@stylistic/jsx-closing-tag-location": "off",
              "@stylistic/jsx-indent": "off",
              "@stylistic/jsx-one-expression-per-line": "off",
              "@stylistic/no-multiple-empty-lines": "off",
            }
          : {}),

        ...overrides,
      },
    },
  ];
}
