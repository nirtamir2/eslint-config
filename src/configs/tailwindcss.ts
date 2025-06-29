import type { TypedFlatConfigItem } from "../types";
import { ensurePackages, interopDefault } from "../utils";

export async function tailwindcss(): Promise<Array<TypedFlatConfigItem>> {
  await ensurePackages(["eslint-plugin-better-tailwindcss"]);

  const [pluginTailwindCSS] = await Promise.all([
    interopDefault(import("eslint-plugin-better-tailwindcss")),
  ] as const);

  return [
    {
      name: "tailwindcss/setup",
      plugins: {
        "better-tailwindcss": pluginTailwindCSS,
      },
    },
    pluginTailwindCSS.configs["stylistic-warn"],
    pluginTailwindCSS.configs["correctness-warn"],
    {
      name: "tailwindcss/overrides",
      rules: {
        "better-tailwindcss/enforce-consistent-line-wrapping": "off"
      }
    }
  ];
}
