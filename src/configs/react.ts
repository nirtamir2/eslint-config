import type {
  OptionsFiles,
  OptionsOverrides,
  OptionsTypeScriptWithTypes,
  TypedFlatConfigItem,
} from "../types";
import { fixupConfigRules } from "@eslint/compat";
import { isPackageExists } from "local-pkg";
import { compat } from "../compat";
import { GLOB_SRC } from "../globs";
import { ensurePackages, interopDefault, toArray } from "../utils";
import { a11y } from "./a11y";

// react refresh
const ReactRefreshAllowConstantExportPackages = ["vite"];
const RemixPackages = [
  "@remix-run/node",
  "@remix-run/react",
  "@remix-run/serve",
  "@remix-run/dev",
];

export async function react(
  options: OptionsTypeScriptWithTypes & OptionsOverrides & OptionsFiles = {},
): Promise<Array<TypedFlatConfigItem>> {
  const { overrides = {}, files = [GLOB_SRC] } = options;

  await ensurePackages([
    "@eslint-react/eslint-plugin",
    "eslint-plugin-react-you-might-not-need-an-effect",
    "eslint-plugin-react-refresh",
  ]);

  const tsconfigPath = options.tsconfigPath
    ? toArray(options.tsconfigPath)
    : undefined;
  const isTypeAware = Boolean(tsconfigPath);

  const [
    pluginReact,
    pluginReactRefresh,
    parserTs,
    pluginReactYouMightNotNeedAnEffect,
    pluginStylistic,
  ] = await Promise.all([
    interopDefault(import("@eslint-react/eslint-plugin")),
    interopDefault(import("eslint-plugin-react-refresh")),
    interopDefault(import("@typescript-eslint/parser")),
    interopDefault(import("eslint-plugin-react-you-might-not-need-an-effect")),
    interopDefault(import("@stylistic/eslint-plugin")),
  ] as const);

  const isUsingNext = isPackageExists("next");
  const isAllowConstantExport = ReactRefreshAllowConstantExportPackages.some(
    (i) => isPackageExists(i),
  ) && !isUsingNext;
  const isUsingRemix = RemixPackages.some((i) => isPackageExists(i));

  const { plugins } = pluginReact.configs.all as any;

  return [
    {
      name: "antfu/react/setup",
      plugins: {
        "@eslint-react": plugins["@eslint-react"],
        "@eslint-react/dom": plugins["@eslint-react/dom"],
        "@eslint-react/naming-convention":
          plugins["@eslint-react/naming-convention"],
        "@eslint-react/web-api": plugins["@eslint-react/web-api"],
        "@eslint-react/rsc": plugins["@eslint-react/rsc"],
        style: pluginStylistic,

        "react-refresh": pluginReactRefresh,
        "react-you-might-not-need-an-effect":
          pluginReactYouMightNotNeedAnEffect,
      },
      settings: { react: { version: "detect" } },
    },
    {
      files,
      languageOptions: {
        parser: parserTs,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          projectService: true,
        },
        sourceType: "module",
      },
      name: "nirtamir2/react/rules-eslint-react",
      rules: {
        ...(isTypeAware
          ? pluginReact.configs["recommended-type-checked"].rules
          : pluginReact.configs["recommended-typescript"].rules),
        "@eslint-react/dom/no-unknown-property": "error",
        "@eslint-react/dom/no-unsafe-target-blank": "error",
        "@eslint-react/jsx-no-comment-textnodes": "error",
        "@eslint-react/no-children-prop": "error",
        "@eslint-react/no-unstable-context-value": "error",
        "@eslint-react/no-unsafe-component-will-mount": "error",
        "@eslint-react/no-unsafe-component-will-receive-props": "error",
        "@eslint-react/no-unsafe-component-will-update": "error",
        "@eslint-react/no-useless-fragment": "error",
        "@eslint-react/prefer-namespace-import": "error",
        "style/jsx-curly-brace-presence": [
          "error",
          { props: "never", children: "never" },
        ],
        "style/jsx-pascal-case": [
          "error",
          {
            allowLeadingUnderscore: true,
            allowNamespace: true,
          },
        ],
      },
    },
    {
      name: "antfu/react/rules",
      files,
      languageOptions: {
        parser: parserTs,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          projectService: true,
        },
        sourceType: "module",
      },
      rules: {
        // react refresh
        "react-refresh/only-export-components": [
          "warn",
          {
            allowConstantExport: isAllowConstantExport,
            allowExportNames: [
              ...(isUsingRemix
                ? ["meta", "links", "headers", "loader", "action"]
                : []),
            ],
          },
        ],

        // overrides
        ...overrides,
      },
    },
    pluginReactYouMightNotNeedAnEffect.configs.recommended,
    ...(isTypeAware
      ? [
          {
            files,
            languageOptions: {
              parser: parserTs,
              parserOptions: {
                ecmaFeatures: {
                  jsx: true,
                },
                projectService: true,
              },
              sourceType: "module",
            },
            name: "nirtamir2/react/type-aware-rules",
            rules: {
              "@eslint-react/no-leaked-conditional-rendering": "error",
            },
          },
        ]
      : []),
    ...fixupConfigRules(
      compat.config({
        extends: ["plugin:ssr-friendly/recommended"],
        rules: {
          "ssr-friendly/no-dom-globals-in-react-cc-render": "off", // I don't use class components
        },
      }) as never,
    ),
    ...a11y(),
  ];
}
