import { execa } from "execa";
import fg from "fast-glob";
import fs from "fs-extra";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, it } from "vitest";
import type { OptionsConfig, TypedFlatConfigItem } from "../src/types";

const isWindows = process.platform === "win32";
const timeout = isWindows ? 300_000 : 60_000;

beforeAll(async () => {
  await fs.rm("_fixtures", { recursive: true, force: true });
});
afterAll(async () => {
  await fs.rm("_fixtures", { recursive: true, force: true });
});
//
// runWithConfig("js", {
//   typescript: false,
//   vue: false,
// });
runWithConfig("all", {
  typescript: true,
  vue: true,
  svelte: true,
  astro: true,
});
// runWithConfig("no-style", {
//   typescript: true,
//   vue: true,
//   stylistic: false,
// });
// runWithConfig(
//   "tab-double-quotes",
//   {
//     typescript: true,
//     vue: true,
//     stylistic: {
//       indent: "tab",
//       quotes: "double",
//     },
//   },
//   {
//     rules: {
//       "@stylistic/no-mixed-spaces-and-tabs": "off",
//     },
//   },
// );

// https://github.com/antfu/eslint-config/issues/255
// runWithConfig(
//   "ts-override",
//   {
//     typescript: true,
//   },
//   {
//     rules: {
//       "@typescript-eslint/consistent-type-definitions": ["error", "type"],
//       "@typescript-eslint/explicit-member-accessibility": "warn",
//       "@typescript-eslint/parameter-properties": "warn",
//       "@typescript-eslint/no-explicit-any": "warn",
//     },
//   },
// );

// runWithConfig("with-formatters", {
//   typescript: true,
//   vue: true,
//   astro: true,
//   formatters: true,
// });

// runWithConfig("no-markdown-with-formatters", {
//   jsx: false,
//   vue: false,
//   markdown: false,
//   formatters: {
//     markdown: true,
//   },
// });

function runWithConfig(
  name: string,
  configs: OptionsConfig,
  ...items: Array<TypedFlatConfigItem>
) {
  it.concurrent(
    name,
    async ({ expect }) => {
      const from = resolve("fixtures/input");
      const output = resolve("fixtures/output", name);
      const target = resolve("_fixtures", name);

      await fs.copy(from, target, {
        filter: (source) => {
          return !source.includes("node_modules");
        },
      });
      await fs.writeFile(
        join(target, "eslint.config.js"),
        `
// @eslint-disable
import nirtamir2 from '@nirtamir2/eslint-config'

export default nirtamir2(
  ${JSON.stringify(configs)},
  ... ${JSON.stringify(items) ?? []},
)
  `,
      );

      const result = await execa(
        "pnpm",
        ["exec", "eslint", ".", "--fix", "--format", "json"],
        {
          cwd: target,
          reject: false,
          stdio: "pipe",
        },
      );

      expect([0, 1], result.stderr || result.stdout).toContain(result.exitCode);
      const lintResults: unknown = JSON.parse(result.stdout);
      if (!Array.isArray(lintResults))
        throw new TypeError("Expected ESLint JSON results");
      for (const lintResult of lintResults)
        expect(lintResult).toMatchObject({ fatalErrorCount: 0 });
      const anchorDiagnostic = expect.objectContaining({
        ruleId: "jsx-a11y/anchor-is-valid",
      });
      const tsxResult = expect.objectContaining({
        filePath: join(target, "tsx.tsx"),
        messages: expect.arrayContaining([anchorDiagnostic]),
      });
      expect(lintResults).toEqual(expect.arrayContaining([tsxResult]));

      const files = await fg("**/*", {
        ignore: ["node_modules", "eslint.config.js"],
        cwd: target,
      });

      await Promise.all(
        files.map(async (file) => {
          const content = await fs.readFile(join(target, file), "utf8");
          const outputPath = join(output, file);
          await expect.soft(content).toMatchFileSnapshot(outputPath);
        }),
      );
    },
    timeout,
  );
}
