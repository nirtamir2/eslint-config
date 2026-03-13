import type { TypedFlatConfigItem } from "../types";
import { GLOB_EXCLUDE } from "../globs";

export async function ignores(
  userIgnores: Array<string> | ((originals: Array<string>) => Array<string>) = [],
): Promise<Array<TypedFlatConfigItem>> {
  let ignoreList = [...GLOB_EXCLUDE];

  ignoreList = typeof userIgnores === "function" ? userIgnores(ignoreList) : [...ignoreList, ...userIgnores];

  return [
    {
      ignores: ignoreList,
      name: "antfu/ignores",
    },
  ];
}
