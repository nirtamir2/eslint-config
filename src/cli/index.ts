import process from "node:process";
import * as p from "@clack/prompts";
import c from "picocolors";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { pkgJson as packageJson } from "./constants";
import { run } from "./run";

function header() {
  console.log("\n");
  p.intro(
    `${c.green(`@nirtamir2/eslint-config `)}${c.dim(`v${packageJson.version}`)}`,
  );
}

const instance = yargs(hideBin(process.argv))
  .scriptName("@nirtamir2/eslint-config")
  .usage("")
  .command(
    "*",
    "Run the initialization or migration",
    (arguments_) =>
      arguments_
        .option("yes", {
          alias: "y",
          description: "Skip prompts and use default values",
          type: "boolean",
        })
        .option("template", {
          alias: "t",
          description:
            "Use the framework template for optimal customization: vue / react / svelte / astro",
          type: "string",
        })
        .option("extra", {
          alias: "e",
          array: true,
          description:
            "Use the extra utils: formatter / perfectionist / unocss",
          type: "string",
        })
        .help(),
    async (arguments_) => {
      header();
      try {
        await run(arguments_);
      } catch (error) {
        p.log.error(c.inverse(c.red(" Failed to migrate ")));
        p.log.error(c.red(`✘ ${String(error)}`));
        process.exit(1);
      }
    },
  )
  .showHelpOnFail(false)
  .alias("h", "help")
  .version("version", packageJson.version)
  .alias("v", "version");

void instance.help().argv;
