import type {
  OptionsFiles,
  OptionsHasTypeScript,
  OptionsOverrides,
  OptionsTypeScriptWithTypes,
  TypedFlatConfigItem,
} from "../types";
import { fixupConfigRules } from "@eslint/compat";
import { compat } from "../compat";
import { GLOB_JSX, GLOB_TSX } from "../globs";
import { ensurePackages, interopDefault, toArray } from "../utils";
import { a11y } from "./a11y";
import { classnameComponents } from "./classname-components";

export async function solid(
  options: OptionsHasTypeScript &
    OptionsOverrides &
    OptionsFiles &
    OptionsTypeScriptWithTypes & {
      react?: boolean;
    } = {},
): Promise<Array<TypedFlatConfigItem>> {
  const {
    typescript = true,
    overrides = {},
    files = [GLOB_JSX, GLOB_TSX],
    react: withReact = false,
  } = options;

  await ensurePackages([
    "eslint-plugin-solid",
    ...(withReact
      ? ["@eslint-react/eslint-plugin"]
      : ["@stylistic/eslint-plugin"]),
  ]);

  const tsconfigPath = options.tsconfigPath
    ? toArray(options.tsconfigPath)
    : undefined;
  const isTypeAware = Boolean(tsconfigPath);

  const [pluginSolid, parserTs, pluginStylistic] = await Promise.all([
    interopDefault(import("eslint-plugin-solid")),
    interopDefault(import("@typescript-eslint/parser")),
    withReact
      ? Promise.resolve(null)
      : interopDefault(import("@stylistic/eslint-plugin")),
  ] as const);

  const solidV2Config = pluginSolid.configs.v2;

  return [
    {
      name: "antfu/solid/setup",
      plugins: {
        solid: pluginSolid,
        ...(pluginStylistic && { "@stylistic": pluginStylistic }),
      },
      settings: {
        ...solidV2Config.settings,
      },
    },
    {
      files,
      languageOptions: {
        parser: parserTs,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          ...(isTypeAware && { project: tsconfigPath }),
        },
        sourceType: "module",
      },
      name: "antfu/solid/rules",
      rules: {
        ...solidV2Config.rules,
        ...(typescript && {
          "solid/jsx-no-undef": ["error", { typescriptEnabled: true }],
          "solid/no-unknown-namespaces": "off",
        }),
        "solid/event-handlers": [
          "error",
          {
            ignoreCase: false,
            warnOnSpread: false,
          },
        ],
        "solid/imports": "error",
        "solid/no-innerhtml": ["error", { allowStatic: true }],
        "solid/self-closing-comp": "error",
        "solid/style-prop": ["error", { styleProps: ["style", "css"] }],
        ...overrides,
      },
    },
    ...(withReact
      ? []
      : [
          {
            files,
            name: "nirtamir2/solid/jsx-style",
            rules: {
              "@stylistic/jsx-curly-brace-presence": [
                "error",
                { props: "never", children: "never" },
              ],
              "@stylistic/jsx-pascal-case": [
                "error",
                {
                  allowLeadingUnderscore: true,
                  allowNamespace: true,
                },
              ],
            },
          } satisfies TypedFlatConfigItem,
        ]),
    ...(await classnameComponents({
      files,
      name: "nirtamir2/solid/classname-components",
      tsconfigPath: options.tsconfigPath,
    })),
    {
      files,
      name: "nirtamir2/solid/typescript-disables",
      rules: {
        "sonarjs/no-unstable-nested-components": "off", // for Show callbacks
        "sonarjs/jsx-no-constructed-context-values": "off", // Not valid for Solid.js context - only in react
        "@typescript-eslint/no-non-null-assertion": "off", // let ref: HtmlDivElement = null!
        "prefer-const": "off", // let ref: HtmlDivElement = null!
      },
    },
    ...(withReact ? [await solidReactDisables(files)] : []),
    ...ssrFriendlyConfigs(files),
    {
      name: "nirtamir2/solid/entry-client",
      files: ["src/entry-client.tsx"],
      rules: {
        "ssr-friendly/no-dom-globals-in-module-scope": "off",
      },
    },
    ...(withReact ? [] : a11y()),
  ];
}

function ssrFriendlyConfigs(files: Array<string>): Array<TypedFlatConfigItem> {
  return fixupConfigRules(
    compat.config({
      extends: ["plugin:ssr-friendly/recommended"],
      rules: {
        "ssr-friendly/no-dom-globals-in-react-cc-render": "off",
      },
    }),
  ).map((config) => ({
    ...config,
    files,
    name: config.name ?? "nirtamir2/solid/ssr-friendly",
  }));
}

async function solidReactDisables(
  files: Array<string>,
): Promise<TypedFlatConfigItem> {
  const pluginReact = await interopDefault(
    import("@eslint-react/eslint-plugin"),
  );

  return {
    files,
    name: "nirtamir2/solid/react-rules-off",
    plugins: {
      "@eslint-react": pluginReact,
    },
    rules: {
      "@eslint-react/no-unstable-context-value": "off",
      "react-refresh/only-export-components": "off",
      "react/jsx-no-constructed-context-values": "off",
      "react/no-unknown-property": "off",
    },
  };
}
