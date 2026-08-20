export interface PromItem<T> {
  label: string;
  value: T;
  hint?: string;
}

export type FrameworkOption =
  | "vue"
  | "react"
  | "svelte"
  | "astro"
  | "solid"
  | "slidev";

export type ExtraLibrariesOption = "formatter" | "perfectionist" | "unocss";

export interface PromptResult {
  uncommittedConfirmed: boolean;
  frameworks: Array<FrameworkOption>;
  extra: Array<ExtraLibrariesOption>;
  updateVscodeSettings: unknown;
}

/**
 * The parts of a consumer's `package.json` the CLI reads or rewrites.
 *
 * Everything else is preserved verbatim through the `unknown`-valued index signature,
 * which is only ever re-serialized, never inspected.
 */
export interface PackageJsonLike {
  // Unread passthrough keys, preserved verbatim so the CLI never drops a field.
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- passthrough only
  [key: string]: unknown;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  type?: string;
}
