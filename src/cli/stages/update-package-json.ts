import * as p from "@clack/prompts";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import c from "picocolors";
import { dependenciesMap, pkgJson as packageJson } from "../constants";
import type { PackageJsonLike, PromptResult } from "../types";

const ESLINT_TS_PATCH_SUFFIX_PATTERN = /-\d+$/;

export async function updatePackageJson(result: PromptResult) {
  const cwd = process.cwd();

  const pathPackageJSON = path.join(cwd, "package.json");

  p.log.step(c.cyan(`Bumping @nirtamir2/eslint-config to v${packageJson.version}`));

  const packageContent = await fsp.readFile(pathPackageJSON, "utf8");
  const package_: PackageJsonLike = JSON.parse(packageContent);

  package_.devDependencies ??= {};
  package_.devDependencies["@nirtamir2/eslint-config"] = `^${packageJson.version}`;
  package_.devDependencies.eslint ??= packageJson.devDependencies.eslint
    .replace("npm:eslint-ts-patch@", "")
    .replace(ESLINT_TS_PATCH_SUFFIX_PATTERN, "");

  const addedPackages: Array<string> = [];

  if (result.extra.length > 0) {
    for (const item of result.extra) {
      switch (item) {
        case "formatter": {
          for (const f of [
            "eslint-plugin-format",
            result.frameworks.includes("astro")
              ? "prettier-plugin-astro"
              : null,
          ] as const) {
            if (!f) continue;
            package_.devDependencies[f] = packageJson.devDependencies[f];
            addedPackages.push(f);
          }
          break;
        }
        case "perfectionist": {
          for (const f of ["eslint-plugin-perfectionist"] as const) {
            package_.devDependencies[f] = packageJson.devDependencies[f];
            addedPackages.push(f);
          }
          break;
        }
        case "unocss": {
          for (const f of ["@unocss/eslint-plugin"] as const) {
            package_.devDependencies[f] = packageJson.devDependencies[f];
            addedPackages.push(f);
          }
          break;
        }
      }
    }
  }

  for (const framework of result.frameworks) {
    const dependencies = dependenciesMap[framework];
    if (dependencies) {
      for (const f of dependencies) {
        package_.devDependencies[f] = packageJson.devDependencies[f];
        addedPackages.push(f);
      }
    }
  }

  if (addedPackages.length > 0)
    p.note(c.dim(addedPackages.join(", ")), "Added packages");

  await fsp.writeFile(pathPackageJSON, JSON.stringify(package_, null, 2));
  p.log.success(c.green(`Changes wrote to package.json`));
}
