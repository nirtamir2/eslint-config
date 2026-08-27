import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { OxlintConfig } from "oxlint";
import { afterEach, describe, expect, it } from "vitest";
import { translateOxlintGlobs } from "../scripts/oxlint/normalize";
import {
  generatedOxlintFragments,
  oxlintCompatibilityReport,
} from "../src/generated/oxlint";
import { GLOB_TESTS } from "../src/globs";
import { composeOxlintConfigs } from "../src/oxlint/compose";
import { createOxlintConfig } from "../src/oxlint/factory";
import { resolveGeneratedJsPlugins } from "../src/oxlint/js-plugins";
import type { OxlintOptions } from "../src/oxlint/types";

interface OxlintDiagnostic {
  code?: string;
  filename: string;
  message: string;
  severity: "error" | "warning";
}

interface OxlintJsonResult {
  diagnostics: Array<OxlintDiagnostic>;
  number_of_files: number;
  number_of_rules: number;
}

interface ProcessResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stderr: string;
  stdout: string;
}

interface ExecuteOptions {
  environment: NodeJS.ProcessEnv;
  workingDirectory: string;
}

interface DiagnosticCase {
  assertTypeAware?: true;
  file: string;
  name: string;
  options?: Partial<OxlintOptions>;
  rule: string;
}

interface VariantLoadCase {
  allowNoRules?: true;
  config: OxlintConfig;
  file: string;
  name: string;
}

const require = createRequire(import.meta.url);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureRoot = path.join(repoRoot, "fixtures", "oxlint-native");
const oxlintPackageRoot = path.dirname(require.resolve("oxlint/package.json"));
const oxlintCli = path.join(oxlintPackageRoot, "bin", "oxlint");
const localBinDirectory = path.join(repoRoot, "node_modules", ".bin");
const temporaryDirectories: Array<string> = [];
const timeout = process.platform === "win32" ? 120_000 : 60_000;
const compareNames = (left: string, right: string) => left.localeCompare(right);

const disabledOptions = {
  ignores: [],
  jsdoc: false,
  jsx: false,
  nextjs: false,
  react: false,
  rules: {},
  test: false,
  type: "app",
  typescript: false,
  unicorn: false,
  vue: false,
} satisfies OxlintOptions;

const variantLoadCases = [
  {
    config: generatedOxlintFragments.base.default,
    file: "base/debugger.js",
    name: "base.default",
  },
  {
    config: generatedOxlintFragments.base.editor,
    file: "base/debugger.js",
    name: "base.editor",
  },
  {
    config: generatedOxlintFragments.base.suffix,
    file: "base/debugger.js",
    name: "base.suffix",
  },
  {
    config: generatedOxlintFragments.command,
    file: "base/debugger.js",
    name: "command",
  },
  {
    config: generatedOxlintFragments.e18e.app.default,
    file: "base/date-now.js",
    name: "e18e.app.default",
  },
  {
    config: generatedOxlintFragments.e18e.app.editor,
    file: "base/date-now.js",
    name: "e18e.app.editor",
  },
  {
    config: generatedOxlintFragments.e18e.lib.default,
    file: "base/date-now.js",
    name: "e18e.lib.default",
  },
  {
    config: generatedOxlintFragments.e18e.lib.editor,
    file: "base/date-now.js",
    name: "e18e.lib.editor",
  },
  {
    allowNoRules: true,
    config: generatedOxlintFragments.e18e.base.app,
    file: "base/date-now.js",
    name: "e18e.base.app",
  },
  {
    allowNoRules: true,
    config: generatedOxlintFragments.e18e.base.lib,
    file: "base/date-now.js",
    name: "e18e.base.lib",
  },
  {
    config: generatedOxlintFragments.e18e.modernization,
    file: "base/date-now.js",
    name: "e18e.modernization",
  },
  {
    config: generatedOxlintFragments.e18e.moduleReplacements,
    file: "base/date-now.js",
    name: "e18e.moduleReplacements",
  },
  {
    config: generatedOxlintFragments.e18e.performanceImprovements.app,
    file: "base/date-now.js",
    name: "e18e.performanceImprovements.app",
  },
  {
    config: generatedOxlintFragments.e18e.performanceImprovements.lib,
    file: "base/date-now.js",
    name: "e18e.performanceImprovements.lib",
  },
  {
    config: generatedOxlintFragments.regexp.error,
    file: "base/debugger.js",
    name: "regexp.error",
  },
  {
    config: generatedOxlintFragments.regexp.warn,
    file: "base/debugger.js",
    name: "regexp.warn",
  },
  {
    config: generatedOxlintFragments.integrations.perfectionist,
    file: "base/debugger.js",
    name: "perfectionist",
  },
  {
    config: generatedOxlintFragments.integrations.angular.config,
    file: "framework/angular.ts",
    name: "angular.typescript",
  },
  {
    config: generatedOxlintFragments.integrations.i18n.config,
    file: "framework/i18n.tsx",
    name: "i18n.javascript",
  },
  {
    config: generatedOxlintFragments.integrations.query,
    file: "framework/react.tsx",
    name: "query",
  },
  {
    config: generatedOxlintFragments.integrations.security,
    file: "base/debugger.js",
    name: "security",
  },
  {
    config: generatedOxlintFragments.integrations.solid.javascript.config,
    file: "framework/solid.jsx",
    name: "solid.javascript",
  },
  {
    config: generatedOxlintFragments.integrations.solid.reactDisables.config,
    file: "framework/solid.tsx",
    name: "solid.reactDisables",
  },
  {
    config: generatedOxlintFragments.integrations.solid.typescript.config,
    file: "framework/solid.tsx",
    name: "solid.typescript",
  },
  {
    config: generatedOxlintFragments.integrations.storybook,
    file: "framework/example.stories.tsx",
    name: "storybook",
  },
  {
    config: generatedOxlintFragments.integrations.stylistic.default,
    file: "base/debugger.js",
    name: "stylistic",
  },
  {
    config: generatedOxlintFragments.integrations.stylistic.noJsx,
    file: "base/debugger.js",
    name: "stylistic.noJsx",
  },
  {
    config: generatedOxlintFragments.integrations.stylistic.lessOpinionated,
    file: "base/debugger.js",
    name: "stylistic.lessOpinionated",
  },
  {
    config:
      generatedOxlintFragments.integrations.stylistic.lessOpinionatedNoJsx,
    file: "base/debugger.js",
    name: "stylistic.lessOpinionated.noJsx",
  },
  {
    config:
      generatedOxlintFragments.integrations.stylisticCustomizations.braceStyle
        .oneTrueBrace,
    file: "base/debugger.js",
    name: "stylistic.braceStyle.1tbs",
  },
  {
    config:
      generatedOxlintFragments.integrations.stylisticCustomizations.braceStyle
        .allman,
    file: "base/debugger.js",
    name: "stylistic.braceStyle.allman",
  },
  {
    config:
      generatedOxlintFragments.integrations.stylisticCustomizations
        .experimental,
    file: "base/debugger.js",
    name: "stylistic.experimental",
  },
  {
    config:
      generatedOxlintFragments.integrations.stylisticCustomizations.indent
        .numberTemplate,
    file: "base/debugger.js",
    name: "stylistic.indent.numberTemplate",
  },
  {
    config:
      generatedOxlintFragments.integrations.stylisticCustomizations.indent.tab,
    file: "base/debugger.js",
    name: "stylistic.indent.tab",
  },
  {
    config:
      generatedOxlintFragments.integrations.stylisticCustomizations.quotes
        .backtick,
    file: "base/debugger.js",
    name: "stylistic.quotes.backtick",
  },
  {
    config:
      generatedOxlintFragments.integrations.stylisticCustomizations.quotes
        .single,
    file: "base/debugger.js",
    name: "stylistic.quotes.single",
  },
  {
    config:
      generatedOxlintFragments.integrations.stylisticCustomizations.semiFalse,
    file: "base/debugger.js",
    name: "stylistic.semi.false",
  },
  {
    config: generatedOxlintFragments.integrations.importsStylistic,
    file: "base/import-spacing.js",
    name: "imports.stylistic",
  },
  {
    config: generatedOxlintFragments.integrations.tailwindcss,
    file: "framework/tailwind.tsx",
    name: "tailwindcss",
  },
  {
    config: generatedOxlintFragments.integrations.tsdoc.config,
    file: "typescript/explicit-any.ts",
    name: "tsdoc",
  },
  {
    config: generatedOxlintFragments.integrations.unocss.attributify,
    file: "framework/tailwind.tsx",
    name: "unocss.attributify",
  },
  {
    config: generatedOxlintFragments.integrations.unocss.attributifyStrict,
    file: "framework/tailwind.tsx",
    name: "unocss.attributifyStrict",
  },
  {
    config: generatedOxlintFragments.integrations.unocss.base,
    file: "framework/tailwind.tsx",
    name: "unocss.base",
  },
  {
    config: generatedOxlintFragments.integrations.unocss.strict,
    file: "framework/tailwind.tsx",
    name: "unocss.strict",
  },
  {
    config: generatedOxlintFragments.integrations.zod.config,
    file: "base/debugger.js",
    name: "zod",
  },
  {
    config: generatedOxlintFragments.unicorn.allRecommended.config,
    file: "unicorn/prefer-includes.js",
    name: "unicorn.allRecommended",
  },
  {
    config: generatedOxlintFragments.unicorn.selected.config,
    file: "unicorn/prefer-includes.js",
    name: "unicorn.selected",
  },
  {
    config: generatedOxlintFragments.jsx.config,
    file: "jsx/missing-alt.jsx",
    name: "jsx",
  },
  {
    config: generatedOxlintFragments.typescript.app.standard.config,
    file: "typescript/explicit-any.ts",
    name: "typescript.app.standard",
  },
  {
    config: generatedOxlintFragments.typescript.app.typeAware.config,
    file: "typescript/floating-promise.ts",
    name: "typescript.app.typeAware",
  },
  {
    config: generatedOxlintFragments.typescript.app.standardNonErasable.config,
    file: "typescript/explicit-any.ts",
    name: "typescript.app.standard.nonErasable",
  },
  {
    config: generatedOxlintFragments.typescript.app.typeAwareNonErasable.config,
    file: "typescript/floating-promise.ts",
    name: "typescript.app.typeAware.nonErasable",
  },
  {
    config: generatedOxlintFragments.typescript.lib.standard.config,
    file: "typescript/explicit-any.ts",
    name: "typescript.lib.standard",
  },
  {
    config: generatedOxlintFragments.typescript.lib.typeAware.config,
    file: "typescript/floating-promise.ts",
    name: "typescript.lib.typeAware",
  },
  {
    config: generatedOxlintFragments.typescript.lib.standardNonErasable.config,
    file: "typescript/explicit-any.ts",
    name: "typescript.lib.standard.nonErasable",
  },
  {
    config: generatedOxlintFragments.typescript.lib.typeAwareNonErasable.config,
    file: "typescript/floating-promise.ts",
    name: "typescript.lib.typeAware.nonErasable",
  },
  {
    config: generatedOxlintFragments.typescript.app.typeAwareCustomScope.config,
    file: "typescript/floating-promise.ts",
    name: "typescript.app.typeAware.customScope",
  },
  {
    config:
      generatedOxlintFragments.typescript.app.typeAwareCustomScopeNonErasable
        .config,
    file: "typescript/floating-promise.ts",
    name: "typescript.app.typeAware.customScope.nonErasable",
  },
  {
    config: generatedOxlintFragments.typescript.lib.typeAwareCustomScope.config,
    file: "typescript/floating-promise.ts",
    name: "typescript.lib.typeAware.customScope",
  },
  {
    config:
      generatedOxlintFragments.typescript.lib.typeAwareCustomScopeNonErasable
        .config,
    file: "typescript/floating-promise.ts",
    name: "typescript.lib.typeAware.customScope.nonErasable",
  },
  {
    config: generatedOxlintFragments.test.default.config,
    file: "test/duplicate-title.test.ts",
    name: "test.default",
  },
  {
    config: generatedOxlintFragments.test.editor.config,
    file: "test/duplicate-title.test.ts",
    name: "test.editor",
  },
  {
    config: generatedOxlintFragments.vue.javascript.config,
    file: "vue/component.vue",
    name: "vue.javascript",
  },
  {
    config: generatedOxlintFragments.vue.typescript.config,
    file: "vue/component.vue",
    name: "vue.typescript",
  },
  {
    config: generatedOxlintFragments.vue.javascriptV2.config,
    file: "vue/component.vue",
    name: "vue.javascript.v2",
  },
  {
    config: generatedOxlintFragments.vue.typescriptV2.config,
    file: "vue/component.vue",
    name: "vue.typescript.v2",
  },
  {
    config: generatedOxlintFragments.react.standard.config,
    file: "framework/react-mixed-exports.tsx",
    name: "react.standard",
  },
  {
    config: generatedOxlintFragments.react.typeAware.config,
    file: "framework/react-mixed-exports.tsx",
    name: "react.typeAware",
  },
  {
    config: generatedOxlintFragments.nextjs.config,
    file: "framework/next-image.tsx",
    name: "nextjs",
  },
  {
    config: generatedOxlintFragments.jsdoc.standard.config,
    file: "jsdoc/missing-param-name.js",
    name: "jsdoc.standard",
  },
  {
    config: generatedOxlintFragments.jsdoc.stylistic.config,
    file: "jsdoc/missing-param-name.js",
    name: "jsdoc.stylistic",
  },
  {
    config: generatedOxlintFragments.tail,
    file: "base/debugger.js",
    name: "tail",
  },
] satisfies Array<VariantLoadCase>;

const diagnosticCases = [
  {
    file: "base/debugger.js",
    name: "base",
    rule: "no-debugger",
  },
  {
    file: "base/command.js",
    name: "Command JavaScript plugin",
    rule: "command",
  },
  {
    file: "base/date-now.js",
    name: "base e18e JavaScript plugin",
    rule: "prefer-date-now",
  },
  {
    file: "base/date-now.js",
    name: "e18e override with every preset family disabled",
    options: {
      e18e: {
        modernization: false,
        moduleReplacements: false,
        overrides: { "e18e/prefer-date-now": "error" },
        performanceImprovements: false,
      },
    },
    rule: "prefer-date-now",
  },
  {
    file: "base/eval.js",
    name: "Security JavaScript plugin",
    options: { security: true },
    rule: "detect-eval-with-expression",
  },
  {
    file: "framework/angular.ts",
    name: "Angular TypeScript JavaScript plugin",
    options: { angular: true },
    rule: "no-empty-lifecycle-method",
  },
  {
    file: "framework/i18n.tsx",
    name: "i18next JavaScript plugin",
    options: { i18n: true },
    rule: "no-literal-string",
  },
  {
    file: "base/import-spacing.js",
    name: "Stylistic imports",
    options: { stylistic: true },
    rule: "newline-after-import",
  },
  {
    file: "base/perfectionist.js",
    name: "Perfectionist JavaScript plugin",
    options: { perfectionist: true },
    rule: "sort-named-exports",
  },
  {
    file: "base/regexp.js",
    name: "RegExp JavaScript plugin",
    options: { regexp: true },
    rule: "prefer-d",
  },
  {
    file: "unicorn/prefer-includes.js",
    name: "Unicorn",
    options: { unicorn: true },
    rule: "prefer-includes",
  },
  {
    file: "unicorn/consistent-destructuring.js",
    name: "aliased Unicorn fallback",
    options: { unicorn: { allRecommended: false } },
    rule: "consistent-destructuring",
  },
  {
    file: "jsx/missing-alt.jsx",
    name: "JSX accessibility",
    options: { jsx: true },
    rule: "alt-text",
  },
  {
    file: "typescript/explicit-any.ts",
    name: "TypeScript",
    options: { typescript: true },
    rule: "no-explicit-any",
  },
  {
    assertTypeAware: true,
    file: "typescript/floating-promise.ts",
    name: "type-aware TypeScript",
    options: { typescript: { typeAware: true } },
    rule: "no-floating-promises",
  },
  {
    file: "test/duplicate-title.test.ts",
    name: "Vitest",
    options: { test: true },
    rule: "no-identical-title",
  },
  {
    file: "test/only.test.ts",
    name: "aliased no-only-tests fallback",
    options: { test: true },
    rule: "no-only-tests",
  },
  {
    file: "framework/query.tsx",
    name: "TanStack Query JavaScript plugin",
    options: { query: true },
    rule: "no-rest-destructuring",
  },
  {
    file: "framework/solid-violation.tsx",
    name: "Solid JavaScript plugin",
    options: { solid: true, typescript: true },
    rule: "jsx-no-script-url",
  },
  {
    file: "framework/example.stories.tsx",
    name: "Storybook JavaScript plugin",
    options: { storybook: true },
    rule: "no-title-property-in-meta",
  },
  {
    file: "framework/tailwind.tsx",
    name: "Tailwind JavaScript plugin",
    options: {
      tailwindcss: {
        entryPoint: path.join(
          repoRoot,
          "fixtures/oxlint-native/src/globals.css",
        ),
        overrides: {
          "better-tailwindcss/no-duplicate-classes": [
            "warn",
            { cwd: repoRoot },
          ],
        },
      },
    },
    rule: "no-duplicate-classes",
  },
  {
    file: "framework/tailwind.tsx",
    name: "UnoCSS JavaScript plugin",
    options: { unocss: true },
    rule: "order",
  },
  {
    file: "vue/invalid-watch.vue",
    name: "Vue",
    options: { vue: true },
    rule: "no-arrow-functions-in-watch",
  },
  {
    file: "vue/mutating-prop.vue",
    name: "aliased Vue script fallback",
    options: { vue: true },
    rule: "no-mutating-props",
  },
  {
    assertTypeAware: true,
    file: "framework/react-mixed-exports.tsx",
    name: "type-aware React",
    options: { react: true, typescript: { typeAware: true } },
    rule: "only-export-components",
  },
  {
    file: "framework/next-image.tsx",
    name: "Next.js",
    options: { nextjs: true },
    rule: "no-img-element",
  },
  {
    file: "jsdoc/missing-param-name.js",
    name: "JSDoc",
    options: { jsdoc: true },
    rule: "require-param-name",
  },
  {
    file: "typescript/tsdoc.ts",
    name: "TSDoc JavaScript plugin",
    options: { tsdoc: true, typescript: true },
    rule: "syntax",
  },
  {
    file: "typescript/zod.ts",
    name: "Zod JavaScript plugin",
    options: { typescript: true, zod: true },
    rule: "prefer-zod-namespace",
  },
] satisfies Array<DiagnosticCase>;

afterEach(async () => {
  const directories = [...temporaryDirectories];
  temporaryDirectories.length = 0;
  await Promise.all(
    directories.map((directory) =>
      fs.rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("generated Oxlint config compatibility", () => {
  it("covers every generated variant in the compatibility report", () => {
    expect(
      variantLoadCases.map(({ name }) => name).toSorted(compareNames),
    ).toEqual(
      Object.keys(oxlintCompatibilityReport.variants).toSorted(compareNames),
    );
  });

  it("marks migration warnings and deliberate adaptations as partial", () => {
    const { perfectionist } = oxlintCompatibilityReport.variants;
    const reactTypeAware =
      oxlintCompatibilityReport.variants["react.typeAware"];

    expect(perfectionist?.warnings.length).toBeGreaterThan(0);
    expect(perfectionist?.status).toBe("partial");
    expect(reactTypeAware?.adaptations).toEqual(
      expect.arrayContaining([expect.stringContaining("parser services")]),
    );
    expect(reactTypeAware?.status).toBe("partial");
  });

  it.each(variantLoadCases)(
    "loads and schema-validates $name with the pinned Oxlint CLI",
    async ({ allowNoRules, config, file }) => {
      const result = await runOxlint(config, [file]);

      expect(result.output.number_of_files).toBe(1);
      if (allowNoRules) expect(result.output.number_of_rules).toBe(0);
      else expect(result.output.number_of_rules).toBeGreaterThan(0);
    },
    timeout,
  );

  it.each(diagnosticCases)(
    "reports a representative $name diagnostic",
    async ({ assertTypeAware, file, options, rule }) => {
      const config = createConfig(options);
      if (assertTypeAware) expect(config.options?.typeAware).toBe(true);

      const result = await runOxlint(config, [file]);

      expect(
        findDiagnostic(result.output, rule),
        JSON.stringify(result.output.diagnostics),
      ).toBeDefined();
    },
    timeout,
  );

  it.each([
    {
      config: generatedOxlintFragments.test.default.config,
      file: "test/top-level-await.test.ts",
      name: "test",
    },
    {
      config: generatedOxlintFragments.vue.javascript.config,
      file: "vue/top-level-await.vue",
      name: "Vue script",
    },
  ] satisfies Array<{
    config: OxlintConfig;
    file: string;
    name: string;
  }>)(
    "preserves the $name top-level-await disable",
    async ({ config, file }) => {
      const withoutIntegration = await runOxlint(
        generatedOxlintFragments.base.default,
        [file],
      );
      expect(
        findDiagnostic(withoutIntegration.output, "no-top-level-await"),
      ).toBeDefined();

      const withIntegration = await runOxlint(
        composeOxlintConfigs(generatedOxlintFragments.base.default, config),
        [file],
      );
      expect(
        findDiagnostic(withIntegration.output, "no-top-level-await"),
      ).toBeUndefined();
    },
    timeout,
  );

  it("applies the Vitest rules to the shared test globs", () => {
    const config = createConfig({ test: true });
    const vitestOverride = config.overrides?.find((override) =>
      Object.keys(override.rules ?? {}).includes("vitest/no-identical-title"),
    );

    expect(vitestOverride?.files).toEqual(translateOxlintGlobs(GLOB_TESTS));
  });

  it.each([
    {
      name: "root rules",
      options: {
        rules: { "typescript/no-explicit-any": "off" },
        typescript: true,
      } satisfies Partial<OxlintOptions>,
      userConfigs: [] as Array<OxlintConfig>,
    },
    {
      name: "a trailing config",
      options: { typescript: true } satisfies Partial<OxlintOptions>,
      userConfigs: [
        { rules: { "typescript/no-explicit-any": "off" } },
      ] satisfies Array<OxlintConfig>,
    },
  ])(
    "lets $name disable an earlier integration-scoped rule",
    async ({ options, userConfigs }) => {
      const result = await runOxlint(createConfig(options, userConfigs), [
        "typescript/explicit-any.ts",
      ]);

      expect(findDiagnostic(result.output, "no-explicit-any")).toBeUndefined();
    },
    timeout,
  );

  it(
    "loads JSX, TypeScript, React, and Next.js fragments in feature order",
    async () => {
      const config = createConfig({
        jsx: true,
        nextjs: true,
        react: true,
        typescript: true,
      });
      const featureOverrideIndexes = [
        findPluginOverrideIndex(config, "jsx-a11y"),
        findPluginOverrideIndex(config, "typescript"),
        findPluginOverrideIndex(config, "react"),
        findPluginOverrideIndex(config, "nextjs"),
      ];

      expect(featureOverrideIndexes.every((index) => index >= 0)).toBe(true);
      expect(featureOverrideIndexes).toEqual(
        featureOverrideIndexes.toSorted((left, right) => left - right),
      );

      const result = await runOxlint(config, [
        "framework/react.tsx",
        "framework/next.tsx",
      ]);
      expect(result.output.number_of_files).toBe(2);
    },
    timeout,
  );
});

function createConfig(
  options: Partial<OxlintOptions> = {},
  userConfigs: Array<OxlintConfig> = [],
): OxlintConfig {
  return createOxlintConfig({ ...disabledOptions, ...options }, userConfigs, {
    hasPackage: (name) => name === "oxlint-tsgolint",
    isInEditor: false,
  });
}

function findDiagnostic(
  output: OxlintJsonResult,
  ruleName: string,
): OxlintDiagnostic | undefined {
  return output.diagnostics.find((diagnostic) =>
    diagnostic.code?.replaceAll("_", "-").endsWith(`(${ruleName})`),
  );
}

function findPluginOverrideIndex(
  config: OxlintConfig,
  plugin: NonNullable<OxlintConfig["plugins"]>[number],
): number {
  return (
    config.overrides?.findIndex((override) =>
      override.plugins?.includes(plugin),
    ) ?? -1
  );
}

async function runOxlint(
  config: OxlintConfig,
  files: Array<string>,
): Promise<{ exitCode: number; output: OxlintJsonResult }> {
  const workingDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "nirtamir2-oxlint-native-"),
  );
  temporaryDirectories.push(workingDirectory);
  await fs.cp(fixtureRoot, workingDirectory, { recursive: true });
  await Promise.all(
    files.map((file) =>
      fs.rename(
        path.join(workingDirectory, `${file}.fixture`),
        path.join(workingDirectory, file),
      ),
    ),
  );

  const configPath = path.join(workingDirectory, "oxlint.config.json");
  await fs.writeFile(
    configPath,
    `${JSON.stringify(resolveGeneratedJsPlugins(config), undefined, 2)}\n`,
  );

  const pathEnvironmentKey =
    Object.keys(process.env).find((key) => key.toLowerCase() === "path") ??
    "PATH";
  const processResult = await execute(
    process.execPath,
    [
      oxlintCli,
      "--config",
      configPath,
      "--disable-nested-config",
      "--format",
      "json",
      "--threads",
      "1",
      ...files,
    ],
    {
      environment: {
        ...process.env,
        [pathEnvironmentKey]: [
          localBinDirectory,
          process.env[pathEnvironmentKey],
        ]
          .filter(Boolean)
          .join(path.delimiter),
      },
      workingDirectory,
    },
  );

  if (processResult.signal || ![0, 1].includes(processResult.exitCode ?? -1))
    throw new Error(formatProcessFailure(processResult));

  let output: OxlintJsonResult;
  try {
    output = JSON.parse(processResult.stdout) as OxlintJsonResult;
  } catch {
    throw new Error(formatProcessFailure(processResult));
  }

  if (!Array.isArray(output.diagnostics))
    throw new Error(formatProcessFailure(processResult));
  if (processResult.exitCode === 1 && output.diagnostics.length === 0)
    throw new Error(formatProcessFailure(processResult));

  return { exitCode: processResult.exitCode ?? 0, output };
}

async function execute(
  executable: string,
  arguments_: Array<string>,
  options: ExecuteOptions,
): Promise<ProcessResult> {
  const { environment, workingDirectory } = options;

  return await new Promise((resolve, reject) => {
    const child = spawn(executable, arguments_, {
      cwd: workingDirectory,
      env: environment,
      shell: false,
    });
    let stderr = "";
    let stdout = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      resolve({ exitCode, signal, stderr, stdout });
    });
  });
}

function formatProcessFailure(result: ProcessResult): string {
  return [
    `Oxlint failed to load the generated config (exit ${String(result.exitCode)}).`,
    result.stdout,
    result.stderr,
  ]
    .filter(Boolean)
    .join("\n");
}
