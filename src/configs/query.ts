import pluginQuery from "@tanstack/eslint-plugin-query";
import type { TypedFlatConfigItem } from "../types";

export async function query(): Promise<Array<TypedFlatConfigItem>> {
  return pluginQuery.configs["flat/recommended"];
}
