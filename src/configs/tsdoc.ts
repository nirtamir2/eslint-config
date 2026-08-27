import type {
  OptionsComponentExts as OptionsComponentExtensions,
  OptionsFiles,
  OptionsOverrides,
  TypedFlatConfigItem,
} from "../types";
import { compat } from "../compat";

export async function tsdoc(
  options: OptionsFiles & OptionsComponentExtensions & OptionsOverrides = {},
): Promise<Array<TypedFlatConfigItem>> {
  return [
    ...compat.config({
      plugins: ["tsdoc"],
      rules: {
        "tsdoc/syntax": "warn",
        ...options.overrides,
      },
    }),
  ];
}
