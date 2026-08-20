import type {
  ExternalPluginEntry,
  OxlintConfig,
  OxlintOverride,
} from "oxlint";

function mergeUnique<T>(
  current: Array<T> | undefined,
  incoming: Array<T>,
): Array<T> {
  return [...new Set([...(current ?? []), ...incoming])];
}

function jsPluginKey(plugin: ExternalPluginEntry): string {
  return typeof plugin === "string" ? plugin : plugin.name;
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value))
    return value.map((item) => cloneValue(item)) as T;
  if (Object.is(value, null) || typeof value !== "object") return value;

  const prototype = Object.getPrototypeOf(value);
  if (
    !Object.is(prototype, Object.prototype) &&
    !Object.is(prototype, null)
  )
    return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      cloneValue(item),
    ]),
  ) as T;
}

function mergeJsPlugins(
  current: OxlintConfig["jsPlugins"],
  incoming: NonNullable<OxlintConfig["jsPlugins"]>,
): NonNullable<OxlintConfig["jsPlugins"]> {
  const plugins = new Map<string, ExternalPluginEntry>();

  const currentPlugins = current ?? [];
  for (const plugin of currentPlugins)
    plugins.set(jsPluginKey(plugin), cloneValue(plugin));
  for (const plugin of incoming)
    plugins.set(jsPluginKey(plugin), cloneValue(plugin));

  return [...plugins.values()];
}

function cloneOverride(override: OxlintOverride): OxlintOverride {
  return cloneValue(override);
}

function replayRootRulePrecedence(
  overrides: OxlintConfig["overrides"],
  incomingRules: NonNullable<OxlintConfig["rules"]>,
): void {
  const incomingRuleEntries = incomingRules as Record<string, unknown>;

  const currentOverrides = overrides ?? [];
  for (const override of currentOverrides) {
    if (!override.rules) continue;

    const scopedRuleEntries = override.rules as Record<string, unknown>;
    for (const ruleName of Object.keys(scopedRuleEntries)) {
      if (Object.hasOwn(incomingRuleEntries, ruleName))
        scopedRuleEntries[ruleName] = cloneValue(
          incomingRuleEntries[ruleName],
        );
    }
  }
}

function mergeDirectConfig(result: OxlintConfig, config: OxlintConfig): void {
  if (config.categories)
    result.categories = {
      ...result.categories,
      ...cloneValue(config.categories),
    };
  if (config.env)
    result.env = { ...result.env, ...cloneValue(config.env) };
  if (config.globals)
    result.globals = { ...result.globals, ...cloneValue(config.globals) };
  if (config.ignorePatterns)
    result.ignorePatterns = mergeUnique(
      result.ignorePatterns,
      config.ignorePatterns,
    );
  if (Object.is(config.jsPlugins, null)) result.jsPlugins = null;
  else if (config.jsPlugins)
    result.jsPlugins = mergeJsPlugins(result.jsPlugins, config.jsPlugins);
  if (config.options)
    result.options = { ...result.options, ...cloneValue(config.options) };
  if (config.rules) {
    const incomingRules = cloneValue(config.rules);
    replayRootRulePrecedence(result.overrides, incomingRules);
    result.rules = { ...result.rules, ...incomingRules };
  }
  if (config.overrides)
    result.overrides = [
      ...(result.overrides ?? []),
      ...config.overrides.map((override) => cloneOverride(override)),
    ];
  if (config.plugins)
    result.plugins = mergeUnique(result.plugins, config.plugins);
  if (config.settings)
    result.settings = { ...result.settings, ...cloneValue(config.settings) };
}

function mergeConfig(
  result: OxlintConfig,
  config: OxlintConfig,
  ancestors: Set<OxlintConfig>,
): void {
  if (ancestors.has(config)) throw new Error("Cyclic Oxlint config extends");

  ancestors.add(config);
  const extendedConfigs = config.extends ?? [];
  for (const extended of extendedConfigs) {
    if (extended == null || typeof extended !== "object" || Array.isArray(extended))
      throw new TypeError(
        "Import extended Oxlint configs as objects before passing them to nirtamir2()",
      );
    mergeConfig(result, extended, ancestors);
  }
  ancestors.delete(config);

  mergeDirectConfig(result, config);
}

export function composeOxlintConfigs(
  ...configs: ReadonlyArray<OxlintConfig>
): OxlintConfig {
  const result: OxlintConfig = {};

  for (const config of configs) mergeConfig(result, config, new Set());

  return result;
}
