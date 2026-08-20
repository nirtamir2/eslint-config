import { GLOB_HTML, GLOB_TS } from "../globs";
import type { OptionsOverrides, Rules, TypedFlatConfigItem } from "../types";
import { ensurePackages, interopDefault } from "../utils";

export async function angular(
  options: OptionsOverrides = {},
): Promise<Array<TypedFlatConfigItem>> {
  const { overrides = {} } = options;

  await ensurePackages([
    "@angular-eslint/eslint-plugin",
    "@angular-eslint/eslint-plugin-template",
    "@angular-eslint/template-parser",
  ]);

  const [pluginAngular, pluginAngularTemplate, parserAngularTemplate] =
    await Promise.all([
      interopDefault(import("@angular-eslint/eslint-plugin")),
      interopDefault(import("@angular-eslint/eslint-plugin-template")),
      interopDefault(import("@angular-eslint/template-parser")),
    ] as const);

  const angularTsRules: Rules = {};
  const angularTemplateRules: Rules = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (key.startsWith("@angular-eslint/")) {
      angularTsRules[key] = value;
    }

    if (key.startsWith("@angular-eslint/template/")) {
      angularTemplateRules[key] = value;
    }
  }

  const angularRecommendedRules = Object.fromEntries(
    Object.entries(pluginAngular.rules)
      .filter(([, rule]) => rule.meta.docs?.recommended === "recommended")
      .map(([name]) => [`@angular-eslint/${name}`, "error"]),
  );
  const angularTemplateRecommendedRules = Object.fromEntries(
    Object.entries(pluginAngularTemplate.rules)
      .filter(([, rule]) => rule.meta.docs?.recommended === "recommended")
      .map(([name]) => [`@angular-eslint/template/${name}`, "error"]),
  );

  return [
    {
      name: "antfu/angular/setup",
      plugins: {
        "@angular-eslint": pluginAngular,
        "@angular-eslint/template": pluginAngularTemplate,
      },
    },
    {
      files: [GLOB_TS],
      name: "antfu/angular/rules/ts",
      // SAFETY: eslint-plugin-angular-template ships this processor untyped; it is a
      // standard ESLint processor object.
      processor: pluginAngularTemplate.processors[
        "extract-inline-html"
      ] as TypedFlatConfigItem["processor"],
      rules: {
        ...angularRecommendedRules,
        "@angular-eslint/prefer-inject": "error",
        "@angular-eslint/prefer-standalone": "error",
        "@angular-eslint/use-lifecycle-interface": "error",
        ...angularTsRules,
      },
    },
    {
      files: [GLOB_HTML],
      languageOptions: {
        parser: parserAngularTemplate,
      },
      name: "antfu/angular/rules/template",
      rules: {
        ...angularTemplateRecommendedRules,
        "@stylistic/indent": "off",
        "@stylistic/no-multiple-empty-lines": ["error", { max: 1 }],
        "@stylistic/no-trailing-spaces": "off",
        ...angularTemplateRules,
      },
    },
  ];
}
