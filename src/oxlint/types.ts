import type { OxlintConfig } from "oxlint";

export type OxlintRules = NonNullable<OxlintConfig["rules"]>;

export interface OxlintOverridesOptions {
  /** Oxlint-native rules applied only to this integration's files. */
  overrides?: OxlintRules;
}

export interface OxlintTypeScriptOptions extends OxlintOverridesOptions {
  /** Enable Oxlint's type-aware rules through `oxlint-tsgolint`. */
  typeAware?: boolean;
}

export interface OxlintUnicornOptions extends OxlintOverridesOptions {
  /** Use the full ESLint Unicorn recommended source before migration. */
  allRecommended?: boolean;
}

export interface OxlintOptions {
  /** Additional project-relative ignore globs. */
  ignores?: Array<string>;
  /** Enable the native JSDoc fragment. */
  jsdoc?: boolean | OxlintOverridesOptions;
  /** Enable the native JSX accessibility fragment. */
  jsx?: boolean;
  /** Enable the native Next.js fragment. */
  nextjs?: boolean | OxlintOverridesOptions;
  /** Enable the native React fragment. */
  react?: boolean | OxlintOverridesOptions;
  /** Oxlint-native rules applied after every generated fragment. */
  rules?: OxlintRules;
  /** Enable the native Vitest fragment. */
  test?: boolean | OxlintOverridesOptions;
  /** Select application or library rule variants. */
  type?: "app" | "lib";
  /** Enable the native TypeScript fragment. */
  typescript?: boolean | OxlintTypeScriptOptions;
  /** Enable the native Unicorn fragment. */
  unicorn?: boolean | OxlintUnicornOptions;
  /** Enable native Vue script-block rules. */
  vue?: boolean | OxlintOverridesOptions;
}
