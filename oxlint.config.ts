// The package's `src` graph uses bundler-style extensionless imports that Node's ESM
// loader cannot resolve, and Oxlint loads this file with plain Node. Consuming the
// built entry also means this config exercises exactly what consumers get, so it
// deliberately depends on `nr build` having run.
// eslint-disable-next-line antfu/no-import-dist
import oxlint from "./dist/oxlint.mjs";

export default oxlint({
  antiSlop: true,
  ignores: [
    "dist/**",
    "fixtures/**",
    "_fixtures/**",
    "stuff/**",
    "src/generated/**",
    "src/typegen.d.ts",
    // Vendored verbatim from dmmulroy/anti-slop; not ours to restyle.
    "src/oxlint-plugins/anti-slop/**",
  ],
  rules: {
    // #region parity with this repo's own eslint.config.ts
    "init-declarations": "off",
    "no-use-before-define": "off",
    "typescript/no-explicit-any": "off",
    "typescript/no-non-null-assertion": "off",
    "unicorn/import-style": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-await-expression-member": "off",
    "unicorn/no-object-as-default-parameter": "off",
    "unicorn/no-process-exit": "off",
    // #endregion

    // Build and release scripts are console programs.
    "no-console": "off",
    // anti-slop's own rules replace the ad-hoc narrowing this would flag.
    "unicorn/no-nested-ternary": "off",
    // Optional peer plugins are loaded through `Promise.all([...] as const)` even when a
    // single plugin is involved, so adding one later stays a one-line change.
    "unicorn/no-single-promise-in-promise-methods": "off",
    // `src/compat.ts` and `src/plugins.ts` deliberately opt out of type checking.
    "typescript/ban-ts-comment": "off",
    // Conditional spreads read better than the ternary-of-arrays alternative here.
    "unicorn/no-useless-spread": "off",
    // `ConfigValue` in scripts/oxlint/normalize.ts is recursive, and TypeScript rejects
    // `Record<>` inside a recursive alias with a circular-reference error.
    "typescript/consistent-indexed-object-style": "off",

    // This package normalises `boolean | Options` public options by narrowing them with
    // `typeof x === "boolean"`, which is the documented shape of ~20 entries in
    // `OptionsConfig`. Satisfying the rule would mean adding a parse layer to every one
    // of those unions, i.e. redesigning the public option surface. The rule stays on for
    // consumers; only this package's own config opts out.
    "anti-slop/no-runtime-typeof": "off",
  },
});
