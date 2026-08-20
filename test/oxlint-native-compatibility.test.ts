import type { OxlintConfig } from "oxlint";
import type { OxlintOptions } from "../src/oxlint/types";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { translateOxlintGlobs } from "../scripts/oxlint/normalize";
import {
  generatedOxlintFragments,
  oxlintCompatibilityReport,
} from "../src/generated/oxlint";
import { GLOB_TESTS } from "../src/globs";
import { createOxlintConfig } from "../src/oxlint/factory";

interface OxlintDiagnostic {
  code: string;
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
const compareNames = (left: string, right: string) =>
  left.localeCompare(right);

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
    config: generatedOxlintFragments.jsdoc.config,
    file: "jsdoc/missing-param-name.js",
    name: "jsdoc",
  },
] satisfies Array<VariantLoadCase>;

const diagnosticCases = [
  {
    file: "base/debugger.js",
    name: "base",
    rule: "no-debugger",
  },
  {
    file: "unicorn/prefer-includes.js",
    name: "Unicorn",
    options: { unicorn: true },
    rule: "prefer-includes",
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
    file: "vue/invalid-watch.vue",
    name: "Vue",
    options: { vue: true },
    rule: "no-arrow-functions-in-watch",
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
    file: "anti-slop/low-evidence.ts",
    name: "anti-slop JS plugin",
    options: { antiSlop: true },
    rule: "no-reflect-get",
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

  it.each(variantLoadCases)(
    "loads and schema-validates $name with the pinned Oxlint CLI",
    async ({ config, file }) => {
      const result = await runOxlint(config, [file]);

      expect(result.output.number_of_files).toBe(1);
      expect(result.output.number_of_rules).toBeGreaterThan(0);
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

  it("applies the Vitest rules to the shared test globs", () => {
    const config = createConfig({ test: true });
    const vitestOverride = config.overrides?.find((override) =>
      Object.keys(override.rules ?? {}).includes(
        "vitest/no-identical-title",
      ),
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
      // SAFETY: an empty literal needs the annotation to join the case union below.
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
      const result = await runOxlint(
        createConfig(options, userConfigs),
        ["typescript/explicit-any.ts"],
      );

      expect(
        findDiagnostic(result.output, "no-explicit-any"),
      ).toBeUndefined();
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
  return createOxlintConfig(
    { ...disabledOptions, ...options },
    userConfigs,
    {
      hasPackage: (name) => name === "oxlint-tsgolint",
      isInEditor: false,
    },
  );
}

function findDiagnostic(
  output: OxlintJsonResult,
  ruleName: string,
): OxlintDiagnostic | undefined {
  return output.diagnostics.find((diagnostic) =>
    diagnostic.code.replaceAll("_", "-").endsWith(`(${ruleName})`),
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
    `${JSON.stringify(config, undefined, 2)}\n`,
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
    // SAFETY: `--format json` output; a parse failure is caught and rethrown below.
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
