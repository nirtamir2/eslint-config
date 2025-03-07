import * as p from "@clack/prompts";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
// @ts-expect-error missing types
import parse from "parse-gitignore";
import c from "picocolors";
import type { PromptResult } from "../types";
import { getEslintConfigContent } from "../utils";

export async function updateEslintFiles(result: PromptResult) {
  const cwd = process.cwd();
  const pathESLintIgnore = path.join(cwd, ".eslintignore");
  const pathPackageJSON = path.join(cwd, "package.json");

  const pkgContent = await fsp.readFile(pathPackageJSON, "utf8");
  const pkg: Record<string, any> = JSON.parse(pkgContent);

  const configFileName =
    pkg.type === "module" ? "eslint.config.js" : "eslint.config.mjs";
  const pathFlatConfig = path.join(cwd, configFileName);

  const eslintIgnores: Array<string> = [];
  if (fs.existsSync(pathESLintIgnore)) {
    p.log.step(c.cyan(`Migrating existing .eslintignore`));
    const content = await fsp.readFile(pathESLintIgnore, "utf8");
    const parsed = parse(content);
    const globs = parsed.globs();

    for (const glob of globs) {
      if (glob.type === "ignore") eslintIgnores.push(...glob.patterns);
      else if (glob.type === "unignore")
        eslintIgnores.push(
          ...glob.patterns.map((pattern: string) => `!${pattern}`),
        );
    }
  }

  const configLines: Array<string> = [];

  if (eslintIgnores.length > 0)
    configLines.push(`ignores: ${JSON.stringify(eslintIgnores)},`);

  if (result.extra.includes("formatter")) configLines.push(`formatters: true,`);

  if (result.extra.includes("unocss")) configLines.push(`unocss: true,`);

  for (const framework of result.frameworks)
    configLines.push(`${framework}: true,`);

  const mainConfig = configLines.map((i) => `  ${i}`).join("\n");
  const additionalConfig: Array<string> = [];

  const eslintConfigContent: string = getEslintConfigContent(
    mainConfig,
    additionalConfig,
  );

  await fsp.writeFile(pathFlatConfig, eslintConfigContent);
  p.log.success(c.green(`Created ${configFileName}`));

  const files = fs.readdirSync(cwd);
  const legacyConfig: Array<string> = [];
  for (const file of files) {
    if (/eslint|prettier/.test(file) && !file.includes('eslint.config.'))
      legacyConfig.push(file);
  }

  if (legacyConfig.length > 0)
    p.note(
      c.dim(legacyConfig.join(", ")),
      "You can now remove those files manually",
    );
}
