import defaultImportNameConfig from "eslint-plugin-default-import-name/config";
import type { TypedFlatConfigItem } from "../types";

export async function defaultImportName(): Promise<Array<TypedFlatConfigItem>> {
  return [defaultImportNameConfig()];
}
