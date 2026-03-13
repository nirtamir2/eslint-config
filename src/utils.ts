import { isPackageExists } from "local-pkg";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import type { Awaitable, TypedFlatConfigItem } from "./types";

export const parserPlain = {
  meta: {
    name: "parser-plain",
  },
  parseForESLint: (code: string) => ({
    ast: {
      body: [],
      comments: [],
      loc: { end: code.length, start: 0 },
      range: [0, code.length],
      tokens: [],
      type: "Program",
    },
    scopeManager: null,
    services: { isPlain: true },
    visitorKeys: {
      Program: [],
    },
  }),
};

/**
 * Combine array and non-array configs into a single array.
 * @param {...any} configs
 */
export async function combine(
  ...configs: Array<Awaitable<Array<TypedFlatConfigItem>>>
): Promise<Array<TypedFlatConfigItem>> {
  const resolved = await Promise.all(configs.map((c) => Promise.resolve(c)));
  return resolved.flat();
}

/**
 * Rename plugin prefixes in a rule object.
 * Accepts a map of prefixes to rename.
 * @param rules
 * @param map
 * @example
 * ```ts
 * import { renameRules } from '@nirtamir2/eslint-config'
 *
 * export default [{
 *   rules: renameRules(
 *     {
 *       '@typescript-eslint/indent': 'error'
 *     },
 *     { '@typescript-eslint': 'ts' }
 *   )
 * }]
 * ```
 */
export function renameRules(
  rules: Record<string, any>,
  map: Record<string, string>,
) {
  return Object.fromEntries(
    Object.entries(rules).map(([key, value]) => {
      for (const [from, to] of Object.entries(map)) {
        if (key.startsWith(`${from}/`))
          return [to + key.slice(from.length), value];
      }
      return [key, value];
    }),
  );
}

/**
 * Rename plugin names a flat configs array
 * @param configs
 * @param map
 * @example
 * ```ts
 * import { renamePluginInConfigs } from '@nirtamir2/eslint-config'
 * import someConfigs from './some-configs'
 *
 * export default renamePluginInConfigs(someConfigs, {
 *   '@typescript-eslint': 'ts',
 *   'import-x': 'import',
 * })
 * ```
 */
export function renamePluginInConfigs(
  configs: Array<TypedFlatConfigItem>,
  map: Record<string, string>,
): Array<TypedFlatConfigItem> {
  return configs.map((i) => {
    const clone = { ...i };
    if (clone.rules) clone.rules = renameRules(clone.rules, map);
    if (clone.plugins) {
      clone.plugins = Object.fromEntries(
        Object.entries(clone.plugins).map(([key, value]) => {
          if (key in map) return [map[key], value];
          return [key, value];
        }),
      );
    }
    return clone;
  });
}

export function toArray<T>(value: T | Array<T>): Array<T> {
  return Array.isArray(value) ? value : [value];
}

export async function findUp(
  name: string,
  startDir = process.cwd(),
): Promise<string | undefined> {
  let currentDir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(currentDir, name);

    try {
      await fsPromises.access(candidate);
      return candidate;
    } catch {}

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return undefined;
    currentDir = parentDir;
  }
}

export function findUpSync(
  name: string,
  startDir = process.cwd(),
): string | undefined {
  let currentDir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(currentDir, name);
    if (fs.existsSync(candidate)) return candidate;

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return undefined;
    currentDir = parentDir;
  }
}

export async function interopDefault<T>(
  m: Awaitable<T>,
): Promise<T extends { default: infer U } ? U : T> {
  const resolved = await m;
  return (resolved as any).default || resolved;
}

const scopeUrl = fileURLToPath(new URL(".", import.meta.url));
const isCwdInScope = isPackageExists("@nirtamir2/eslint-config");

export function isPackageInScope(name: string): boolean {
  return isPackageExists(name, { paths: [scopeUrl] });
}

export function isInGitHooksOrLintStaged(): boolean {
  return Boolean(
    process.env.GIT_PARAMS ||
    process.env.VSCODE_GIT_COMMAND ||
    process.env.npm_lifecycle_script?.startsWith("lint-staged"),
  );
}

export async function ensurePackages(packages: Array<string | undefined>) {
  if (process.env.CI || !process.stdout.isTTY || !isCwdInScope) return;

  const nonExistingPackages = packages.filter(
    (i) => i && !isPackageInScope(i),
  ) as Array<string>;
  if (nonExistingPackages.length === 0) return;

  const p = await import("@clack/prompts");
  const result = await p.confirm({
    message: `${
      nonExistingPackages.length === 1 ? "Package is" : "Packages are"
    } required for this config: ${nonExistingPackages.join(
      ", ",
    )}. Do you want to install them?`,
  });
  if (result)
    await import("@antfu/install-pkg").then((i) =>
      i.installPackage(nonExistingPackages, { dev: true }),
    );
}

export function isInEditorEnv(): boolean {
  if (process.env.CI) return false;
  if (isInGitHooksOrLintStaged()) return false;
  return Boolean(
    process.env.VSCODE_PID ||
    process.env.VSCODE_CWD ||
    process.env.JETBRAINS_IDE ||
    process.env.VIM ||
    process.env.NVIM ||
    (process.env.ZED_ENVIRONMENT && !process.env.ZED_TERM),
  );
}
