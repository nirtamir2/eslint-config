import type {
  OptionsFiles,
  OptionsTypeScriptWithTypes,
  TypedFlatConfigItem,
} from "../types";
import { GLOB_JS, GLOB_JSX, GLOB_SRC, GLOB_TS } from "../globs";
import { ensurePackages, interopDefault, toArray } from "../utils";

export async function classnameComponents(
  options: OptionsTypeScriptWithTypes &
    OptionsFiles & {
      name: string;
    },
): Promise<Array<TypedFlatConfigItem>> {
  const { files = [GLOB_SRC], name } = options;
  const tsconfigPath = options.tsconfigPath
    ? toArray(options.tsconfigPath)
    : undefined;
  if (!tsconfigPath) return [];

  await ensurePackages(["eslint-plugin-classname-components"]);
  const [classnameComponentsConfig, parserTs] = await Promise.all([
    interopDefault(import("eslint-plugin-classname-components/config")),
    interopDefault(import("@typescript-eslint/parser")),
  ] as const);
  const config = classnameComponentsConfig({ strict: true });

  return [
    {
      ...config,
      files,
      ignores: [GLOB_JS, GLOB_JSX, GLOB_TS],
      languageOptions: {
        parser: parserTs,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          project: tsconfigPath,
        },
      },
      name,
    },
  ];
}
