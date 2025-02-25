import { fixupConfigRules } from "@eslint/compat";
import path from "node:path";
import { compat } from "../compat";
import type { TypedFlatConfigItem } from "../types";
import { ensurePackages, interopDefault } from "../utils";

export async function i18n(): Promise<Array<TypedFlatConfigItem>> {
  await ensurePackages([
    "eslint-plugin-i18n-checker",
    "eslint-plugin-i18n-json",
    "eslint-plugin-i18n-prefix",
    "",
    "@naturacosmeticos/eslint-plugin-i18n-checker",
  ]);

  const [i18next] = await Promise.all([
    interopDefault(import("eslint-plugin-i18next")),
  ] as const);

  return [
    i18next.configs["flat/recommended"],
    ...fixupConfigRules(
      compat.config({
        extends: ["plugin:i18next/recommended"],
        plugins: ["@naturacosmeticos/i18n-checker"],
        rules: {
          /**
           * This will error if `t` function called with a translation key
           * that does not exist in translation files
           */
          "@naturacosmeticos/i18n-checker/path-in-locales": [
            "error",
            {
              localesPath: "locales/",
              messagesBasePath: "translations",
              translationFunctionName: "t",
            },
          ],
          /**
           * i18n translation should be the same as component name
           */
          "i18n-prefix/i18n-prefix": [
            "error",
            {
              translationFunctionName: "t",
              delimiter: ".",
              ignorePrefixes: ["enum"],
            },
          ],
        },
        overrides: [
          {
            files: ["**/locales/**/*.json"],
            extends: ["plugin:i18n-json/recommended"],
            rules: {
              "i18n-json/valid-message-syntax": [
                "error",
                {
                  /**
                   * This allows using the i18next format with {param} syntax
                   * @see https://github.com/godaddy/eslint-plugin-i18n-json/issues/40#issuecomment-842474651
                   */
                  syntax: path.resolve("./i18next-syntax-validator.mjs"),
                },
              ],
            },
          },
        ],
      }),
    ),
    {
      name: "nirtamir2/i18n/storybook",
      files: ["**.stories.tsx"],
      rules: {
        "i18next/no-string-literal": "off",
      },
    },
  ];
}
