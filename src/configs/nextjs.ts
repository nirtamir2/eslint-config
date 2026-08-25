import type {
  OptionsFiles,
  OptionsOverrides,
  TypedFlatConfigItem,
} from "../types";
import { GLOB_SRC } from "../globs";
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
  const { overrides = {}, files = [GLOB_SRC] } = options;

  await ensurePackages(["@next/eslint-plugin-next", "eslint-plugin-react-refresh"]);

  const [pluginNextJS, pluginReactRefresh] = await Promise.all([
    interopDefault(import("@next/eslint-plugin-next")),
    interopDefault(import("eslint-plugin-react-refresh")),
  ] as const);

  function getRules(name: keyof typeof pluginNextJS.configs) {
    const rules = pluginNextJS.configs?.[name]?.rules;
    if (!rules) {
      throw new Error(
        "[@nirtamir2/eslint-config] Failed to find config in @next/eslint-plugin-next",
      );
    }
    return normalizeRules(rules);
  }

  const reactRefreshRule =
    pluginReactRefresh.configs.next.rules["react-refresh/only-export-components"];

  return [
    {
      name: "antfu/nextjs/setup",
      plugins: {
        "@next/next": pluginNextJS,
        "react-refresh": pluginReactRefresh,
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
        "react-refresh/only-export-components": [
          "warn",
          ...(Array.isArray(reactRefreshRule) ? reactRefreshRule.slice(1) : []),
        ],
        ...overrides,
      },
      settings: {
        react: {
          version: "detect",
        },
      },
    },
    {
      name: "nirtamir2/next/middleware",
      files: ["**/src/middleware.ts"],
      rules: {
        // Next.js does not allow to use TaggedTemplateExpression syntax in middleware
        "unicorn/prefer-string-raw": "off",
      },
    },
  ];
}
