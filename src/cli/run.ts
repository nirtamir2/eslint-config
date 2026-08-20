import type {
  ExtraLibrariesOption,
  FrameworkOption,
  PromptResult,
} from "./types";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as p from "@clack/prompts";
import c from "picocolors";
import { extra, extraOptions, frameworkOptions, frameworks } from "./constants";
import { updateEslintFiles } from "./stages/update-eslint-files";
import { updatePackageJson } from "./stages/update-package-json";
import { updateVscodeSettings } from "./stages/update-vscode-settings";
import { isGitClean } from "./utils";

export interface CliRunOptions {
  /**
   * Skip prompts and use default values
   */
  yes?: boolean;
  /**
   * Use the framework template for optimal customization: vue / react / svelte / astro
   */
  frameworks?: Array<string>;
  /**
   * Use the extra utils: formatter / perfectionist / unocss
   */
  extra?: Array<string>;
}

export async function run(options: CliRunOptions = {}) {
  const argumentSkipPrompt = Boolean(process.env.SKIP_PROMPT) || options.yes;
  // SAFETY: `frameworks` is already typed as FrameworkOption values; trimming
  // whitespace does not change which member of the union each entry is.
  const argumentTemplate = options.frameworks?.map((m) =>
    m.trim(),
  ) as Array<FrameworkOption>;
  // SAFETY: as above, for the ExtraLibrariesOption union.
  const argumentExtra = options.extra?.map((m) =>
    m.trim(),
  ) as Array<ExtraLibrariesOption>;

  if (fs.existsSync(path.join(process.cwd(), "eslint.config.js"))) {
    p.log.warn(
      c.yellow(`eslint.config.js already exists, migration wizard exited.`),
    );
    return process.exit(1);
  }

  // Set default value for promptResult if `argSkipPrompt` is enabled
  let result: PromptResult = {
    uncommittedConfirmed: false,
    frameworks: argumentTemplate ?? [],
    extra: argumentExtra ?? [],
    updateVscodeSettings: true,
  };

  if (!argumentSkipPrompt) {
    // SAFETY: the prompt group below supplies every key of PromptResult.
    result = (await p.group(
      {
        uncommittedConfirmed: async () => {
          if (argumentSkipPrompt || isGitClean()) return true;

          return await p.confirm({
            initialValue: false,
            message:
              "There are uncommitted changes in the current repository, are you sure to continue?",
          });
        },
        frameworks: async ({ results }) => {
          const isArgumentTemplateValid =
            typeof argumentTemplate === "string" &&
            frameworks.includes(argumentTemplate);

          if (!results.uncommittedConfirmed || isArgumentTemplateValid) return;

          const message =
            !isArgumentTemplateValid && argumentTemplate
              ? `"${argumentTemplate}" isn't a valid template. Please choose from below: `
              : "Select a framework:";

          return await p.multiselect<FrameworkOption>({
            message: c.reset(message),
            options: frameworkOptions,
            required: false,
          });
        },
        extra: async ({ results }) => {
          const isArgumentExtraValid =
            argumentExtra.length > 0 &&
            argumentExtra.every((element) => extra.includes(element));

          if (!results.uncommittedConfirmed || isArgumentExtraValid) return;

          const message =
            !isArgumentExtraValid && argumentExtra
              ? `"${argumentExtra}" isn't a valid extra util. Please choose from below: `
              : "Select a extra utils:";

          return await p.multiselect<ExtraLibrariesOption>({
            message: c.reset(message),
            options: extraOptions,
            required: false,
          });
        },

        updateVscodeSettings: async ({ results }) => {
          if (!results.uncommittedConfirmed) return;

          return await p.confirm({
            initialValue: true,
            message:
              "Update .vscode/settings.json for better VS Code experience?",
          });
        },
      },
      {
        onCancel: () => {
          p.cancel("Operation cancelled.");
          process.exit(0);
        },
      },
    )) as PromptResult;

    if (!result.uncommittedConfirmed) return process.exit(1);
  }

  await updatePackageJson(result);
  await updateEslintFiles(result);
  await updateVscodeSettings(result);

  p.log.success(c.green(`Setup completed`));
  p.outro(
    `Now you can update the dependencies by run ${c.blue("pnpm install")} and run ${c.blue("eslint . --fix")}\n`,
  );
}
