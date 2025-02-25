import type { TypedFlatConfigItem } from "../types";
import { ensurePackages, interopDefault } from "../utils";

export async function query(): Promise<Array<TypedFlatConfigItem>> {
  await ensurePackages(["@tanstack/eslint-plugin-query"]);

  const pluginTanstackQuery = await interopDefault(
    import("@tanstack/eslint-plugin-query"),
  );

  return [
    { name: "@nirtamir2/query" },
    ...pluginTanstackQuery.configs["flat/recommended"],
  ];
}
