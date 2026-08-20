import type { Linter } from "eslint";
import { FlatConfigComposer } from "eslint-flat-config-utils";
import { isPackageExists } from "local-pkg";
import {
  angular,
  antiSlop,
  astro,
  command,
  comments,
  disables,
  e18e,
  ignores,
  imports,
  javascript,
  jsdoc,
  jsonc,
  jsx,
  markdown,
  nextjs,
  node,
  perfectionist,
  pnpm,
  react,
  solid,
  sortPackageJson,
  sortTsconfig,
  stylistic,
  svelte,
  test,
  toml,
  tsdoc,
  typescript,
  unicorn,
  unocss,
  vue,
  yaml,
  zod,
} from "./configs";
import { defaultImportName } from "./configs/default-import-name";
import { formatters } from "./configs/formatters";
import { i18n } from "./configs/i18n";
import { prettier } from "./configs/prettier";
import { query } from "./configs/query";
import { regexp } from "./configs/regexp";
import { security } from "./configs/security";
import { storybook } from "./configs/storybook";
import { tailwindcss } from "./configs/tailwindcss";
import type {
  Awaitable,
  ConfigNames,
  OptionsConfig,
  TypedFlatConfigItem,
} from "./types";
import { resolveSharedFeaturePlan } from "./feature-plan";
import { findUpSync, interopDefault, isInEditorEnv as isInEditorEnvironment } from "./utils";

const flatConfigProperties: Array<keyof TypedFlatConfigItem> = [
  "name",
  "files",
  "ignores",
  "languageOptions",
  "linterOptions",
  "processor",
  "plugins",
  "rules",
  "settings",
];

const TanstackQueryPackages = [
  "@tanstack/react-query",
  "@tanstack/solid-query",
];

const StorybookPackages = [
  "@storybook/addon-a11y",
  "@storybook/addon-essentials",
  "@storybook/addon-interactions",
  "@storybook/addon-links",
  "@storybook/addon-storysource",
  "@storybook/blocks",
  "@storybook/nextjs",
  "@storybook/react",
  "@storybook/test",
];

/**
 * Construct an array of ESLint flat config items.
 * @param {OptionsConfig & TypedFlatConfigItem} options
 *  The options for generating the ESLint configurations.
 * @param {Awaitable<TypedFlatConfigItem | TypedFlatConfigItem[]>[]} userConfigs
 *  The user configurations to be merged with the generated configurations.
 * @returns {Promise<TypedFlatConfigItem[]>}
 *  The merged ESLint configurations.
 */
export function nirtamir2(
  options: OptionsConfig & TypedFlatConfigItem = {},
  ...userConfigs: Array<
    Awaitable<
      | TypedFlatConfigItem
      | Array<TypedFlatConfigItem>
      | FlatConfigComposer<any, any>
      | Array<Linter.Config>
    >
  >
): FlatConfigComposer<TypedFlatConfigItem, ConfigNames> {
  const sharedPlan = resolveSharedFeaturePlan(options, {
    hasPackage: isPackageExists,
    isInEditor: options.isInEditor ?? isInEditorEnvironment(),
  });

  const {
    antiSlop: enableAntiSlop = false,
    angular: enableAngular = false,
    astro: enableAstro = false,
    // autoRenamePlugins = true,
    componentExts: componentExtensions = [],
    e18e: enableE18e = true,
    gitignore: enableGitignore = true,
    ignores: userIgnores = [],
    pnpm: enablePnpm = Boolean(findUpSync("pnpm-workspace.yaml")),
    perfectionist: enablePerfectionist = false,
    regexp: enableRegexp = true,
    solid: enableSolid = false,
    svelte: enableSvelte = false,
    zod: enableZod = isPackageExists("zod") && isPackageExists("next"),
    tailwindcss: enableTailwindCSS = isPackageExists("tailwindcss"),
    unocss: enableUnoCSS = false,
    storybook: enableStorybook = StorybookPackages.some((index) =>
      isPackageExists(index),
    ),
    query: enableQuery = TanstackQueryPackages.some((index) => isPackageExists(index)),
    i18n: enableI18n = false,
    security: enableSecurity = false,
  } = options;
  const {
    jsdoc: enableJsdoc,
    jsx: enableJsx,
    nextjs: enableNextjs,
    react: enableReact,
    test: enableTest,
    typescript: enableTypeScript,
    vue: enableVue,
  } = sharedPlan.enabled;
  const { isInEditor, type: appType } = sharedPlan;

  const stylisticOptions =
    options.stylistic === false || options.stylistic == null
      ? false
      : typeof options.stylistic === "object"
        ? options.stylistic
        : {};

  if (stylisticOptions && !("jsx" in stylisticOptions))
    stylisticOptions.jsx = enableJsx;

  const configs: Array<Awaitable<Array<TypedFlatConfigItem>>> = [];

  if (enableGitignore) {
    if (typeof enableGitignore === "boolean") {
      configs.push(
        interopDefault(import("eslint-config-flat-gitignore")).then((r) => [
          r({
            name: "antfu/gitignore",
            strict: false,
          }),
        ]),
      );
    } else {
      configs.push(
        interopDefault(import("eslint-config-flat-gitignore")).then((r) => [
          r({
            name: "antfu/gitignore",
            ...enableGitignore,
          }),
        ]),
      );
    }
  }

  const typescriptOptions = resolveSubOptions(options, "typescript");
  const tsconfigPath =
    "tsconfigPath" in typescriptOptions
      ? typescriptOptions.tsconfigPath
      : undefined;

  // Base configs
  configs.push(
    ignores(userIgnores),
    javascript({
      isInEditor,
      overrides: getOverrides(options, "javascript"),
    }),
    comments(),
    node(),
    imports({
      stylistic: stylisticOptions,
    }),
    unicorn(),
    command(),
  );

  if (enablePerfectionist) {
    configs.push(
      perfectionist({
        overrides: getOverrides(options, "perfectionist"),
      }),
    );
  }

  if (enableVue) {
    componentExtensions.push("vue");
  }

  if (enableJsx) {
    configs.push(jsx());
  }

  if (enableTypeScript) {
    configs.push(
      typescript({
        ...typescriptOptions,
        componentExts: componentExtensions,
        overrides: getOverrides(options, "typescript"),
        type: appType,
      }),
    );
  }

  if (enableE18e) {
    configs.push(
      e18e({
        ...(typeof enableE18e !== "boolean" && enableE18e),
        isInEditor,
        type: appType,
      }),
    );
  }

  if (stylisticOptions) {
    configs.push(
      stylistic({
        ...stylisticOptions,
        lessOpinionated: options.lessOpinionated,
        overrides: getOverrides(options, "stylistic"),
      }),
    );
  }

  if (enableAntiSlop) {
    configs.push(
      antiSlop({
        ...resolveSubOptions(options, "antiSlop"),
        overrides: getOverrides(options, "antiSlop"),
      }),
    );
  }

  if (enableRegexp) {
    configs.push(regexp(typeof enableRegexp === "boolean" ? {} : enableRegexp));
  }

  if (enableTest) {
    configs.push(
      test({
        isInEditor,
        overrides: getOverrides(options, "test"),
      }),
    );
  }

  if (enableVue) {
    configs.push(
      vue({
        ...resolveSubOptions(options, "vue"),
        overrides: getOverrides(options, "vue"),
        stylistic: stylisticOptions,
        typescript: enableTypeScript,
      }),
    );
  }

  if (enableReact) {
    configs.push(
      react({
        overrides: getOverrides(options, "react"),
        tsconfigPath,
      }),
    );
  }

  if (enableNextjs) {
    configs.push(
      nextjs({
        overrides: getOverrides(options, "nextjs"),
      }),
    );
  }

  if (enableZod) {
    configs.push(zod());
  }

  if (enableSolid) {
    configs.push(
      solid({
        overrides: getOverrides(options, "solid"),
        tsconfigPath,
        typescript: enableTypeScript,
      }),
    );
  }

  if (enableSvelte) {
    configs.push(
      svelte({
        overrides: getOverrides(options, "svelte"),
        stylistic: stylisticOptions,
        typescript: enableTypeScript,
      }),
    );
  }

  if (enableUnoCSS) {
    configs.push(
      unocss({
        ...resolveSubOptions(options, "unocss"),
        overrides: getOverrides(options, "unocss"),
      }),
    );
  }

  if (enableI18n) {
    configs.push(i18n());
  }

  if (enableSecurity) {
    configs.push(security());
  }

  if (enableTailwindCSS) {
    configs.push(tailwindcss(options.tailwindcss));

    if (enableQuery) {
      configs.push(query());
    }
  }

  if (enableAstro) {
    configs.push(
      astro({
        overrides: getOverrides(options, "astro"),
        stylistic: stylisticOptions,
      }),
    );
  }

  if (enableAngular) {
    configs.push(
      angular({
        overrides: getOverrides(options, "angular"),
      }),
    );
  }

  if (enableStorybook) {
    configs.push(storybook());
  }

  if (options.jsonc ?? true) {
    configs.push(
      jsonc({
        overrides: getOverrides(options, "jsonc"),
        stylistic: stylisticOptions,
      }),
      sortPackageJson(),
      sortTsconfig(),
    );
  }

  if (enablePnpm) {
    configs.push(
      pnpm({
        isInEditor,
        json: options.jsonc !== false,
        yaml: options.yaml !== false,
        ...(typeof enablePnpm !== "boolean" && enablePnpm),
      }),
    );
  }

  configs.push(defaultImportName());

  if (enableJsdoc) {
    configs.push(
      jsdoc({
        stylistic: stylisticOptions,
        overrides: getOverrides(options, "jsdoc"),
      }),
    );
  }

  if (options.tsdoc ?? false) {
    configs.push(
      tsdoc({
        overrides: getOverrides(options, "tsdoc"),
      }),
    );
  }

  if (options.yaml ?? true) {
    configs.push(
      yaml({
        overrides: getOverrides(options, "yaml"),
        stylistic: stylisticOptions,
      }),
    );
  }

  if (options.toml ?? true) {
    configs.push(
      toml({
        overrides: getOverrides(options, "toml"),
        stylistic: stylisticOptions,
      }),
    );
  }

  if (options.markdown ?? true) {
    configs.push(
      markdown({
        componentExts: componentExtensions,
        overrides: getOverrides(options, "markdown"),
      }),
    );
  }

  if (options.formatters) {
    configs.push(
      formatters(
        options.formatters,
        typeof stylisticOptions === "boolean" ? {} : stylisticOptions,
      ),
    );
  }

  configs.push(prettier());

  // eslint-disable-next-line unicorn/prefer-single-call
  configs.push(disables());

  if ("files" in options) {
    throw new Error(
      '[@antfu/eslint-config] The first argument should not contain the "files" property as the options are supposed to be global. Place it in the second or later config instead.',
    );
  }

  // User can optionally pass a flat config item to the first argument
  // We pick the known keys as ESLint would do schema validation
  const fusedConfig = flatConfigProperties.reduce<TypedFlatConfigItem>(
    (accumulator, key) => {
      if (key in options)
        // SAFETY: `key` is a flat-config property name, so options[key] already has
        // the type the accumulator expects; `never` sidesteps the per-key correlation
        // TypeScript cannot express here.
        accumulator[key] = options[key] as never;
      return accumulator;
    },
    {},
  );
  if (Object.keys(fusedConfig).length > 0) configs.push([fusedConfig]);

  let composer = new FlatConfigComposer<TypedFlatConfigItem, ConfigNames>();

  // SAFETY: userConfigs is the caller's own flat-config input, which the composer
  // validates; its declared union is wider than the composer's parameter type.
  composer = composer.append(...configs, ...(userConfigs as any));

  // if (autoRenamePlugins) {
  //   composer = composer
  //     .renamePlugins(defaultPluginRenaming)
  // }

  if (isInEditor) {
    composer = composer.disableRulesFix(
      [
        "unused-imports/no-unused-imports",
        "test/no-only-tests",
        "prefer-const",
      ],
      {
        builtinRules: () =>
          import(["eslint", "use-at-your-own-risk"].join("/")).then(
            (r) => r.builtinRules,
          ),
      },
    );
  }

  return composer;
}

export type ResolvedOptions<T> = T extends boolean ? never : NonNullable<T>;

export function resolveSubOptions<K extends keyof OptionsConfig>(
  options: OptionsConfig,
  key: K,
): ResolvedOptions<OptionsConfig[K]> {
  // SAFETY: a boolean or absent sub-option means "use the defaults", which is the
  // empty object; the per-key return type cannot be correlated with K here.
  return typeof options[key] === "boolean"
    ? ({} as any)
    : options[key] || ({} as any);
}
export function getOverrides<K extends keyof OptionsConfig>(
  options: OptionsConfig,
  key: K,
) {
  const sub = resolveSubOptions(options, key);
  return {
    // SAFETY: `overrides` is keyed by config name; the value type varies per key.
    ...(options.overrides as any)?.[key],
    ...(("overrides" in sub) && sub.overrides),
  };
}
