import type { OxlintConfig, OxlintOverride } from "oxlint";
import type { TypedFlatConfigItem } from "../../src/types";

/**
 * Any value that can appear inside an Oxlint or ESLint config once it has been reduced
 * to plain JSON, which is the only shape this module walks.
 */
export type ConfigValue =
  | Array<ConfigValue>
  | boolean
  | null
  | number
  | string
  | { [key: string]: ConfigValue | undefined };

/**
A config section keyed by property name, such as a rule map.
*/
export type ConfigRecord = Record<string, ConfigValue | undefined>;

/**
 * Reinterpret a schema-typed config object as the plain JSON this module walks.
 *
 * Oxlint and ESLint config types are JSON schema types — no methods, classes or
 * symbols — but TypeScript will not assign an interface to an index-signature type,
 * so the conversion is stated once here instead of at every call site.
 */
function asConfigValue<TValue>(value: TValue): ConfigValue {
  // SAFETY: callers pass config data that is about to be serialized as JSON.
  return value as ConfigValue;
}

/**
Array form of {@link asConfigValue}.
*/
function asConfigValues<TValue>(
  values: ReadonlyArray<TValue>,
): Array<ConfigValue> {
  return values.map((value) => asConfigValue(value));
}

const scopeMarkerPrefix = "__nirtamir2_oxlint_scope_";
const mergeableObjectKeys = [
  "categories",
  "env",
  "globals",
  "options",
  "rules",
  "settings",
] as const;
const mergeableArrayKeys = [
  "ignorePatterns",
  "jsPlugins",
  "plugins",
] as const;
const oxlintGlobTranslations = [
  [
    "?([cm])[jt]s?(x)",
    "{js,jsx,mjs,mjsx,cjs,cjsx,ts,tsx,mts,mtsx,cts,ctsx}",
  ],
  ["?([cm])jsx", "{jsx,mjsx,cjsx}"],
  ["?([cm])tsx", "{tsx,mtsx,ctsx}"],
  ["?([cm])js", "{js,mjs,cjs}"],
  ["?([cm])ts", "{ts,mts,cts}"],
  ["ts?(x)", "{ts,tsx}"],
  ["js?(x)", "{js,jsx}"],
  ["auto-import?(s)", "{auto-import,auto-imports}"],
] as const;

interface SourceScope {
  excludeFiles?: Array<string>;
  files: Array<string>;
}

export interface PreparedMigrationSource {
  configs: Array<TypedFlatConfigItem>;
  scopes: ReadonlyMap<string, SourceScope>;
}

export function translateOxlintGlob(glob: string): string {
  let translated = glob;
  for (const [extglob, braceGlob] of oxlintGlobTranslations) {
    translated = translated.replaceAll(extglob, () => braceGlob);
  }

  if (translated.includes("?(")) {
    throw new Error(`Unsupported ESLint extglob in Oxlint generation: ${glob}`);
  }
  return translated;
}

export function translateOxlintGlobs(globs: Array<string>): Array<string> {
  return globs.map((glob) => translateOxlintGlob(glob));
}

function hasRules(config: TypedFlatConfigItem): boolean {
  return config.rules != null && Object.keys(config.rules).length > 0;
}

function normalizeSourceFiles(
  files: NonNullable<TypedFlatConfigItem["files"]>,
): Array<string> {
  if (files.some((file) => Array.isArray(file))) {
    throw new TypeError(
      "Oxlint generation does not support ESLint AND file globs",
    );
  }

  // SAFETY: the guard above rejected every nested AND-glob array, so only strings remain.
  return files as Array<string>;
}

export function prepareMigrationSource(
  source: Array<TypedFlatConfigItem>,
  defaultRuleFiles?: Array<string>,
): PreparedMigrationSource {
  const scopes = new Map<string, SourceScope>();
  const configs = source
    .filter(
      (config): config is TypedFlatConfigItem =>
        config != null && !Array.isArray(config),
    )
    .map((config, index) => {
      const clone = {
        ...config,
        ...(config.rules != null && {
              rules: Object.fromEntries(
                Object.entries(config.rules).map(([rule, value]) => [
                  rule,
                  Array.isArray(value) ? [...value] : value,
                ]),
              ),
            }),
      };

      if (clone.files == null && defaultRuleFiles != null && hasRules(clone)) {
        clone.files = [...defaultRuleFiles];
      }

      if (clone.files == null) {
        if (clone.ignores != null) clone.ignores = [...clone.ignores];
        return clone;
      }

      const files = normalizeSourceFiles(clone.files);
      const marker = `${scopeMarkerPrefix}${String(index).padStart(4, "0")}__`;
      scopes.set(marker, {
        ...(clone.ignores != null && { excludeFiles: [...clone.ignores] }),
        files: [...files],
      });
      clone.files = [...files, marker];
      if (clone.ignores != null) clone.ignores = [...clone.ignores];
      return clone;
    });

  return { configs, scopes };
}

function restoreOverrideScope(
  override: OxlintOverride,
  scopes: ReadonlyMap<string, SourceScope>,
): OxlintOverride {
  const markers = override.files.filter((file) => scopes.has(file));
  if (markers.length === 0) return override;
  if (markers.length > 1) {
    throw new Error("A migrated Oxlint override contains multiple scope markers");
  }

  const scope = scopes.get(markers[0]);
  if (scope == null) return override;

  return {
    ...override,
    ...(scope.excludeFiles == null
      ? { excludeFiles: undefined }
      : { excludeFiles: [...scope.excludeFiles] }),
    files: [...scope.files],
  };
}

export function restoreMigrationScopes(
  config: OxlintConfig,
  scopes: ReadonlyMap<string, SourceScope>,
): OxlintConfig {
  if (config.overrides == null) return config;

  return {
    ...config,
    overrides: config.overrides.map((override) =>
      restoreOverrideScope(override, scopes),
    ),
  };
}

// eslint-disable-next-line sonarjs/function-return-type -- walks arbitrary config JSON
function normalizeRuleValue(value: ConfigValue): ConfigValue {
  const disabledRuleValues = new Set<unknown>([0, "allow", "off"]);
  if (
    Array.isArray(value) &&
    disabledRuleValues.has(value[0])
  ) {
    return "off";
  }
  return value;
}

function normalizeRules(
  rules: ConfigRecord | undefined,
): ConfigRecord | undefined {
  if (rules == null) return undefined;
  return Object.fromEntries(
    Object.entries(rules).map(([rule, value]) => [
      rule,
      value === undefined ? undefined : normalizeRuleValue(value),
    ]),
  );
}

function normalizeDisabledRuleArrays(config: OxlintConfig): OxlintConfig {
  // SAFETY: only rule maps are rewritten below; every other key is spread through.
  return {
    ...config,
    // SAFETY: a rule map is a plain JSON object keyed by rule id.
    ...(config.rules != null && { rules: normalizeRules(config.rules as ConfigRecord) }),
    ...(config.overrides != null && {
          overrides: config.overrides.map((override) => ({
            ...override,
            ...(override.rules != null && {
                  // SAFETY: Oxlint override rule maps are plain JSON objects.
                  rules: normalizeRules(override.rules as ConfigRecord),
                }),
          })),
        }),
  } as OxlintConfig;
}

function translateConfigGlobs(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    ...(config.ignorePatterns != null && { ignorePatterns: translateOxlintGlobs(config.ignorePatterns) }),
    ...(config.overrides != null && {
          overrides: config.overrides.map((override) => ({
            ...override,
            ...(override.excludeFiles != null && {
                  excludeFiles: translateOxlintGlobs(override.excludeFiles),
                }),
            files: translateOxlintGlobs(override.files),
          })),
        }),
  };
}

function stripMigrationBaseline(config: OxlintConfig): OxlintConfig {
  const categories = { ...config.categories };
  const environment = { ...config.env };

  if (categories.correctness === "off") delete categories.correctness;
  if (environment.builtin === true) delete environment.builtin;

  return {
    ...config,
    categories,
    env: environment,
  };
}

// eslint-disable-next-line sonarjs/function-return-type -- walks arbitrary config JSON
function removeEmptyValues(value: ConfigValue): ConfigValue | undefined {
  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => removeEmptyValues(entry))
      .filter((entry) => entry !== undefined);
    return entries.length === 0 ? undefined : entries;
  }

  if (value != null && typeof value === "object") {
    const entries = Object.entries(value)
      .map(
        ([key, entry]) =>
          [key, entry === undefined ? undefined : removeEmptyValues(entry)] as const,
      )
      .filter(([, entry]) => entry !== undefined);
    return entries.length === 0 ? undefined : Object.fromEntries(entries);
  }

  return value;
}

function stableValueKey(value: ConfigValue): string {
  return JSON.stringify(value);
}

function sortArrayValues(values: Array<ConfigValue>): Array<ConfigValue> {
  return [
    ...new Map(
      values.map((value) => [stableValueKey(value), value]),
    ).values(),
  ].toSorted((left, right) =>
    stableValueKey(left).localeCompare(stableValueKey(right)),
  );
}

// eslint-disable-next-line sonarjs/function-return-type -- walks arbitrary config JSON
export function sortGeneratedValue(
  value: ConfigValue,
  parentKey?: string,
): ConfigValue {
  if (Array.isArray(value)) {
    const entries = value.map((entry) => sortGeneratedValue(entry));
    return parentKey === "jsPlugins" || parentKey === "plugins"
      ? sortArrayValues(entries)
      : entries;
  }

  if (value != null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [
          key,
          entry === undefined ? undefined : sortGeneratedValue(entry, key),
        ]),
    );
  }

  return value;
}

export function normalizeOxlintConfig(
  input: OxlintConfig,
  stripBaseline: boolean,
): OxlintConfig {
  // SAFETY: widening by one optional key that the Oxlint schema permits but omits.
  const withoutSchema = { ...input } as OxlintConfig & {
    $schema?: string;
  };
  delete withoutSchema.$schema;

  const normalizedRules = normalizeDisabledRuleArrays(withoutSchema);
  const withoutBaseline = stripBaseline
    ? stripMigrationBaseline(normalizedRules)
    : normalizedRules;
  const translatedGlobs = translateConfigGlobs(withoutBaseline);
  const withoutEmptyValues = removeEmptyValues(asConfigValue(translatedGlobs)) ?? {};

  // SAFETY: sorting and pruning preserve the config shape; only key order changes.
  return sortGeneratedValue(withoutEmptyValues) as OxlintConfig;
}

function appendUnique(
  current: Array<ConfigValue> | undefined,
  incoming: Array<ConfigValue>,
): Array<ConfigValue> {
  const values = [...(current ?? []), ...incoming];
  return [...new Map(values.map((value) => [stableValueKey(value), value])).values()];
}

export function mergeOxlintConfigs(
  configs: Array<OxlintConfig>,
): OxlintConfig {
  const result: ConfigRecord = {};

  for (const config of configs) {
    // SAFETY: OxlintConfig is a JSON schema type, so it is structurally a ConfigRecord.
    const record = config as ConfigRecord;

    for (const key of mergeableObjectKeys) {
      const value = record[key];
      if (value == null) continue;
      result[key] = {
        // SAFETY: mergeableObjectKeys only names keys whose schema type is an object.
        ...(result[key] as ConfigRecord | undefined),
        // SAFETY: as above, for the incoming config's value at the same key.
        ...(value as ConfigRecord),
      };
    }

    for (const key of mergeableArrayKeys) {
      const value = record[key];
      if (!Array.isArray(value)) continue;
      // SAFETY: mergeableArrayKeys only names keys whose schema type is an array.
      result[key] = appendUnique(result[key] as Array<ConfigValue>, value);
    }

    if (config.overrides != null) {
      result.overrides = [
        // SAFETY: `overrides` is only ever written by this branch, as an override array.
        ...((result.overrides as Array<ConfigValue> | undefined) ?? []),
        ...asConfigValues(config.overrides),
      ];
    }
  }

  return normalizeOxlintConfig(result, false);
}

export function countConfiguredRules(config: OxlintConfig): number {
  return (
    Object.keys(config.rules ?? {}).length +
    (config.overrides ?? []).reduce(
      (count, override) => count + Object.keys(override.rules ?? {}).length,
      0,
    )
  );
}
