import { GLOB_JS, GLOB_JSX, GLOB_TS, GLOB_TSX } from "../globs";
import type { TypedFlatConfigItem } from "../types";
import { ensurePackages, interopDefault } from "../utils";

export async function zod(): Promise<Array<TypedFlatConfigItem>> {
  await ensurePackages(["eslint-plugin-import-zod"]);

  const importZod = await interopDefault(import("eslint-plugin-import-zod"));

  return [
    {
      name: "nirtamir2/zod/setup",
      files: [GLOB_JS, GLOB_TS, GLOB_JSX, GLOB_TSX],
      plugins: {
        "import-zod": importZod,
      },
      rules: {
        "import-zod/prefer-zod-namespace": "error",
      },
    },
  ];
}
