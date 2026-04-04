import { pluginComments } from "../plugins";
import type { TypedFlatConfigItem } from "../types";

export async function comments(): Promise<Array<TypedFlatConfigItem>> {
  return [
    {
      name: "antfu/eslint-comments/rules",
      plugins: {
        "@eslint-community/eslint-comments": pluginComments,
      },
      rules: {
        ...pluginComments.configs.recommended.rules,
        "@eslint-community/eslint-comments/disable-enable-pair": "off",
      },
    },
  ];
}
