import type { OxlintConfig } from "oxlint";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { antiSlopRuleNames } from "../oxlint-plugins/anti-slop-rule-names";
import type { OxlintAntiSlopOptions, OxlintRules } from "./types";

/**
Plugin name registered with Oxlint. Matches the vendored plugin's own `meta.name`.
*/
export const ANTI_SLOP_PLUGIN_NAME = "anti-slop";

/**
 * Candidate locations of the plugin entry, in resolution order.
 *
 * The first matches the published layout, where this module has been bundled into
 * `dist/oxlint.mjs` and the plugin sits beside it. The second matches the source tree,
 * so the factory keeps working under Vitest before anything is built.
 */
const pluginEntryCandidates = [
  "./oxlint-anti-slop.mjs",
  "../oxlint-plugins/anti-slop/index.ts",
];

/**
 * Resolve an absolute path to the bundled plugin.
 *
 * Oxlint also resolves bare package specifiers, but an absolute path cannot be affected
 * by hoisting or by a workspace package that inherits this config without depending on
 * it directly, so it is what the factory emits by default.
 */
export function resolveAntiSlopSpecifier(): string {
  for (const candidate of pluginEntryCandidates) {
    const url = new URL(candidate, import.meta.url);
    if (existsSync(url)) return fileURLToPath(url);
  }

  throw new Error(
    "Could not locate the bundled anti-slop Oxlint plugin. Reinstall @nirtamir2/eslint-config, or set antiSlop.specifier to your own vendored copy.",
  );
}

/**
Build the Oxlint fragment that registers anti-slop and turns its rules on.
*/
export function createAntiSlopConfig(
  options: OxlintAntiSlopOptions = {},
): OxlintConfig {
  const { level = "error", specifier, overrides = {} } = options;

  const rules: OxlintRules = Object.fromEntries(
    antiSlopRuleNames.map((ruleName) => [
      `${ANTI_SLOP_PLUGIN_NAME}/${ruleName}`,
      level,
    ]),
  );

  return {
    jsPlugins: [
      {
        name: ANTI_SLOP_PLUGIN_NAME,
        specifier: specifier ?? resolveAntiSlopSpecifier(),
      },
    ],
    rules: { ...rules, ...overrides },
  };
}
