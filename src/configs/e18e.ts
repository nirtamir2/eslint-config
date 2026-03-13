import type { Linter } from "eslint";
import { pluginE18e } from "../plugins";
import type {
  OptionsE18e,
  OptionsIsInEditor,
  OptionsProjectType,
  TypedFlatConfigItem,
} from "../types";

export async function e18e(
  options: OptionsE18e & OptionsProjectType & OptionsIsInEditor = {},
): Promise<Array<TypedFlatConfigItem>> {
  const {
    isInEditor = false,
    modernization = true,
    moduleReplacements = options.type === "lib" && isInEditor,
    overrides = {},
    performanceImprovements = true,
  } = options;

  const configs = pluginE18e.configs as Record<string, Linter.Config>;

  return [
    {
      name: "antfu/e18e/rules",
      plugins: {
        e18e: pluginE18e,
      },
      rules: {
        ...(modernization ? { ...configs.modernization.rules } : {}),
        ...(moduleReplacements ? { ...configs.moduleReplacements?.rules } : {}),
        ...(performanceImprovements
          ? { ...configs.performanceImprovements?.rules }
          : {}),
        ...overrides,
      },
    },
  ];
}
