import type { TypedFlatConfigItem } from "../src/types";
import { it } from "vitest";
import { nirtamir2 } from "../src/factory";

type FactoryOptions = NonNullable<Parameters<typeof nirtamir2>[0]>;

interface Suite {
  name: string;
  configs: FactoryOptions;
}

const suites: Array<Suite> = [
  {
    name: "default",
    configs: {},
  },
  {
    name: "perfectionist",
    configs: {
      perfectionist: true,
    },
  },
  {
    name: "in-editor",
    configs: {
      isInEditor: true,
    },
  },
  {
    name: "less-opinionated",
    configs: {
      lessOpinionated: true,
    },
  },
  {
    name: "lib",
    configs: {
      type: "lib",
    },
  },
  {
    name: "react-nextjs-zod",
    configs: {
      typescript: false,
      zod: true,
      react: true,
      nextjs: true,
    },
  },
];

const ignoreConfigs = new Set([
  "antfu/gitignore",
  "antfu/ignores",
  "antfu/javascript/setup",
]);

function serializeConfigs(
  configs: Array<TypedFlatConfigItem>,
): Array<Record<string, any>> {
  return configs.map((config) => {
    if (config.name && ignoreConfigs.has(config.name)) {
      return { name: "[ignored]" };
    }

    const clone = { ...config } as Record<string, any>;

    if (config.plugins) {
      clone.plugins = Object.keys(config.plugins);
    }

    if (config.languageOptions) {
      if (
        config.languageOptions.parser &&
        typeof config.languageOptions.parser !== "string"
      ) {
        clone.languageOptions.parser =
          (config.languageOptions.parser as any).meta?.name ||
          (config.languageOptions.parser as any).name ||
          "unknown";
      }

      delete clone.languageOptions.globals;

      if (config.languageOptions.parserOptions) {
        delete clone.languageOptions.parserOptions.parser;
        delete clone.languageOptions.parserOptions.projectService;
        delete clone.languageOptions.parserOptions.tsconfigRootDir;
      }
    }

    if (config.processor && typeof config.processor !== "string") {
      clone.processor = (config.processor as any).meta?.name || "unknown";
    }

    if (config.rules) {
      clone.rules = Object.entries(config.rules).map(([rule, value]) => {
        if (value === "off" || value === 0) {
          return `- ${rule}`;
        }

        return rule;
      });
    }

    return clone;
  });
}

suites.forEach(({ name, configs }) => {
  it.concurrent(`factory ${name}`, async ({ expect }) => {
    const resolved = await nirtamir2(configs);
    await expect(serializeConfigs(resolved)).toMatchFileSnapshot(
      `./__snapshots__/factory/${name}.snap.js`,
    );
  });
});
