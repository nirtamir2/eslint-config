import type { OxlintConfig } from "oxlint";
import oxlint, { recommended } from "../src/oxlint";
import type { OxlintOptions, OxlintRules } from "../src/oxlint";

const rules = {
  eqeqeq: "error",
  "typescript/no-explicit-any": "warn",
} satisfies OxlintRules;

const options = {
  antiSlop: { level: "warn", overrides: rules, specifier: "./vendored/index.ts" },
  ignores: ["generated/**"],
  jsdoc: { overrides: rules },
  jsx: true,
  nextjs: { overrides: rules },
  react: { overrides: rules },
  rules,
  test: { overrides: rules },
  type: "lib",
  typescript: { overrides: rules, typeAware: true },
  unicorn: { allRecommended: false, overrides: rules },
  vue: { overrides: rules },
} satisfies OxlintOptions;

const config: OxlintConfig = oxlint(options, recommended, { rules });
void config;

// @ts-expect-error ESLint-only option
oxlint({ markdown: true });
// @ts-expect-error ESLint-only option
oxlint({ stylistic: true });
// @ts-expect-error ESLint type-aware option is replaced by typeAware
oxlint({ typescript: { tsconfigPath: "tsconfig.json" } });
// @ts-expect-error ignores must be static Oxlint globs
oxlint({ ignores: (defaults: Array<string>) => defaults });
// @ts-expect-error trailing configs must use the Oxlint schema
oxlint({}, { languageOptions: { parserOptions: {} } });
// @ts-expect-error anti-slop level is limited to Oxlint severities
oxlint({ antiSlop: { level: "info" } });
// @ts-expect-error anti-slop specifier must be a string
oxlint({ antiSlop: { specifier: 5 } });
// @ts-expect-error anti-slop has no allRecommended switch
oxlint({ antiSlop: { allRecommended: true } });
