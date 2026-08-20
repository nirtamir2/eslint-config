import { execa } from "execa";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/**
The subset of a package manifest's `exports` map this script inspects.
*/
type PackageExports = Record<string, string | undefined>;

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureRoot = path.join(repoRoot, "fixtures", "oxlint-consumer");
const temporaryRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "nirtamir2-oxlint-package-"),
);
const consumerRoot = path.join(temporaryRoot, "consumer");
const tarballPath = path.join(temporaryRoot, "eslint-config.tgz");

try {
  const [eslintVersion, oxlintVersion, typescriptVersion] = await Promise.all(
    ["eslint", "oxlint", "typescript"].map((packageName) =>
      readInstalledPackageVersion(packageName),
    ),
  );

  await execa("pnpm", ["pack", "--out", tarballPath], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  await fs.cp(fixtureRoot, consumerRoot, { recursive: true });
  await fs.rename(
    path.join(consumerRoot, "src", "invalid.ts.fixture"),
    path.join(consumerRoot, "src", "invalid.ts"),
  );
  await fs.rename(
    path.join(consumerRoot, "src", "slop.ts.fixture"),
    path.join(consumerRoot, "src", "slop.ts"),
  );
  await fs.writeFile(
    path.join(consumerRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "oxlint-packed-consumer",
        private: true,
        type: "module",
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

  await execa(
    "pnpm",
    [
      "install",
      "--ignore-workspace",
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
  // SAFETY: only `exports` is read, and each lookup is compared against a literal.
  const installedManifest = JSON.parse(
    await fs.readFile(path.join(installedPackageRoot, "package.json"), "utf8"),
  ) as { exports?: PackageExports };

  assert.equal(
    installedManifest.exports?.["./oxlint"],
    "./dist/oxlint.mjs",
  );
  assert.equal(
    installedManifest.exports?.["./oxlint-anti-slop"],
    "./dist/oxlint-anti-slop.mjs",
  );

  await execa("pnpm", ["exec", "tsc", "--noEmit"], {
    cwd: consumerRoot,
    stdio: "inherit",
  });
  await fs.access(path.join(installedPackageRoot, "dist", "oxlint.d.mts"));

  await assertRuntimeGraphIsLightweight(
    installedPackageRoot,
    path.join(installedPackageRoot, "dist", "oxlint.mjs"),
  );
  await assertRuntimeGraphIsLightweight(
    installedPackageRoot,
    path.join(installedPackageRoot, "dist", "oxlint-anti-slop.mjs"),
  );

  const recommendedRun = await execa(
    "pnpm",
    [
      "exec",
      "oxlint",
      "--config",
      "oxlint.recommended.config.ts",
      "src/valid.ts",
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

  // Proves the vendored JS plugin resolves and loads from a real node_modules install.
  const antiSlopRun = await execa(
    "pnpm",
    ["exec", "oxlint", "--config", "oxlint.anti-slop.config.ts", "src/slop.ts"],
    {
      all: true,
      cwd: consumerRoot,
      reject: false,
    },
  );
  assert.notEqual(
    antiSlopRun.exitCode,
    0,
    `Expected the packed anti-slop plugin to report an error:\n${antiSlopRun.all}`,
  );
  assert.match(antiSlopRun.all, /anti-slop\(no-reflect-get\)/u);

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

function isForbiddenRuntimeImport(specifier: string): boolean {
  return (
    specifier === "@oxlint/migrate" ||
    specifier.startsWith("@oxlint/migrate/") ||
    (!specifier.startsWith(".") && specifier.includes("eslint"))
  );
}

async function readInstalledPackageVersion(
  packageName: string,
): Promise<string> {
  // SAFETY: only `version` is read, and the guard below rejects a non-string value.
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
