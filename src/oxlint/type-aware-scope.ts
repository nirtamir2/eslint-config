import type { OxlintConfig } from "oxlint";
import { GLOB_ASTRO_TS, GLOB_MARKDOWN } from "../globs";

export const defaultTypeAwareFiles = [
  "**/*.{ts,mts,cts}",
  "**/*.{tsx,mtsx,ctsx}",
] as const;
export const defaultTypeAwareExcludes = [
  `${GLOB_MARKDOWN}/**`,
  GLOB_ASTRO_TS,
] as const;

export const typeAwareFilesPlaceholder = "**/__nirtamir2_type_aware_files__.ts";
export const typeAwareExcludesPlaceholder =
  "**/__nirtamir2_type_aware_excludes__.ts";

function replaceScope(
  patterns: Array<string>,
  placeholder: string,
  replacement: ReadonlyArray<string>,
): Array<string> {
  return patterns.flatMap((pattern) =>
    pattern === placeholder ? replacement : [pattern],
  );
}

/**
 * Replace generator-only sentinels without changing unrelated TS scopes.
 */
export function applyTypeAwareScope(
  config: OxlintConfig,
  files: ReadonlyArray<string>,
  excludeFiles: ReadonlyArray<string>,
): OxlintConfig {
  return {
    ...config,
    ...(config.overrides != null && {
      overrides: config.overrides.map((override) => ({
        ...override,
        files: replaceScope(override.files, typeAwareFilesPlaceholder, files),
        ...(override.excludeFiles != null && {
          excludeFiles: replaceScope(
            override.excludeFiles,
            typeAwareExcludesPlaceholder,
            excludeFiles,
          ),
        }),
      })),
    }),
  };
}

/**
 * Retarget the final TypeScript rule maps that ESLint excludes through
 * `ignoresTypeAware` even when parser services are disabled.
 */
export function applyStandardTypeScriptExcludes(
  config: OxlintConfig,
  excludeFiles: ReadonlyArray<string>,
): OxlintConfig {
  let matches = 0;
  const overrides = config.overrides?.map((override) => {
    if (
      override.excludeFiles?.length !== defaultTypeAwareExcludes.length ||
      defaultTypeAwareExcludes.some(
        (pattern, index) => override.excludeFiles?.[index] !== pattern,
      )
    )
      return override;

    matches += 1;
    return { ...override, excludeFiles: [...excludeFiles] };
  });

  if (matches !== 2)
    throw new Error(
      `Generated standard TypeScript exclusion scope matched ${String(matches)} overrides`,
    );

  return { ...config, overrides };
}
