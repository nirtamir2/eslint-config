import type { FlatGitignoreOptions } from "eslint-config-flat-gitignore";
import type { OxlintConfig } from "oxlint";

export type OxlintRules = NonNullable<OxlintConfig["rules"]>;
export type OxlintGitignoreOptions = FlatGitignoreOptions;
export type OxlintIgnoreOption =
  Array<string> | ((defaults: Array<string>) => Array<string>);

export interface OxlintOverridesOptions {
  /**
  Oxlint-native rules applied only to this integration's files.
  */
  overrides?: OxlintRules;
}

export interface OxlintE18eOptions extends OxlintOverridesOptions {
  /**
  Include modernization rules.
  */
  modernization?: boolean;
  /**
  Include module-replacement rules.
  */
  moduleReplacements?: boolean;
  /**
  Include performance-improvement rules.
  */
  performanceImprovements?: boolean;
}

export interface OxlintTypeScriptOptions extends OxlintOverridesOptions {
  /**
  Enable the erasable-syntax-only rules.
  */
  erasableOnly?: boolean;
  /**
  Oxlint file globs for native type-aware rules.
  */
  filesTypeAware?: Array<string>;
  /**
  Exclusion globs for type-aware rules and the final TypeScript rule maps.
  Matching ESLint, these still affect the final maps when `typeAware` is false.
  */
  ignoresTypeAware?: Array<string>;
  /**
  Rule overrides applied only to the type-aware scope.
  */
  overridesTypeAware?: OxlintRules;
  /**
  Enable Oxlint's type-aware rules through `oxlint-tsgolint`.
  */
  typeAware?: boolean;
}

export interface OxlintStylisticOptions extends OxlintOverridesOptions {
  /**
  Choose brace placement.
  */
  braceStyle?: "1tbs" | "allman" | "stroustrup";
  /**
  Enable the Stylistic experimental rules.
  */
  experimental?: boolean;
  /**
  Choose a numeric indentation width or tabs.
  */
  indent?: number | "tab";
  /**
  Enable JSX stylistic rules. Defaults to the top-level `jsx` feature.
  */
  jsx?: boolean;
  /**
  Choose the preferred quote style.
  */
  quotes?: "backtick" | "double" | "single";
  /**
  Require or omit semicolons.
  */
  semi?: boolean;
}

export interface OxlintVueOptions extends OxlintOverridesOptions {
  /**
  Select the Vue 2 or Vue 3 script-rule preset.
  */
  vueVersion?: 2 | 3;
}

export interface OxlintUnicornOptions extends OxlintOverridesOptions {
  /**
  Use the full ESLint Unicorn recommended source before migration.
  */
  allRecommended?: boolean;
}

export interface OxlintRegExpOptions extends OxlintOverridesOptions {
  /**
  Emit RegExp diagnostics as warnings instead of errors.
  */
  level?: "error" | "warn";
}

export interface OxlintTailwindOptions extends OxlintOverridesOptions {
  /**
  Tailwind CSS entry file consumed by eslint-plugin-better-tailwindcss.
  */
  entryPoint?: string;
}

export interface OxlintUnoCSSOptions extends OxlintOverridesOptions {
  /**
  Enable UnoCSS attributify ordering.
  */
  attributify?: boolean;
  /**
  Enable errors for blocklisted UnoCSS utilities.
  */
  strict?: boolean;
}

export interface OxlintOptions {
  /**
  Enable Angular TypeScript rules. Angular templates are not linted.
  */
  angular?: boolean | OxlintOverridesOptions;
  /**
  Enable the JavaScript-plugin-backed e18e rules.
  */
  e18e?: boolean | OxlintE18eOptions;
  /**
  Load `.gitignore`-compatible files into Oxlint's ignore patterns.
  */
  gitignore?: boolean | OxlintGitignoreOptions;
  /**
  Additional project-relative ignore globs.
  */
  ignores?: OxlintIgnoreOption;
  /**
  Enable the i18next JavaScript and TypeScript rule subset, including JSX/TSX.
  */
  i18n?: boolean;
  /**
  Override editor-environment detection for generated severity variants.
  */
  isInEditor?: boolean;
  /**
  Override JavaScript-base rules before optional integrations are composed.
  */
  javascript?: OxlintOverridesOptions;
  /**
  Enable the generated JSDoc fragment.
  */
  jsdoc?: boolean | OxlintOverridesOptions;
  /**
  Enable the generated JSX accessibility fragment.
  */
  jsx?: boolean;
  /**
  Use the less-opinionated Stylistic branch.
  */
  lessOpinionated?: boolean;
  /**
  Enable the generated Next.js fragment.
  */
  nextjs?: boolean | OxlintOverridesOptions;
  /**
  Enable JavaScript-plugin-backed import and export sorting rules.
  */
  perfectionist?: boolean | OxlintOverridesOptions;
  /**
  Enable TanStack Query rules.
  */
  query?: boolean | OxlintOverridesOptions;
  /**
  Enable the generated React fragment.
  */
  react?: boolean | OxlintOverridesOptions;
  /**
  Enable the JavaScript-plugin-backed RegExp rules.
  */
  regexp?: boolean | OxlintRegExpOptions;
  /**
  Oxlint-native rules applied after every generated fragment.
  */
  rules?: OxlintRules;
  /**
  Enable JavaScript security rules.
  */
  security?: boolean | OxlintOverridesOptions;
  /**
  Enable Solid rules for JSX and TSX files.
  */
  solid?: boolean | OxlintOverridesOptions;
  /**
  Enable Storybook rules.
  */
  storybook?: boolean;
  /**
  Enable JavaScript stylistic rules.
  */
  stylistic?: boolean | OxlintStylisticOptions;
  /**
  Enable Tailwind CSS class rules.
  */
  tailwindcss?: boolean | OxlintTailwindOptions;
  /**
  Enable the generated Vitest fragment.
  */
  test?: boolean | OxlintOverridesOptions;
  /**
  Select application or library rule variants.
  */
  type?: "app" | "lib";
  /**
  Enable the generated TypeScript fragment.
  */
  typescript?: boolean | OxlintTypeScriptOptions;
  /**
  Enable TSDoc syntax rules for TypeScript files.
  */
  tsdoc?: boolean | OxlintOverridesOptions;
  /**
  Enable UnoCSS rules.
  */
  unocss?: boolean | OxlintUnoCSSOptions;
  /**
  Enable the generated Unicorn fragment.
  */
  unicorn?: boolean | OxlintUnicornOptions;
  /**
  Enable generated Vue script-block rules.
  */
  vue?: boolean | OxlintVueOptions;
  /**
  Enable Zod import rules.
  */
  zod?: boolean | OxlintOverridesOptions;
}
