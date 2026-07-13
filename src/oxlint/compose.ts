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

function mergeJsPlugins(
  current: OxlintConfig["jsPlugins"],
  incoming: NonNullable<OxlintConfig["jsPlugins"]>,
): NonNullable<OxlintConfig["jsPlugins"]> {
  const plugins = new Map<string, ExternalPluginEntry>();

  for (const plugin of current ?? []) plugins.set(jsPluginKey(plugin), plugin);
  for (const plugin of incoming) plugins.set(jsPluginKey(plugin), plugin);

  return [...plugins.values()];
}

function cloneOverride(override: OxlintOverride): OxlintOverride {
  return {
    ...override,
    ...(override.env ? { env: { ...override.env } } : {}),
    ...(override.excludeFiles
      ? { excludeFiles: [...override.excludeFiles] }
      : {}),
    files: [...override.files],
    ...(override.globals ? { globals: { ...override.globals } } : {}),
    ...(override.jsPlugins
      ? {
          jsPlugins: override.jsPlugins.map((plugin) =>
            typeof plugin === "string" ? plugin : { ...plugin },
          ),
        }
      : {}),
    ...(override.plugins ? { plugins: [...override.plugins] } : {}),
    ...(override.rules ? { rules: { ...override.rules } } : {}),
  };
}

function mergeDirectConfig(result: OxlintConfig, config: OxlintConfig): void {
  if (config.categories)
    result.categories = { ...result.categories, ...config.categories };
  if (config.env) result.env = { ...result.env, ...config.env };
  if (config.globals)
    result.globals = { ...result.globals, ...config.globals };
  if (config.ignorePatterns)
    result.ignorePatterns = mergeUnique(
      result.ignorePatterns,
      config.ignorePatterns,
    );
  if (Object.is(config.jsPlugins, null)) result.jsPlugins = null;
  else if (config.jsPlugins)
    result.jsPlugins = mergeJsPlugins(result.jsPlugins, config.jsPlugins);
  if (config.options)
    result.options = { ...result.options, ...config.options };
  if (config.overrides)
    result.overrides = [
      ...(result.overrides ?? []),
      ...config.overrides.map((override) => cloneOverride(override)),
    ];
  if (config.plugins)
    result.plugins = mergeUnique(result.plugins, config.plugins);
  if (config.rules) result.rules = { ...result.rules, ...config.rules };
  if (config.settings)
    result.settings = { ...result.settings, ...config.settings };
}

function mergeConfig(
  result: OxlintConfig,
  config: OxlintConfig,
  ancestors: Set<OxlintConfig>,
): void {
  if (ancestors.has(config)) throw new Error("Cyclic Oxlint config extends");

  ancestors.add(config);
  for (const extended of config.extends ?? []) {
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
