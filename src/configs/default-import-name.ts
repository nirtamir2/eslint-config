import type { TypedFlatConfigItem } from "../types";
import defaultImportNameConfig from "eslint-plugin-default-import-name/config";

export async function defaultImportName(): Promise<Array<TypedFlatConfigItem>> {
  return [defaultImportNameConfig()];
}
