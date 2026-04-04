import { pluginComments } from "../plugins";
import type { TypedFlatConfigItem } from "../types";

export async function comments(): Promise<Array<TypedFlatConfigItem>> {
  const recommendedRules = Object.fromEntries(
    Object.entries(pluginComments.configs.recommended.rules).map(
      ([rule, value]) => [
        rule.replace("@eslint-community/eslint-comments/", "eslint-comments/"),
        value,
      ],
    ),
  );

  return [
    {
      name: "antfu/eslint-comments/rules",
      plugins: {
        "eslint-comments": pluginComments,
      },
      rules: {
        ...recommendedRules,
        "eslint-comments/disable-enable-pair": "off",
      },
    },
  ];
}
