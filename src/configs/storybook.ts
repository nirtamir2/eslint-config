import type { TypedFlatConfigItem } from "../types";
import { ensurePackages, interopDefault } from "../utils";

export async function storybook(): Promise<Array<TypedFlatConfigItem>> {
  await ensurePackages(["eslint-plugin-storybook"]);

  const [storybookPlugin] = await Promise.all([
    interopDefault(import("eslint-plugin-storybook")),
  ] as const);

  return [
    {
      name: "nirtamir2/storybook/init",
      plugins: {
        storybook: storybookPlugin,
      },
    },
    ...storybookPlugin.configs["flat/recommended"],
    ...storybookPlugin.configs["flat/csf-strict"],
    ...storybookPlugin.configs["flat/addon-interactions"],
    {
      name: "nirtamir2/storybook/ignore-patterns",
      ignores: ["!.storybook", "storybook-static"],
    },
  ];
}
