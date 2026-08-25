import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExternalPluginEntry, OxlintConfig } from "oxlint";

const canonicalPluginNames = new Map<string, string>([
  ["@angular-eslint/eslint-plugin", "@angular-eslint"],
  ["@e18e/eslint-plugin", "e18e"],
  ["@eslint-react/eslint-plugin", "@eslint-react"],
  ["@stylistic/eslint-plugin", "@stylistic"],
  ["@unocss/eslint-plugin", "unocss"],
]);

type NamedExternalPluginEntry = Exclude<ExternalPluginEntry, string>;

function resolveEntry(entry: ExternalPluginEntry): NamedExternalPluginEntry {
  const normalized =
    typeof entry === "string"
      ? { name: pluginName(entry), specifier: entry }
      : entry;
  const { specifier } = normalized;

  if (path.isAbsolute(specifier)) return normalized;

  let resolved: string;
  try {
    resolved = fileURLToPath(import.meta.resolve(specifier));
  } catch (error) {
    throw new Error(
      `Unable to resolve Oxlint JavaScript plugin "${specifier}". Install the package required by the enabled integration.`,
      { cause: error },
    );
  }

  return { ...normalized, specifier: resolved };
}

function pluginName(specifier: string): string {
  const canonicalName = canonicalPluginNames.get(specifier);
  if (canonicalName) return canonicalName;
  if (specifier.startsWith("@")) {
    const [scope, packageName = ""] = specifier.split("/", 2);
    if (packageName === "eslint-plugin") return scope.slice(1);
    return `${scope}/${packageName.replace(/^eslint-plugin-/u, "")}`;
  }
  return specifier.replace(/^eslint-plugin-/u, "");
}

function resolveEntries(
  entries: OxlintConfig["jsPlugins"],
): OxlintConfig["jsPlugins"] {
  if (entries == null) return entries;
  return entries.map((entry) => resolveEntry(entry));
}

/**
 * Anchor generated JavaScript-plugin packages to this published package.
 * User-supplied trailing configs are intentionally left untouched so their
 * relative specifiers continue to resolve from the user's config file.
 */
export function resolveGeneratedJsPlugins(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    ...(config.jsPlugins !== undefined && {
      jsPlugins: resolveEntries(config.jsPlugins),
    }),
    ...(config.overrides !== undefined && {
      overrides: config.overrides.map((override) => ({
        ...override,
        ...(override.jsPlugins !== undefined && {
          jsPlugins: resolveEntries(override.jsPlugins),
        }),
      })),
    }),
  };
}
