import type { OxlintConfig } from "oxlint";

export type OxlintRules = NonNullable<OxlintConfig["rules"]>;

export interface OxlintOverridesOptions {
  /**
  Oxlint-native rules applied only to this integration's files.
  */
  overrides?: OxlintRules;
}

export interface OxlintAntiSlopOptions extends OxlintOverridesOptions {
  /**
  Report anti-slop findings as warnings instead of errors.
  */
  level?: "error" | "warn";
  /**
   * Load a vendored copy of the plugin instead of the one bundled with this package.
   *
   * Accepts anything Oxlint accepts as a plugin specifier: a path relative to the
   * Oxlint config file, an absolute path, or a package name.
   */
  specifier?: string;
}

export interface OxlintTypeScriptOptions extends OxlintOverridesOptions {
  /**
  Enable Oxlint's type-aware rules through `oxlint-tsgolint`.
  */
  typeAware?: boolean;
}

export interface OxlintUnicornOptions extends OxlintOverridesOptions {
  /**
  Use the full ESLint Unicorn recommended source before migration.
  */
  allRecommended?: boolean;
}

export interface OxlintOptions {
  /**
   * Enable Dillon Mulroy's anti-slop rules through Oxlint's JS plugin support.
   *
   * @default false
   * @see https://github.com/dmmulroy/anti-slop
   */
  antiSlop?: boolean | OxlintAntiSlopOptions;
  /**
  Additional project-relative ignore globs.
  */
  ignores?: Array<string>;
  /**
  Enable the native JSDoc fragment.
  */
  jsdoc?: boolean | OxlintOverridesOptions;
  /**
  Enable the native JSX accessibility fragment.
  */
  jsx?: boolean;
  /**
  Enable the native Next.js fragment.
  */
  nextjs?: boolean | OxlintOverridesOptions;
  /**
  Enable the native React fragment.
  */
  react?: boolean | OxlintOverridesOptions;
  /**
  Oxlint-native rules applied after every generated fragment.
  */
  rules?: OxlintRules;
  /**
  Enable the native Vitest fragment.
  */
  test?: boolean | OxlintOverridesOptions;
  /**
  Select application or library rule variants.
  */
  type?: "app" | "lib";
  /**
  Enable the native TypeScript fragment.
  */
  typescript?: boolean | OxlintTypeScriptOptions;
  /**
  Enable the native Unicorn fragment.
  */
  unicorn?: boolean | OxlintUnicornOptions;
  /**
  Enable native Vue script-block rules.
  */
  vue?: boolean | OxlintOverridesOptions;
}
