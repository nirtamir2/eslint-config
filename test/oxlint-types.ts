import type { OxlintConfig } from "oxlint";
import oxlint, { recommended } from "../src/oxlint";
import type { OxlintOptions, OxlintRules } from "../src/oxlint";

const rules = {
  eqeqeq: "error",
  "typescript/no-explicit-any": "warn",
} satisfies OxlintRules;

const options = {
  angular: { overrides: rules },
  e18e: {
    modernization: false,
    moduleReplacements: true,
    overrides: rules,
    performanceImprovements: false,
  },
  gitignore: { recursive: { skipDirs: ["vendor"] }, strict: false },
  ignores: (defaults) => [...defaults, "generated/**"],
  i18n: true,
  isInEditor: false,
  javascript: { overrides: rules },
  jsdoc: { overrides: rules },
  jsx: true,
  lessOpinionated: true,
  nextjs: { overrides: rules },
  perfectionist: { overrides: rules },
  query: { overrides: rules },
  react: { overrides: rules },
  regexp: { level: "warn", overrides: rules },
  rules,
  security: { overrides: rules },
  solid: { overrides: rules },
  storybook: true,
  stylistic: {
    braceStyle: "allman",
    experimental: true,
    indent: 4,
    jsx: false,
    overrides: rules,
    quotes: "single",
    semi: false,
  },
  tailwindcss: { entryPoint: "src/app.css", overrides: rules },
  test: { overrides: rules },
  type: "lib",
  typescript: {
    erasableOnly: false,
    filesTypeAware: ["src/**/*.ts"],
    ignoresTypeAware: ["src/generated/**"],
    overrides: rules,
    overridesTypeAware: rules,
    typeAware: true,
  },
  tsdoc: { overrides: rules },
  unocss: { attributify: true, overrides: rules, strict: true },
  unicorn: { allRecommended: false, overrides: rules },
  vue: { overrides: rules, vueVersion: 2 },
  zod: { overrides: rules },
} satisfies OxlintOptions;

const config: OxlintConfig = oxlint(options, recommended, { rules });
void config;

// @ts-expect-error ESLint-only option
oxlint({ markdown: true });
// @ts-expect-error ESLint type-aware option is replaced by typeAware
oxlint({ typescript: { tsconfigPath: "tsconfig.json" } });
// @ts-expect-error trailing configs must use the Oxlint schema
oxlint({}, { languageOptions: { parserOptions: {} } });
