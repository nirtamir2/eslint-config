import type {
  OptionsFiles,
  OptionsHasTypeScript,
  OptionsOverrides,
  OptionsStylistic,
  Rules,
  TypedFlatConfigItem,
} from "../types";
import { GLOB_SVELTE } from "../globs";
import { ensurePackages, interopDefault } from "../utils";

export async function svelte(
  options: OptionsHasTypeScript &
    OptionsOverrides &
    OptionsStylistic &
    OptionsFiles = {},
): Promise<Array<TypedFlatConfigItem>> {
  const { overrides = {}, stylistic = false, files = [GLOB_SVELTE] } = options;

  const { indent = 2, quotes = "single" } =
    typeof stylistic === "boolean" ? {} : stylistic;

  await ensurePackages(["eslint-plugin-svelte"]);

  const [pluginSvelte, parserSvelte] = await Promise.all([
    interopDefault(import("eslint-plugin-svelte")),
    interopDefault(import("svelte-eslint-parser")),
  ] as const);

  return [
    {
      name: "antfu/svelte/setup",
      plugins: {
        svelte: pluginSvelte,
      },
    },
    {
      files,
      languageOptions: {
        parser: parserSvelte,
        parserOptions: {
          extraFileExtensions: [".svelte"],
          // SAFETY: svelte-eslint-parser types `parser` as its own narrower shape;
          // any ESLint parser is accepted at runtime.
          parser: options.typescript
            ? ((await interopDefault(
                import("@typescript-eslint/parser"),
              )) as any)
            : null,
        },
      },
      name: "antfu/svelte/rules",
      processor: pluginSvelte.processors[".svelte"],
      rules: {
        "no-undef": "off", // incompatible with most recent (attribute-form) generic types RFC
        "no-unused-vars": [
          "error",
          {
            args: "none",
            caughtErrors: "none",
            ignoreRestSiblings: true,
            vars: "all",
            varsIgnorePattern: String.raw`^(\$\$Props$|\$\$Events$|\$\$Slots$)`,
          },
        ],

        ...pluginSvelte.configs.recommended
          .map((config) => config.rules)
          .reduce<Rules>(
            (rules, recommendedRules) => ({
              ...rules,
              ...recommendedRules,
            }),
            {},
          ),

        "unused-imports/no-unused-vars": [
          "error",
          {
            args: "after-used",
            argsIgnorePattern: "^_",
            vars: "all",
            varsIgnorePattern: String.raw`^(_|\$\$Props$|\$\$Events$|\$\$Slots$)`,
          },
        ],

        ...(stylistic && {
              "@stylistic/indent": "off", // superseded by svelte/indent
              "@stylistic/no-trailing-spaces": "off", // superseded by svelte/no-trailing-spaces
              "svelte/derived-has-same-inputs-outputs": "error",
              "svelte/html-closing-bracket-spacing": "error",
              "svelte/html-quotes": [
                "error",
                { prefer: quotes === "backtick" ? "double" : quotes },
              ],
              "svelte/indent": [
                "error",
                { alignAttributesVertically: true, indent },
              ],
              "svelte/mustache-spacing": "error",
              "svelte/no-spaces-around-equal-signs-in-attribute": "error",
              "svelte/no-trailing-spaces": "error",
              "svelte/spaced-html-comment": "error",
            }),

        ...overrides,
      },
    },
  ];
}
