import { flatConfigsToRulesDTS } from "eslint-typegen/core";
import { builtinRules } from "eslint/use-at-your-own-risk";
import fs from "node:fs/promises";
import {
  a11y,
  astro,
  combine,
  command,
  comments,
  defaultImportName,
  formatters,
  i18n,
  ignores,
  imports,
  javascript,
  jsdoc,
  jsonc,
  markdown,
  node,
  perfectionist,
  prettier,
  query,
  react,
  regexp,
  security,
  solid,
  sortPackageJson,
  storybook,
  stylistic,
  svelte,
  tailwindcss,
  test,
  toml,
  tsdoc,
  typescript,
  unicorn,
  unocss,
  vue,
  yaml,
} from "../src";

const configs = await combine(
  {
    plugins: {
      "": {
        rules: Object.fromEntries(builtinRules.entries()),
      },
    },
  },
  a11y(),
  astro(),
  command(),
  comments(),
  formatters(),
  i18n(),
  ignores(),
  imports(),
  javascript(),
  jsonc(),
  jsdoc(),
  tsdoc(),
  defaultImportName(),
  markdown(),
  node(),
  perfectionist(),
  prettier(),
  react(),
  regexp(),
  security(),
  solid(),
  sortPackageJson(),
  storybook(),
  query(),
  stylistic(),
  svelte(),
  tailwindcss(),
  test(),
  toml(),
  typescript(),
  unicorn(),
  unocss(),
  vue(),
  yaml(),
);

const configNames = configs
  .map((i) => i?.name)
  .filter(Boolean) as Array<string>;

let dts = await flatConfigsToRulesDTS(configs, {
  includeAugmentation: false,
});

dts += `
// Names of all the configs
export type ConfigNames = ${configNames.map((i) => `'${i}'`).join(" | ")}
`;

await fs.writeFile("src/typegen.d.ts", dts);
