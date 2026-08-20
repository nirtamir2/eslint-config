import type { Linter } from "eslint";
import type {
  OptionsE18e,
  OptionsIsInEditor,
  OptionsProjectType,
  TypedFlatConfigItem,
} from "../types";
import { pluginE18e } from "../plugins";

export async function e18e(
  options: OptionsE18e & OptionsProjectType & OptionsIsInEditor = {},
): Promise<Array<TypedFlatConfigItem>> {
  const {
    modernization = true,
    performanceImprovements = true,
    overrides = {},
    type = "app",
    isInEditor = false,
  } = options;
  const isModuleReplacements =
    options.moduleReplacements ?? (type === "lib" && isInEditor);

  // SAFETY: @e18e/eslint-plugin exports its preset map untyped; the values are
  // ordinary flat configs.
  const configs = pluginE18e.configs as Record<string, Linter.Config>;

  return [
    {
      name: "antfu/e18e/rules",
      plugins: {
        e18e: pluginE18e,
      },
      rules: {
        ...(modernization && { ...configs.modernization.rules }),
        ...(isModuleReplacements && { ...configs.moduleReplacements?.rules }),
        ...(performanceImprovements && { ...configs.performanceImprovements?.rules }),
        ...(type !== "lib" && { "e18e/prefer-static-regex": "off" }),
        "e18e/prefer-array-at": "off",
        "e18e/prefer-array-from-map": "off",
        "e18e/prefer-array-to-reversed": "off",
        "e18e/prefer-array-to-sorted": "off",
        "e18e/prefer-array-to-spliced": "off",
        "e18e/prefer-spread-syntax": "off",
        ...overrides,
      },
    },
  ];
}
