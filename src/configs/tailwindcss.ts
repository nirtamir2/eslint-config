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
    // {
    //   name: "tailwindcss/settings",
    //   settings: {
    //     "better-tailwindcss": {
    //       // tailwindcss 4: the path to the entry file of the css based tailwind config (eg: `src/global.css`)
    //       entryPoint: "src/globals.css",
    //     },
    //   },
    // },
    {
      name: "tailwindcss/overrides",
      rules: {
        ...pluginTailwindCSS.configs["stylistic-warn"].rules,
        ...pluginTailwindCSS.configs["correctness-warn"].rules,
        "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      },
    },
  ];
}
