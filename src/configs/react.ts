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
    "eslint-plugin-react",
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
  ] = await Promise.all([
    interopDefault(import("@eslint-react/eslint-plugin")),
    interopDefault(import("eslint-plugin-react-refresh")),
    interopDefault(import("@typescript-eslint/parser")),
    interopDefault(import("eslint-plugin-react-you-might-not-need-an-effect")),
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
        "@eslint-react/prefer-namespace-import": "error",
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
    ...fixupConfigRules(
      compat.config({
        extends: "plugin:react/recommended",
        rules: {
          // #region react
          "react/jsx-no-leaked-render": [
            "error",
            { validStrategies: ["ternary"] },
          ],

          // https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/jsx-sort-props.md
          "react/jsx-sort-props": [
            "error",
            {
              callbacksLast: true,
              shorthandFirst: true,
              // "shorthandLast": <boolean>,
              // "ignoreCase": <boolean>,
              noSortAlphabetically: true,
              reservedFirst: true,
            },
          ],
          "react/jsx-key": [
            1,
            { checkFragmentShorthand: true, checkKeyMustBeforeSpread: true },
          ],
          "react/display-name": 0,
          "react/prop-types": 0,
          "react/jsx-pascal-case": [
            2,
            {
              allowLeadingUnderscore: true,
              allowNamespace: true,
            },
          ],
          "react/jsx-no-constructed-context-values": 2,
          "react/jsx-no-useless-fragment": 2,
          "react/jsx-handler-names": 2,
          "react/jsx-no-duplicate-props": 2,
          "react/jsx-curly-brace-presence": [
            2,
            { props: "never", children: "never" },
          ],

          // As of React 16.14 and 17
          // https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html#eslint
          "react/react-in-jsx-scope": 0,
          "react/jsx-uses-react": 0,

          // #endregion react
        },
      }),
    ),
    ...fixupConfigRules(compat.extends("plugin:react/jsx-runtime")),
    ...a11y(),
  ];
}
