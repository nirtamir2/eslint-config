import type {
  OptionsFiles,
  OptionsOverrides,
  OptionsTypeScriptWithTypes,
  TypedFlatConfigItem,
} from "../types";
import { fixupConfigRules } from "@eslint/compat";
import { isPackageExists } from "local-pkg";
import { compat } from "../compat";
import { GLOB_JS, GLOB_JSX, GLOB_SRC, GLOB_TS } from "../globs";
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
  const tsconfigPath = options.tsconfigPath
    ? toArray(options.tsconfigPath)
    : undefined;
  const isTypeAware = Boolean(tsconfigPath);

  await ensurePackages([
    "@eslint-react/eslint-plugin",
    isTypeAware ? "eslint-plugin-classname-components" : undefined,
    "eslint-plugin-react-you-might-not-need-an-effect",
    "eslint-plugin-react-refresh",
  ]);

  const [
    pluginReact,
    pluginReactRefresh,
    parserTs,
    pluginReactYouMightNotNeedAnEffect,
    pluginStylistic,
    classnameComponentsConfig,
  ] = await Promise.all([
    interopDefault(import("@eslint-react/eslint-plugin")),
    interopDefault(import("eslint-plugin-react-refresh")),
    interopDefault(import("@typescript-eslint/parser")),
    interopDefault(import("eslint-plugin-react-you-might-not-need-an-effect")),
    interopDefault(import("@stylistic/eslint-plugin")),
    isTypeAware
      ? interopDefault(import("eslint-plugin-classname-components/config"))
      : Promise.resolve(undefined),
  ] as const);

  const isUsingNext = isPackageExists("next");
  const isAllowConstantExport = ReactRefreshAllowConstantExportPackages.some(
    (i) => isPackageExists(i),
  ) && !isUsingNext;
  const isUsingRemix = RemixPackages.some((i) => isPackageExists(i));
  const eslintReactConfig = isTypeAware
    ? pluginReact.configs["strict-type-checked"]
    : pluginReact.configs["strict-typescript"];
  const classnameComponentsTypeAwareConfig = classnameComponentsConfig?.({
    strict: true,
  });

  return [
    {
      name: "antfu/react/setup",
      plugins: {
        "@eslint-react": pluginReact,
        style: pluginStylistic,

        "react-refresh": pluginReactRefresh,
        "react-you-might-not-need-an-effect":
          pluginReactYouMightNotNeedAnEffect,
      },
      settings: {
        ...(eslintReactConfig.settings ?? {}),
        react: { version: "detect" },
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
          projectService: true,
        },
        sourceType: "module",
      },
      name: "nirtamir2/react/rules-eslint-react",
      rules: {
        ...eslintReactConfig.rules,
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
    ...(classnameComponentsTypeAwareConfig
      ? [
          {
            ...classnameComponentsTypeAwareConfig,
            files,
            ignores: [GLOB_JS, GLOB_JSX, GLOB_TS],
            name: "nirtamir2/react/classname-components",
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
