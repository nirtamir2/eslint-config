import storybookPlugin from "eslint-plugin-storybook"
import type { TypedFlatConfigItem } from "../types";
import { ensurePackages } from "../utils";

export async function storybook(): Promise<Array<TypedFlatConfigItem>> {
  await ensurePackages(["eslint-plugin-storybook"]);

  return [
    ...storybookPlugin.configs['flat/recommended'],
    ...storybookPlugin.configs['flat/csf-strict'],
    ...storybookPlugin.configs['flat/addon-interactions'],
    {
      name:"nirtamir2/storybook/ignore-patterns",
      ignores: ["!.storybook", "storybook-static"],
    },
  ];
}
