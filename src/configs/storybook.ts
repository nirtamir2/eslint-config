import type { TypedFlatConfigItem } from "../types";
import { ensurePackages, interopDefault } from "../utils";

export async function storybook(): Promise<Array<TypedFlatConfigItem>> {
  await ensurePackages(["eslint-plugin-storybook"]);

  const storybookPlugin = await interopDefault(
    import("eslint-plugin-storybook"),
  );

  return [
    {
      name: "nirtamir2/storybook/init",
      plugins: {
        storybook: storybookPlugin,
      },
    },
    {
      name: "nirtamir2/storybook/ignore-patterns",
      ignores: ["!.storybook", "storybook-static"],
    },
    ...storybookPlugin.configs["flat/recommended"],
    ...storybookPlugin.configs["flat/csf-strict"],
    ...storybookPlugin.configs["flat/addon-interactions"],
  ];
}
