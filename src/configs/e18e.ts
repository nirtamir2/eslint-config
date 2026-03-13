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
    isInEditor = false,
  } = options;
  const moduleReplacements =
    options.moduleReplacements ?? (options.type === "lib" && isInEditor);

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
