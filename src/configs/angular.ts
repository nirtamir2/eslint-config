import type { OptionsOverrides, Rules, TypedFlatConfigItem } from "../types";
import { GLOB_HTML, GLOB_TS } from "../globs";
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

  Object.entries(overrides).forEach(([key, value]) => {
    if (key.startsWith("@angular-eslint/")) {
      angularTsRules[key] = value;
    }

    if (key.startsWith("@angular-eslint/template/")) {
      angularTemplateRules[key] = value;
    }
  });

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
      processor: pluginAngularTemplate.processors[
        "extract-inline-html"
      ] as TypedFlatConfigItem["processor"],
      rules: {
        "@angular-eslint/contextual-lifecycle": "error",
        "@angular-eslint/no-empty-lifecycle-method": "error",
        "@angular-eslint/no-input-rename": "error",
        "@angular-eslint/no-inputs-metadata-property": "error",
        "@angular-eslint/no-output-native": "error",
        "@angular-eslint/no-output-on-prefix": "error",
        "@angular-eslint/no-output-rename": "error",
        "@angular-eslint/no-outputs-metadata-property": "error",
        "@angular-eslint/prefer-inject": "error",
        "@angular-eslint/prefer-standalone": "error",
        "@angular-eslint/use-lifecycle-interface": "error",
        "@angular-eslint/use-pipe-transform-interface": "error",
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
        "@angular-eslint/template/banana-in-box": "error",
        "@angular-eslint/template/eqeqeq": "error",
        "@angular-eslint/template/no-negated-async": "error",
        "@angular-eslint/template/prefer-control-flow": "error",
        "@stylistic/indent": "off",
        "@stylistic/no-multiple-empty-lines": ["error", { max: 1 }],
        "@stylistic/no-trailing-spaces": "off",
        ...angularTemplateRules,
      },
    },
  ];
}
