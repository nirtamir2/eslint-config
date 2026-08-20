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
  // Snapshot rows are heterogeneous summaries, not a typed domain object.
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- snapshot summary
): Array<Record<string, any>> {
  return configs.map((config) => {
    if (config.name && ignoreConfigs.has(config.name)) {
      return { name: "[ignored]" };
    }

    // SAFETY: the clone is a snapshot scratch object whose fields are replaced with
    // serializable summaries below, so it deliberately drops the flat-config type.
    // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type, anti-slop/no-known-value-widening -- snapshot summary
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
          // SAFETY: narrowed to a parser object above; `meta` and `name` are optional
          // in practice, which is why both are probed before falling back.
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
      // SAFETY: narrowed to a processor object above; `meta` is optional in practice.
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

for (const { name, configs } of suites) {
  it.concurrent(`factory ${name}`, async ({ expect }) => {
    const resolved = await nirtamir2(configs);
    await expect(serializeConfigs(resolved)).toMatchFileSnapshot(
      `./__snapshots__/factory/${name}.snap.js`,
    );
  });
}
