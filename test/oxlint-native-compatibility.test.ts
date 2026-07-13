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

const require = createRequire(import.meta.url);
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureRoot = path.join(repositoryRoot, "fixtures", "oxlint-native");
const oxlintPackageRoot = path.dirname(require.resolve("oxlint/package.json"));
const oxlintCli = path.join(oxlintPackageRoot, "bin", "oxlint");
const localBinDirectory = path.join(repositoryRoot, "node_modules", ".bin");
const temporaryDirectories: Array<string> = [];
const timeout = process.platform === "win32" ? 120_000 : 60_000;

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

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("generated Oxlint config compatibility", () => {
  it(
    "reports the base no-debugger rule with the pinned Oxlint CLI",
    async () => {
      const result = await runOxlint(createConfig(), ["base/debugger.js"]);

      expect(result.exitCode).toBe(1);
      expect(findDiagnostic(result.output, "no-debugger")).toBeDefined();
    },
    timeout,
  );

  it(
    "reports a native JSX accessibility diagnostic",
    async () => {
      const result = await runOxlint(createConfig({ jsx: true }), [
        "jsx/missing-alt.jsx",
      ]);

      expect(findDiagnostic(result.output, "alt-text")).toBeDefined();
    },
    timeout,
  );

  it(
    "applies the Vitest rules to the shared test globs",
    async () => {
      const config = createConfig({ test: true });
      const vitestOverride = config.overrides?.find((override) =>
        Object.keys(override.rules ?? {}).includes(
          "vitest/no-identical-title",
        ),
      );

      expect(vitestOverride?.files).toEqual(translateOxlintGlobs(GLOB_TESTS));

      const result = await runOxlint(config, [
        "test/duplicate-title.test.ts",
      ]);
      expect(
        findDiagnostic(result.output, "no-identical-title"),
      ).toBeDefined();
    },
    timeout,
  );

  it(
    "loads type-aware TypeScript rules through oxlint-tsgolint",
    async () => {
      const config = createConfig({
        typescript: { typeAware: true },
      });

      expect(config.options?.typeAware).toBe(true);

      const result = await runOxlint(config, [
        "typescript/floating-promise.ts",
      ]);
      expect(
        findDiagnostic(result.output, "no-floating-promises"),
      ).toBeDefined();
    },
    timeout,
  );

  it(
    "loads a Vue script block without config or plugin errors",
    async () => {
      const result = await runOxlint(createConfig({ vue: true }), [
        "vue/component.vue",
      ]);

      expect(result.output.number_of_files).toBe(1);
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

function createConfig(options: Partial<OxlintOptions> = {}): OxlintConfig {
  return createOxlintConfig(
    { ...disabledOptions, ...options },
    [],
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
