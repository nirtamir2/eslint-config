import type { OxlintConfig, OxlintOverride } from "oxlint";
import type { TypedFlatConfigItem } from "../../src/types";

const scopeMarkerPrefix = "__nirtamir2_oxlint_scope_";
const disabledRuleMarker = "__nirtamir2_oxlint_disabled_rule__";
const mergeableObjectKeys = [
  "categories",
  "env",
  "globals",
  "options",
  "rules",
  "settings",
] as const;
const mergeableArrayKeys = ["jsPlugins", "plugins"] as const;
const oxlintGlobTranslations = [
  ["([tj])s?(x)", "{js,jsx,ts,tsx}"],
  ["?([cm])[jt]s?(x)", "{js,jsx,mjs,mjsx,cjs,cjsx,ts,tsx,mts,mtsx,cts,ctsx}"],
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

function isDisabledRuleValue(value: unknown): boolean {
  const severity = Array.isArray(value) ? value[0] : value;
  return severity === 0 || severity === "off";
}

function splitPluginRuleName(
  rule: string,
): { pluginName: string; ruleName: string } | undefined {
  const segments = rule.split("/");
  if (segments.length < 2) return undefined;
  const pluginSegments = rule.startsWith("@") ? 2 : 1;
  return {
    pluginName: segments.slice(0, pluginSegments).join("/"),
    ruleName: segments.slice(pluginSegments).join("/"),
  };
}

function registeredPluginRuleNames(
  source: Array<TypedFlatConfigItem>,
): ReadonlyMap<string, ReadonlySet<string> | undefined> {
  const plugins = new Map<string, ReadonlySet<string> | undefined>();
  for (const config of source) {
    const configuredPlugins = Object.entries(config.plugins ?? {});
    for (const [name, plugin] of configuredPlugins) {
      const rules =
        plugin != null &&
        typeof plugin === "object" &&
        "rules" in plugin &&
        plugin.rules != null &&
        typeof plugin.rules === "object"
          ? new Set(Object.keys(plugin.rules))
          : undefined;
      plugins.set(name, rules);
    }
  }
  return plugins;
}

function canMarkDisabledRule(
  rule: string,
  pluginRules: ReadonlyMap<string, ReadonlySet<string> | undefined>,
): boolean {
  const pluginRule = splitPluginRuleName(rule);
  if (pluginRule == null) return true;
  const registeredRules = pluginRules.get(pluginRule.pluginName);
  return registeredRules == null
    ? !pluginRules.has(pluginRule.pluginName)
    : registeredRules.has(pluginRule.ruleName);
}

export function markDisabledRulesForMigration(
  source: Array<TypedFlatConfigItem>,
): Array<TypedFlatConfigItem> {
  const pluginRules = registeredPluginRuleNames(source);
  return source.map((config) => ({
    ...config,
    ...(config.rules != null && {
      rules: Object.fromEntries(
        Object.entries(config.rules).map(([rule, value]) => [
          rule,
          isDisabledRuleValue(value) && canMarkDisabledRule(rule, pluginRules)
            ? ["warn", { [disabledRuleMarker]: true }]
            : value,
        ]),
      ),
    }),
  }));
}

function hasDisabledRuleMarker(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some(
      (entry) =>
        entry != null &&
        typeof entry === "object" &&
        Object.hasOwn(entry, disabledRuleMarker),
    )
  );
}

function restoreDisabledRuleMarkers(
  rules: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return rules == null
    ? undefined
    : Object.fromEntries(
        Object.entries(rules).map(([rule, value]) => [
          rule,
          hasDisabledRuleMarker(value) ? "off" : value,
        ]),
      );
}

export function restoreDisabledRulesAfterMigration(
  config: OxlintConfig,
): OxlintConfig {
  return {
    ...config,
    ...(config.rules != null && {
      rules: restoreDisabledRuleMarkers(config.rules),
    }),
    ...(config.overrides != null && {
      overrides: config.overrides.map((override) => ({
        ...override,
        ...(override.rules != null && {
          rules: restoreDisabledRuleMarkers(override.rules),
        }),
      })),
    }),
  } as OxlintConfig;
}

export function translateOxlintGlob(glob: string): string {
  let translated = glob;
  for (const [extglob, braceGlob] of oxlintGlobTranslations) {
    translated = translated.replaceAll(extglob, () => braceGlob);
  }
  translated = translated.replaceAll(
    /@\(([^()]*)\)/gu,
    (_match, alternatives) => `{${String(alternatives).replaceAll("|", ",")}}`,
  );

  if (/[!+?*@]\(/u.test(translated)) {
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
    throw new Error(
      "A migrated Oxlint override contains multiple scope markers",
    );
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

function normalizeRuleValue(value: unknown): unknown {
  const disabledRuleValues = new Set<unknown>([0, "allow", "off"]);
  if (Array.isArray(value) && disabledRuleValues.has(value[0])) {
    return "off";
  }
  return value;
}

function normalizeRules(
  rules: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (rules == null) return undefined;
  return Object.fromEntries(
    Object.entries(rules).map(([rule, value]) => [
      rule,
      normalizeRuleValue(value),
    ]),
  );
}

function normalizeDisabledRuleArrays(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    ...(config.rules != null && { rules: normalizeRules(config.rules) }),
    ...(config.overrides != null && {
      overrides: config.overrides.map((override) => ({
        ...override,
        ...(override.rules != null && {
          rules: normalizeRules(override.rules as Record<string, unknown>),
        }),
      })),
    }),
  } as OxlintConfig;
}

function translateConfigGlobs(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    ...(config.ignorePatterns != null && {
      ignorePatterns: translateOxlintGlobs(config.ignorePatterns),
    }),
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

function removeEmptyValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => removeEmptyValues(entry))
      .filter((entry) => entry !== undefined);
    return entries.length === 0 ? undefined : entries;
  }

  if (value != null && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, entry]) => [key, removeEmptyValues(entry)] as const)
      .filter(([, entry]) => entry !== undefined);
    return entries.length === 0 ? undefined : Object.fromEntries(entries);
  }

  return value;
}

function stableValueKey(value: unknown): string {
  return JSON.stringify(value);
}

function sortArrayValues(values: Array<unknown>): Array<unknown> {
  return [
    ...new Map(values.map((value) => [stableValueKey(value), value])).values(),
  ].toSorted((left, right) =>
    stableValueKey(left).localeCompare(stableValueKey(right)),
  );
}

export function sortGeneratedValue(
  value: unknown,
  parentKey?: string,
): unknown {
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
        .map(([key, entry]) => [key, sortGeneratedValue(entry, key)]),
    );
  }

  return value;
}

export function normalizeOxlintConfig(
  input: OxlintConfig,
  stripBaseline: boolean,
): OxlintConfig {
  const withoutSchema = { ...input } as OxlintConfig & {
    $schema?: string;
  };
  delete withoutSchema.$schema;

  const normalizedRules = normalizeDisabledRuleArrays(withoutSchema);
  const withoutBaseline = stripBaseline
    ? stripMigrationBaseline(normalizedRules)
    : normalizedRules;
  const translatedGlobs = translateConfigGlobs(withoutBaseline);
  const withoutEmptyValues = removeEmptyValues(translatedGlobs) ?? {};

  return sortGeneratedValue(withoutEmptyValues) as OxlintConfig;
}

function appendUnique(
  current: Array<unknown> | undefined,
  incoming: Array<unknown>,
): Array<unknown> {
  const values = [...(current ?? []), ...incoming];
  return [
    ...new Map(values.map((value) => [stableValueKey(value), value])).values(),
  ];
}

export function mergeOxlintConfigs(configs: Array<OxlintConfig>): OxlintConfig {
  const result = {} as Record<string, unknown>;

  for (const config of configs) {
    const record = config as Record<string, unknown>;

    if (config.ignorePatterns != null)
      result.ignorePatterns = [
        ...((result.ignorePatterns as Array<string> | undefined) ?? []),
        ...config.ignorePatterns,
      ];

    for (const key of mergeableObjectKeys) {
      const value = record[key];
      if (value == null) continue;
      result[key] = {
        ...(result[key] as Record<string, unknown> | undefined),
        ...(value as Record<string, unknown>),
      };
    }

    for (const key of mergeableArrayKeys) {
      const value = record[key];
      if (!Array.isArray(value)) continue;
      result[key] = appendUnique(result[key] as Array<unknown>, value);
    }

    if (config.overrides != null) {
      result.overrides = [
        ...((result.overrides as Array<OxlintOverride> | undefined) ?? []),
        ...config.overrides,
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
