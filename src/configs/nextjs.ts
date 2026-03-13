import { GLOB_SRC } from "../globs";
import type {
  OptionsFiles,
  OptionsOverrides,
  TypedFlatConfigItem,
} from "../types";
import { ensurePackages, interopDefault } from "../utils";

function normalizeRules(
  rules: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(rules).map(([key, value]) => [
      key,
      typeof value === "string" ? [value] : value,
    ]),
  );
}

export async function nextjs(
  options: OptionsOverrides & OptionsFiles = {},
): Promise<Array<TypedFlatConfigItem>> {
  const { files = [GLOB_SRC], overrides = {} } = options;

  await ensurePackages(["@next/eslint-plugin-next"]);

  const pluginNextJS = await interopDefault(import("@next/eslint-plugin-next"));

  function getRules(name: keyof typeof pluginNextJS.configs) {
    const rules = pluginNextJS.configs?.[name]?.rules;
    if (!rules) {
      throw new Error(
        "[@nirtamir2/eslint-config] Failed to find config in @next/eslint-plugin-next",
      );
    }
    return normalizeRules(rules);
  }

  return [
    {
      name: "antfu/nextjs/setup",
      plugins: {
        "@next/next": pluginNextJS,
      },
    },
    {
      files,
      languageOptions: {
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
        sourceType: "module",
      },
      name: "antfu/nextjs/rules",
      rules: {
        ...getRules("recommended"),
        ...getRules("core-web-vitals"),
        ...overrides,
      },
      settings: {
        react: {
          version: "detect",
        },
      },
    },
  ];
}
