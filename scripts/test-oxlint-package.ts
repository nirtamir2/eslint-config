import { execa } from "execa";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureRoot = path.join(repoRoot, "fixtures", "oxlint-consumer");
const temporaryRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "nirtamir2-oxlint-package-"),
);
const consumerRoot = path.join(temporaryRoot, "consumer");
const tarballPath = path.join(temporaryRoot, "eslint-config.tgz");

try {
  const [eslintVersion, oxlintVersion, typescriptVersion, packageManager] =
    await Promise.all([
      ...["eslint", "oxlint", "typescript"].map((packageName) =>
        readInstalledPackageVersion(packageName),
      ),
      readPackageManager(),
    ]);

  await execa("pnpm", ["pack", "--out", tarballPath], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  await fs.cp(fixtureRoot, consumerRoot, { recursive: true });
  await fs.rename(
    path.join(consumerRoot, "src", "invalid.ts.fixture"),
    path.join(consumerRoot, "src", "invalid.ts"),
  );
  await fs.writeFile(
    path.join(consumerRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "oxlint-packed-consumer",
        private: true,
        type: "module",
        packageManager,
        devDependencies: {
          "@nirtamir2/eslint-config": `file:${tarballPath}`,
          eslint: eslintVersion,
          oxlint: oxlintVersion,
          typescript: typescriptVersion,
        },
      },
      undefined,
      2,
    )}\n`,
  );
  await fs.writeFile(
    path.join(consumerRoot, "pnpm-workspace.yaml"),
    "allowBuilds:\n  unrs-resolver: true\n",
  );

  await execa(
    "pnpm",
    [
      "install",
      "--no-frozen-lockfile",
      "--no-lockfile",
      // Keep the workspace trust policy focused on recently published packages.
      "--trust-policy-ignore-after=10080",
    ],
    {
      cwd: consumerRoot,
      stdio: "inherit",
    },
  );

  const installedPackageRoot = path.join(
    consumerRoot,
    "node_modules",
    "@nirtamir2",
    "eslint-config",
  );
  const installedManifest = JSON.parse(
    await fs.readFile(path.join(installedPackageRoot, "package.json"), "utf8"),
  ) as { exports?: Record<string, unknown> };

  assert.equal(installedManifest.exports?.["./oxlint"], "./dist/oxlint.mjs");

  await execa("pnpm", ["exec", "tsc", "--noEmit"], {
    cwd: consumerRoot,
    stdio: "inherit",
  });
  await fs.access(path.join(installedPackageRoot, "dist", "oxlint.d.mts"));

  await assertRuntimeGraphIsLightweight(
    installedPackageRoot,
    path.join(installedPackageRoot, "dist", "oxlint.mjs"),
  );

  await assertInstalledJsPluginResolvesFromConsumer(
    consumerRoot,
    "@e18e/eslint-plugin",
    "e18e",
  );

  const recommendedRun = await execa(
    "pnpm",
    [
      "exec",
      "oxlint",
      "--config",
      "oxlint.recommended.config.ts",
      "src/valid.ts",
      "src/types.d.ts",
    ],
    {
      all: true,
      cwd: consumerRoot,
      reject: false,
    },
  );
  assert.equal(
    recommendedRun.exitCode,
    0,
    `The packed recommended config failed to load:\n${recommendedRun.all}`,
  );

  const factoryRun = await execa(
    "pnpm",
    ["exec", "oxlint", "--config", "oxlint.config.ts", "src/invalid.ts"],
    {
      all: true,
      cwd: consumerRoot,
      reject: false,
    },
  );
  assert.notEqual(factoryRun.exitCode, 0, "Expected Oxlint to report an error");
  assert.match(factoryRun.all, /no-debugger/u);
  assert.match(factoryRun.all, /e18e\(prefer-date-now\)/u);

  process.stdout.write("Packed Oxlint consumer passed.\n");
} finally {
  await fs.rm(temporaryRoot, { force: true, recursive: true });
}

function collectModuleSpecifiers(source: string): Array<string> {
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/gu,
    /\bimport\s+["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']/gu,
  ];

  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]),
  );
}

async function assertRuntimeGraphIsLightweight(
  packageRoot: string,
  entryPath: string,
): Promise<void> {
  const pending = [entryPath];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const modulePath = pending.pop();
    assert.ok(modulePath);
    if (visited.has(modulePath)) continue;
    visited.add(modulePath);

    const source = await fs.readFile(modulePath, "utf8");
    for (const specifier of collectModuleSpecifiers(source)) {
      assert.equal(
        isForbiddenRuntimeImport(specifier),
        false,
        `The packed Oxlint runtime imports ${specifier} from ${path.relative(
          packageRoot,
          modulePath,
        )}`,
      );

      if (!specifier.startsWith(".")) continue;
      const dependencyPath = path.resolve(path.dirname(modulePath), specifier);
      assert.ok(
        dependencyPath.startsWith(packageRoot),
        `Runtime import escapes the package: ${specifier}`,
      );
      pending.push(dependencyPath);
    }
  }
}

async function assertInstalledJsPluginResolvesFromConsumer(
  consumerRoot: string,
  packageName: string,
  pluginName: string,
): Promise<void> {
  const inspectedConfig = await execa(
    "node",
    [
      "--input-type=module",
      "--eval",
      `
        import oxlint from "@nirtamir2/eslint-config/oxlint";

        const config = oxlint({
          e18e: true,
          jsdoc: false,
          jsx: false,
          nextjs: false,
          react: false,
          regexp: false,
          test: false,
          typescript: false,
          unicorn: false,
          vue: false,
        });
        process.stdout.write(JSON.stringify(config.jsPlugins ?? []));
      `,
    ],
    { cwd: consumerRoot },
  );
  const entries = JSON.parse(inspectedConfig.stdout) as Array<
    string | { name: string; specifier: string }
  >;
  const entry = entries.find(
    (candidate): candidate is { name: string; specifier: string } =>
      typeof candidate !== "string" && candidate.name === pluginName,
  );

  assert.ok(entry, `The packed config did not export the ${pluginName} plugin`);
  assert.equal(
    entry.specifier.includes(packageName),
    true,
    `The ${pluginName} entry does not point at ${packageName}: ${entry.specifier}`,
  );

  const [realConsumerRoot, realPluginPath] = await Promise.all([
    fs.realpath(consumerRoot),
    fs.realpath(entry.specifier),
  ]);
  const relativePluginPath = path.relative(realConsumerRoot, realPluginPath);
  assert.equal(
    relativePluginPath.startsWith("..") || path.isAbsolute(relativePluginPath),
    false,
    `The packed ${pluginName} plugin resolved outside the consumer install: ${entry.specifier}`,
  );
}

function isForbiddenRuntimeImport(specifier: string): boolean {
  if (specifier === "eslint-config-flat-gitignore") return false;
  return (
    specifier === "@oxlint/migrate" ||
    specifier.startsWith("@oxlint/migrate/") ||
    (!specifier.startsWith(".") && specifier.includes("eslint"))
  );
}

async function readInstalledPackageVersion(
  packageName: string,
): Promise<string> {
  const manifest = JSON.parse(
    await fs.readFile(
      path.join(repoRoot, "node_modules", packageName, "package.json"),
      "utf8",
    ),
  ) as { version?: unknown };
  if (typeof manifest.version !== "string")
    throw new TypeError(`${packageName} has no string version`);
  return manifest.version;
}

async function readPackageManager(): Promise<string> {
  const manifest = JSON.parse(
    await fs.readFile(path.join(repoRoot, "package.json"), "utf8"),
  ) as { packageManager?: unknown };
  if (typeof manifest.packageManager !== "string")
    throw new TypeError("package.json has no string packageManager");
  return manifest.packageManager;
}
