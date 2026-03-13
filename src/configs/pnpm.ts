import fs from "node:fs/promises";
import type { OptionsPnpm, TypedFlatConfigItem } from "../types";
import { findUp, interopDefault } from "../utils";

async function detectCatalogUsage(): Promise<boolean> {
  const workspaceFile = await findUp("pnpm-workspace.yaml");
  if (!workspaceFile) return false;

  const yaml = await fs.readFile(workspaceFile, "utf8");
  return yaml.includes("catalog:") || yaml.includes("catalogs:");
}

export async function pnpm(
  options: OptionsPnpm = {},
): Promise<Array<TypedFlatConfigItem>> {
  const [pluginPnpm, pluginYaml, yamlParser, parserJsonc] = await Promise.all([
    interopDefault(import("eslint-plugin-pnpm")),
    interopDefault(import("eslint-plugin-yml")),
    interopDefault(import("yaml-eslint-parser")),
    interopDefault(import("jsonc-eslint-parser")),
  ]);

  const {
    catalogs = await detectCatalogUsage(),
    isInEditor = false,
    json = true,
    sort = true,
    yaml = true,
  } = options;

  const configs: Array<TypedFlatConfigItem> = [];

  if (json) {
    configs.push({
      files: ["package.json", "**/package.json"],
      languageOptions: {
        parser: parserJsonc,
      },
      name: "antfu/pnpm/package-json",
      plugins: {
        pnpm: pluginPnpm,
      },
      rules: {
        ...(catalogs
          ? {
              "pnpm/json-enforce-catalog": [
                "error",
                {
                  autofix: !isInEditor,
                  ignores: ["@types/vscode"],
                },
              ],
            }
          : {}),
        "pnpm/json-prefer-workspace-settings": [
          "error",
          { autofix: !isInEditor },
        ],
        "pnpm/json-valid-catalog": ["error", { autofix: !isInEditor }],
      },
    });
  }

  if (yaml) {
    configs.push({
      files: ["pnpm-workspace.yaml"],
      languageOptions: {
        parser: yamlParser,
      },
      name: "antfu/pnpm/pnpm-workspace-yaml",
      plugins: {
        pnpm: pluginPnpm,
      },
      rules: {
        "pnpm/yaml-enforce-settings": [
          "error",
          {
            settings: {
              shellEmulator: true,
              trustPolicy: "no-downgrade",
            },
          },
        ],
        "pnpm/yaml-no-duplicate-catalog-item": "error",
        "pnpm/yaml-no-unused-catalog-item": "error",
      },
    });

    if (sort) {
      configs.push({
        files: ["pnpm-workspace.yaml"],
        languageOptions: {
          parser: yamlParser,
        },
        name: "antfu/pnpm/pnpm-workspace-yaml-sort",
        plugins: {
          yml: pluginYaml,
        },
        rules: {
          "yml/sort-keys": [
            "error",
            {
              order: [
                ...[
                  "cacheDir",
                  "catalogMode",
                  "cleanupUnusedCatalogs",
                  "dedupeDirectDeps",
                  "deployAllFiles",
                  "enablePrePostScripts",
                  "engineStrict",
                  "extendNodePath",
                  "hoist",
                  "hoistPattern",
                  "hoistWorkspacePackages",
                  "ignoreCompatibilityDb",
                  "ignoreDepScripts",
                  "ignoreScripts",
                  "ignoreWorkspaceRootCheck",
                  "managePackageManagerVersions",
                  "minimumReleaseAge",
                  "minimumReleaseAgeExclude",
                  "modulesDir",
                  "nodeLinker",
                  "nodeVersion",
                  "optimisticRepeatInstall",
                  "packageManagerStrict",
                  "packageManagerStrictVersion",
                  "preferSymlinkedExecutables",
                  "preferWorkspacePackages",
                  "publicHoistPattern",
                  "registrySupportsTimeField",
                  "requiredScripts",
                  "resolutionMode",
                  "savePrefix",
                  "scriptShell",
                  "shamefullyHoist",
                  "shellEmulator",
                  "stateDir",
                  "supportedArchitectures",
                  "symlink",
                  "tag",
                  "trustPolicy",
                  "trustPolicyExclude",
                  "updateNotifier",
                ],
                "packages",
                "overrides",
                "patchedDependencies",
                "catalog",
                "catalogs",
                ...[
                  "allowedDeprecatedVersions",
                  "allowNonAppliedPatches",
                  "configDependencies",
                  "ignoredBuiltDependencies",
                  "ignoredOptionalDependencies",
                  "neverBuiltDependencies",
                  "onlyBuiltDependencies",
                  "onlyBuiltDependenciesFile",
                  "packageExtensions",
                  "peerDependencyRules",
                ],
              ],
              pathPattern: "^$",
            },
            {
              order: { type: "asc" },
              pathPattern: ".*",
            },
          ],
        },
      });
    }
  }

  return configs;
}
