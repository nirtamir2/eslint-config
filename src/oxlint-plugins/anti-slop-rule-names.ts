/**
 * Rule ids exposed by the vendored anti-slop plugin.
 *
 * Both linter entries read this list instead of importing the plugin: the Oxlint
 * factory only needs rule names, and importing the plugin there would pull the whole
 * rule implementation into `dist/oxlint.mjs`. `test/anti-slop.test.ts` asserts this
 * list still matches the plugin, so a re-sync that adds or removes a rule fails loudly.
 */
export const antiSlopRuleNames = [
  "no-chained-type-assertions",
  "no-conditional-empty-object-spread",
  "no-known-value-widening",
  "no-module-mocking",
  "no-object-parameters",
  "no-reflect-apply",
  "no-reflect-get",
  "no-runtime-typeof",
  "no-shape-in-symbol-names",
  "no-unknown-parameters",
  "no-unknown-returns",
  "no-unknown-type-aliases",
  "no-unsafe-dictionary-type",
  "no-widen-then-assert",
  "require-safety-comment-for-type-assertion",
] as const;

export type AntiSlopRuleName = (typeof antiSlopRuleNames)[number];
