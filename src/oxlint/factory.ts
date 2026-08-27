import gitignore from "eslint-config-flat-gitignore";
import { isPackageExists } from "local-pkg";
import type { OxlintConfig } from "oxlint";
import { isInEditorEnv as isInEditorEnvironment } from "../editor-environment";
import type { FeatureEnvironment } from "../feature-plan";
import { resolveSharedFeaturePlan } from "../feature-plan";
import type { GeneratedFragment } from "../generated/oxlint";
import { generatedOxlintFragments } from "../generated/oxlint";
import { composeOxlintConfigs } from "./compose";
import { resolveGeneratedJsPlugins } from "./js-plugins";
import {
  applyStandardTypeScriptExcludes,
  applyTypeAwareScope,
  defaultTypeAwareExcludes,
  defaultTypeAwareFiles,
} from "./type-aware-scope";
import type {
  OxlintE18eOptions,
  OxlintGitignoreOptions,
  OxlintOptions,
  OxlintOverridesOptions,
  OxlintRegExpOptions,
  OxlintRules,
  OxlintStylisticOptions,
  OxlintTailwindOptions,
  OxlintTypeScriptOptions,
  OxlintUnicornOptions,
  OxlintUnoCSSOptions,
  OxlintVueOptions,
} from "./types";

const optionKeys = new Set<keyof OxlintOptions>([
  "angular",
  "e18e",
  "gitignore",
  "ignores",
  "i18n",
  "isInEditor",
  "javascript",
  "jsdoc",
  "jsx",
  "lessOpinionated",
  "nextjs",
  "perfectionist",
  "query",
  "react",
  "regexp",
  "rules",
  "security",
  "solid",
  "storybook",
  "stylistic",
  "tailwindcss",
  "test",
  "type",
  "typescript",
  "tsdoc",
  "unocss",
  "unicorn",
  "vue",
  "zod",
]);

const overrideOptionKeys = new Set(["overrides"]);
const e18eOptionKeys = new Set([
  "modernization",
  "moduleReplacements",
  "overrides",
  "performanceImprovements",
]);
const typeScriptOptionKeys = new Set([
  "erasableOnly",
  "filesTypeAware",
  "ignoresTypeAware",
  "overrides",
  "overridesTypeAware",
  "typeAware",
]);
const unicornOptionKeys = new Set(["allRecommended", "overrides"]);
const regexpOptionKeys = new Set(["level", "overrides"]);
const tailwindOptionKeys = new Set(["entryPoint", "overrides"]);
const unocssOptionKeys = new Set(["attributify", "overrides", "strict"]);
const stylisticOptionKeys = new Set([
  "braceStyle",
  "experimental",
  "indent",
  "jsx",
  "overrides",
  "quotes",
  "semi",
]);
const vueOptionKeys = new Set(["overrides", "vueVersion"]);
const gitignoreOptionKeys = new Set([
  "cwd",
  "files",
  "filesGitModules",
  "name",
  "recursive",
  "root",
  "strict",
]);
const declarationFileGlobs = ["**/*.d.{ts,mts,cts}"];

const tanstackQueryPackages = [
  "@tanstack/react-query",
  "@tanstack/solid-query",
] as const;
const storybookPackages = [
  "@storybook/addon-a11y",
  "@storybook/addon-essentials",
  "@storybook/addon-interactions",
  "@storybook/addon-links",
  "@storybook/addon-storysource",
  "@storybook/blocks",
  "@storybook/nextjs",
  "@storybook/react",
  "@storybook/test",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    !Object.is(value, null) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function assertRules(
  value: unknown,
  path: string,
): asserts value is OxlintRules | undefined {
  if (value !== undefined && !isRecord(value))
    throw new TypeError(`Oxlint option "${path}" must be a rules object`);
}

function assertBoolean(value: unknown, path: string): void {
  if (value !== undefined && typeof value !== "boolean")
    throw new TypeError(`Oxlint option "${path}" must be a boolean`);
}

function assertFeatureOption(
  name: string,
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): void {
  if (value === undefined || typeof value === "boolean") return;
  assertOptionObject(name, value, allowedKeys);

  assertRules(value.overrides, `${name}.overrides`);
}

function assertOptionObject(
  name: string,
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): asserts value is Record<string, unknown> {
  if (!isRecord(value))
    throw new TypeError(`Oxlint option "${name}" must be a boolean or object`);

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key))
      throw new Error(`Unsupported Oxlint option "${name}.${key}"`);
  }
}

function assertStringOrStringArray(value: unknown, path: string): void {
  if (
    value !== undefined &&
    typeof value !== "string" &&
    (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))
  )
    throw new TypeError(
      `Oxlint option "${path}" must be a string or array of strings`,
    );
}

function assertGitignoreOption(value: unknown): void {
  if (value === undefined || typeof value === "boolean") return;
  assertOptionObject("gitignore", value, gitignoreOptionKeys);
  assertStringOrStringArray(value.files, "gitignore.files");
  assertStringOrStringArray(value.filesGitModules, "gitignore.filesGitModules");

  if (value.cwd !== undefined && typeof value.cwd !== "string")
    throw new TypeError('Oxlint option "gitignore.cwd" must be a string');
  if (value.name !== undefined && typeof value.name !== "string")
    throw new TypeError('Oxlint option "gitignore.name" must be a string');
  assertBoolean(value.root, "gitignore.root");
  assertBoolean(value.strict, "gitignore.strict");

  if (value.recursive === undefined || typeof value.recursive === "boolean")
    return;
  assertOptionObject(
    "gitignore.recursive",
    value.recursive,
    new Set(["skipDirs"]),
  );
  if (
    !Array.isArray(value.recursive.skipDirs) ||
    value.recursive.skipDirs.some((entry) => typeof entry !== "string")
  )
    throw new TypeError(
      'Oxlint option "gitignore.recursive.skipDirs" must be an array of strings',
    );
}

function validateOptions(options: unknown): asserts options is OxlintOptions {
  if (!isRecord(options))
    throw new TypeError("Oxlint options must be an object");

  for (const key of Object.keys(options)) {
    if (!optionKeys.has(key as keyof OxlintOptions))
      throw new Error(`Unsupported Oxlint option "${key}"`);
  }

  if (
    options.ignores !== undefined &&
    typeof options.ignores !== "function" &&
    (!Array.isArray(options.ignores) ||
      options.ignores.some((pattern) => typeof pattern !== "string"))
  )
    throw new TypeError(
      'Oxlint option "ignores" must be an array of strings or transformer function',
    );
  if (
    options.type !== undefined &&
    options.type !== "app" &&
    options.type !== "lib"
  )
    throw new TypeError('Oxlint option "type" must be "app" or "lib"');

  assertRules(options.rules, "rules");
  assertFeatureOption("angular", options.angular, overrideOptionKeys);
  assertGitignoreOption(options.gitignore);
  assertBoolean(options.isInEditor, "isInEditor");
  assertBoolean(options.i18n, "i18n");
  if (options.javascript !== undefined) {
    assertOptionObject("javascript", options.javascript, overrideOptionKeys);
    assertRules(options.javascript.overrides, "javascript.overrides");
  }
  assertBoolean(options.jsx, "jsx");
  assertBoolean(options.lessOpinionated, "lessOpinionated");
  assertFeatureOption("jsdoc", options.jsdoc, overrideOptionKeys);
  assertFeatureOption("nextjs", options.nextjs, overrideOptionKeys);
  assertFeatureOption(
    "perfectionist",
    options.perfectionist,
    overrideOptionKeys,
  );
  assertFeatureOption("query", options.query, overrideOptionKeys);
  assertFeatureOption("react", options.react, overrideOptionKeys);
  assertFeatureOption("e18e", options.e18e, e18eOptionKeys);
  assertFeatureOption("regexp", options.regexp, regexpOptionKeys);
  assertFeatureOption("security", options.security, overrideOptionKeys);
  assertFeatureOption("solid", options.solid, overrideOptionKeys);
  assertBoolean(options.storybook, "storybook");
  assertFeatureOption("stylistic", options.stylistic, stylisticOptionKeys);
  assertFeatureOption("tailwindcss", options.tailwindcss, tailwindOptionKeys);
  assertFeatureOption("test", options.test, overrideOptionKeys);
  assertFeatureOption("typescript", options.typescript, typeScriptOptionKeys);
  assertFeatureOption("unicorn", options.unicorn, unicornOptionKeys);
  assertFeatureOption("tsdoc", options.tsdoc, overrideOptionKeys);
  assertFeatureOption("unocss", options.unocss, unocssOptionKeys);
  assertFeatureOption("vue", options.vue, vueOptionKeys);
  assertFeatureOption("zod", options.zod, overrideOptionKeys);

  if (isRecord(options.typescript)) {
    assertBoolean(options.typescript.erasableOnly, "typescript.erasableOnly");
    assertBoolean(options.typescript.typeAware, "typescript.typeAware");
    for (const [key, value] of [
      ["filesTypeAware", options.typescript.filesTypeAware],
      ["ignoresTypeAware", options.typescript.ignoresTypeAware],
    ] as const) {
      if (
        value !== undefined &&
        (!Array.isArray(value) ||
          value.some((pattern) => typeof pattern !== "string"))
      )
        throw new TypeError(
          `Oxlint option "typescript.${key}" must be an array of strings`,
        );
    }
    assertRules(
      options.typescript.overridesTypeAware,
      "typescript.overridesTypeAware",
    );
    if (
      options.typescript.typeAware !== true &&
      (options.typescript.filesTypeAware !== undefined ||
        options.typescript.overridesTypeAware !== undefined)
    )
      throw new TypeError(
        "Oxlint TypeScript type-aware scope options require typeAware: true",
      );
  }
  if (isRecord(options.stylistic)) {
    if (
      options.stylistic.braceStyle !== undefined &&
      options.stylistic.braceStyle !== "1tbs" &&
      options.stylistic.braceStyle !== "allman" &&
      options.stylistic.braceStyle !== "stroustrup"
    )
      throw new TypeError(
        'Oxlint option "stylistic.braceStyle" must be "1tbs", "allman", or "stroustrup"',
      );
    assertBoolean(options.stylistic.experimental, "stylistic.experimental");
    if (
      options.stylistic.indent !== undefined &&
      options.stylistic.indent !== "tab" &&
      (typeof options.stylistic.indent !== "number" ||
        !Number.isSafeInteger(options.stylistic.indent) ||
        options.stylistic.indent < 0)
    )
      throw new TypeError(
        'Oxlint option "stylistic.indent" must be a non-negative integer or "tab"',
      );
    assertBoolean(options.stylistic.jsx, "stylistic.jsx");
    if (
      options.stylistic.quotes !== undefined &&
      options.stylistic.quotes !== "backtick" &&
      options.stylistic.quotes !== "double" &&
      options.stylistic.quotes !== "single"
    )
      throw new TypeError(
        'Oxlint option "stylistic.quotes" must be "backtick", "double", or "single"',
      );
    assertBoolean(options.stylistic.semi, "stylistic.semi");
  }
  if (isRecord(options.e18e)) {
    assertBoolean(options.e18e.modernization, "e18e.modernization");
    assertBoolean(options.e18e.moduleReplacements, "e18e.moduleReplacements");
    assertBoolean(
      options.e18e.performanceImprovements,
      "e18e.performanceImprovements",
    );
  }
  if (
    isRecord(options.vue) &&
    options.vue.vueVersion !== undefined &&
    options.vue.vueVersion !== 2 &&
    options.vue.vueVersion !== 3
  )
    throw new TypeError('Oxlint option "vue.vueVersion" must be 2 or 3');
  if (isRecord(options.unicorn))
    assertBoolean(options.unicorn.allRecommended, "unicorn.allRecommended");
  if (
    isRecord(options.regexp) &&
    options.regexp.level !== undefined &&
    options.regexp.level !== "error" &&
    options.regexp.level !== "warn"
  )
    throw new TypeError(
      'Oxlint option "regexp.level" must be "error" or "warn"',
    );
  if (
    isRecord(options.tailwindcss) &&
    options.tailwindcss.entryPoint !== undefined &&
    typeof options.tailwindcss.entryPoint !== "string"
  )
    throw new TypeError(
      'Oxlint option "tailwindcss.entryPoint" must be a string',
    );
  if (isRecord(options.unocss)) {
    assertBoolean(options.unocss.attributify, "unocss.attributify");
    assertBoolean(options.unocss.strict, "unocss.strict");
  }
}

function subOptions<T>(value: boolean | T | undefined): T {
  return isRecord(value) ? value : ({} as T);
}

function isEnabled(value: unknown, fallback: boolean): boolean {
  return value == null ? fallback : value !== false;
}

function replaceGeneratedValue<T>(
  value: T,
  expected: unknown,
  replacement: unknown,
): T {
  if (Object.is(value, expected)) return replacement as T;
  if (Array.isArray(value))
    return value.map((item) =>
      replaceGeneratedValue(item, expected, replacement),
    ) as T;
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      replaceGeneratedValue(item, expected, replacement),
    ]),
  ) as T;
}

function omitStylisticJsxRuleEntries(
  rules: OxlintRules | undefined,
): OxlintRules | undefined {
  return rules == null
    ? undefined
    : Object.fromEntries(
        Object.entries(rules).filter(
          ([rule]) =>
            !rule.startsWith("@stylistic/jsx-") &&
            !rule.startsWith("@stylistic/exp-jsx-"),
        ),
      );
}

function omitStylisticJsxRules(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    ...(config.rules != null && {
      rules: omitStylisticJsxRuleEntries(config.rules),
    }),
    ...(config.overrides != null && {
      overrides: config.overrides.map((override) => ({
        ...override,
        ...(override.rules != null && {
          rules: omitStylisticJsxRuleEntries(override.rules),
        }),
      })),
    }),
  };
}

function addStylisticCustomization(
  configs: Array<OxlintConfig>,
  config: OxlintConfig,
  options: { jsx: boolean; numericIndent?: number },
): void {
  const { jsx, numericIndent } = options;
  let prepared = resolveGeneratedJsPlugins(config);
  if (numericIndent !== undefined)
    prepared = replaceGeneratedValue(prepared, 17, numericIndent);
  configs.push(jsx ? prepared : omitStylisticJsxRules(prepared));
}

function addFragment(
  configs: Array<OxlintConfig>,
  fragment: GeneratedFragment,
  overrides?: OxlintRules,
): void {
  configs.push(resolveGeneratedJsPlugins(fragment.config));
  if (!overrides || Object.keys(overrides).length === 0) return;
  if (!fragment.overrideTarget)
    throw new Error("Generated Oxlint fragment is missing its override target");

  configs.push({
    overrides: [
      {
        ...fragment.overrideTarget,
        ...(fragment.overrideTarget.excludeFiles && {
          excludeFiles: [...fragment.overrideTarget.excludeFiles],
        }),
        files: [...fragment.overrideTarget.files],
        rules: { ...overrides },
      },
    ],
  });
}

function withInlineOverrides(
  fragment: GeneratedFragment,
  markerRule: string,
  overrides: OxlintRules | undefined,
): GeneratedFragment {
  if (!overrides || Object.keys(overrides).length === 0) return fragment;

  let matches = 0;
  const config = {
    ...fragment.config,
    overrides: fragment.config.overrides?.map((override) => {
      if (!Object.hasOwn(override.rules ?? {}, markerRule)) return override;
      matches += 1;
      return {
        ...override,
        rules: { ...override.rules, ...overrides },
      };
    }),
  };
  if (matches !== 1)
    throw new Error(
      `Generated Oxlint override marker "${markerRule}" matched ${matches} scopes`,
    );

  return { ...fragment, config };
}

function addRootConfig(
  configs: Array<OxlintConfig>,
  config: OxlintConfig,
  overrides?: OxlintRules,
): void {
  configs.push(resolveGeneratedJsPlugins(config));
  if (overrides && Object.keys(overrides).length > 0)
    configs.push({ rules: { ...overrides } });
}

function configuredJsPluginNames(
  configs: ReadonlyArray<OxlintConfig>,
): Set<string> {
  const entries = configs.flatMap((config) => [
    ...(config.jsPlugins ?? []),
    ...(config.overrides?.flatMap((override) => override.jsPlugins ?? []) ??
      []),
  ]);
  return new Set(
    entries.map((entry) => (typeof entry === "string" ? entry : entry.name)),
  );
}

function configuredRuleNames(
  configs: ReadonlyArray<OxlintConfig>,
): Array<string> {
  return configs.flatMap((config) => [
    ...Object.keys(config.rules ?? {}),
    ...(config.overrides?.flatMap((override) =>
      Object.keys(override.rules ?? {}),
    ) ?? []),
  ]);
}

function addDeclarationFileJsPluginSafety(configs: Array<OxlintConfig>): void {
  const pluginNames = configuredJsPluginNames(configs);
  const rules = Object.fromEntries(
    [...new Set(configuredRuleNames(configs))]
      .filter((rule) =>
        [...pluginNames].some((name) => rule.startsWith(`${name}/`)),
      )
      .toSorted((left, right) => left.localeCompare(right))
      .map((rule) => [rule, "off"] as const),
  );
  if (Object.keys(rules).length === 0) return;

  configs.push({
    overrides: [
      {
        files: [...declarationFileGlobs],
        rules,
      },
    ],
  });
}

function assertUserConfigs(userConfigs: ReadonlyArray<OxlintConfig>): void {
  for (const [index, config] of userConfigs.entries()) {
    if (!isRecord(config))
      throw new TypeError(
        `Oxlint config at trailing position ${index + 1} must be an object`,
      );
  }
}

export function createOxlintConfig(
  options: OxlintOptions,
  userConfigs: ReadonlyArray<OxlintConfig>,
  environment: FeatureEnvironment,
): OxlintConfig {
  validateOptions(options);
  assertUserConfigs(userConfigs);

  const plan = resolveSharedFeaturePlan(options, environment);
  const e18eOptions = subOptions<OxlintE18eOptions>(options.e18e);
  const typeScriptOptions = subOptions<OxlintTypeScriptOptions>(
    options.typescript,
  );
  const stylisticOptions = subOptions<OxlintStylisticOptions>(
    options.stylistic,
  );
  const unicornOptions = subOptions<OxlintUnicornOptions>(options.unicorn);
  const vueOptions = subOptions<OxlintVueOptions>(options.vue);
  const isTypeAware =
    plan.enabled.typescript && Object.is(typeScriptOptions.typeAware, true);
  const isErasableOnly = typeScriptOptions.erasableOnly !== false;
  const isStylistic = isEnabled(options.stylistic, false);
  const isStylisticJsx = stylisticOptions.jsx ?? plan.enabled.jsx;

  if (isTypeAware && !environment.hasPackage("oxlint-tsgolint"))
    throw new Error(
      "Install oxlint-tsgolint to use typescript.typeAware in the Oxlint config",
    );

  const configs: Array<OxlintConfig> = [];
  if (options.gitignore !== false) {
    const gitignoreOptions = isRecord(options.gitignore)
      ? (options.gitignore as OxlintGitignoreOptions)
      : { strict: false };
    const gitignoreConfig = gitignore({
      name: "nirtamir2/gitignore",
      ...gitignoreOptions,
    });
    if (gitignoreConfig.ignores.length > 0)
      configs.push({ ignorePatterns: [...gitignoreConfig.ignores] });
  }
  const baseConfig = resolveGeneratedJsPlugins(
    plan.isInEditor
      ? generatedOxlintFragments.base.editor
      : generatedOxlintFragments.base.default,
  );
  const generatedIgnores = [...(baseConfig.ignorePatterns ?? [])];
  const configuredIgnores =
    typeof options.ignores === "function"
      ? options.ignores(generatedIgnores)
      : [...generatedIgnores, ...(options.ignores ?? [])];
  if (
    !Array.isArray(configuredIgnores) ||
    configuredIgnores.some((pattern) => typeof pattern !== "string")
  )
    throw new TypeError(
      'Oxlint option "ignores" transformer must return an array of strings',
    );
  baseConfig.ignorePatterns = [...configuredIgnores];
  configs.push(baseConfig);
  if (options.javascript?.overrides) {
    configs.push(
      { rules: { ...options.javascript.overrides } },
      resolveGeneratedJsPlugins(generatedOxlintFragments.base.suffix),
    );
  }
  if (isStylistic)
    configs.push(
      resolveGeneratedJsPlugins(
        generatedOxlintFragments.integrations.importsStylistic,
      ),
    );

  if (plan.enabled.unicorn) {
    const fragment = Object.is(unicornOptions.allRecommended, false)
      ? generatedOxlintFragments.unicorn.selected
      : generatedOxlintFragments.unicorn.allRecommended;
    addFragment(configs, fragment, unicornOptions.overrides);
  }

  configs.push(resolveGeneratedJsPlugins(generatedOxlintFragments.command));

  if (isEnabled(options.perfectionist, false))
    addRootConfig(
      configs,
      generatedOxlintFragments.integrations.perfectionist,
      subOptions<OxlintOverridesOptions>(options.perfectionist).overrides,
    );

  if (plan.enabled.jsx) addFragment(configs, generatedOxlintFragments.jsx);

  if (plan.enabled.typescript) {
    const variants = generatedOxlintFragments.typescript[plan.type];
    const hasCustomTypeAwareScope =
      typeScriptOptions.filesTypeAware !== undefined ||
      typeScriptOptions.ignoresTypeAware !== undefined;
    const typeAwareFiles =
      typeScriptOptions.filesTypeAware ?? defaultTypeAwareFiles;
    const typeAwareExcludes =
      typeScriptOptions.ignoresTypeAware ?? defaultTypeAwareExcludes;

    const selectedVariant = isTypeAware
      ? hasCustomTypeAwareScope
        ? isErasableOnly
          ? variants.typeAwareCustomScope
          : variants.typeAwareCustomScopeNonErasable
        : isErasableOnly
          ? variants.typeAware
          : variants.typeAwareNonErasable
      : isErasableOnly
        ? variants.standard
        : variants.standardNonErasable;
    let preparedVariant = withInlineOverrides(
      selectedVariant,
      "no-dupe-class-members",
      typeScriptOptions.overrides,
    );
    if (isTypeAware)
      preparedVariant = withInlineOverrides(
        preparedVariant,
        "typescript/promise-function-async",
        typeScriptOptions.overridesTypeAware,
      );
    if (isTypeAware && hasCustomTypeAwareScope)
      preparedVariant = {
        ...preparedVariant,
        config: applyTypeAwareScope(
          preparedVariant.config,
          typeAwareFiles,
          typeAwareExcludes,
        ),
      };
    if (!isTypeAware && typeScriptOptions.ignoresTypeAware !== undefined)
      preparedVariant = {
        ...preparedVariant,
        config: applyStandardTypeScriptExcludes(
          preparedVariant.config,
          typeScriptOptions.ignoresTypeAware,
        ),
      };
    addFragment(configs, preparedVariant);
  }

  if (options.e18e !== false) {
    if (e18eOptions.modernization !== false)
      addRootConfig(configs, generatedOxlintFragments.e18e.modernization);
    if (
      e18eOptions.moduleReplacements ??
      (plan.type === "lib" && plan.isInEditor)
    )
      addRootConfig(configs, generatedOxlintFragments.e18e.moduleReplacements);
    if (e18eOptions.performanceImprovements !== false)
      addRootConfig(
        configs,
        generatedOxlintFragments.e18e.performanceImprovements[plan.type],
      );
    addRootConfig(configs, generatedOxlintFragments.e18e.base[plan.type]);
    if (e18eOptions.overrides)
      configs.push({ rules: { ...e18eOptions.overrides } });
  }

  if (isStylistic) {
    addRootConfig(
      configs,
      options.lessOpinionated === true
        ? isStylisticJsx
          ? generatedOxlintFragments.integrations.stylistic.lessOpinionated
          : generatedOxlintFragments.integrations.stylistic.lessOpinionatedNoJsx
        : isStylisticJsx
          ? generatedOxlintFragments.integrations.stylistic.default
          : generatedOxlintFragments.integrations.stylistic.noJsx,
    );
    const customizations =
      generatedOxlintFragments.integrations.stylisticCustomizations;
    if (stylisticOptions.braceStyle === "1tbs")
      addStylisticCustomization(
        configs,
        customizations.braceStyle.oneTrueBrace,
        { jsx: isStylisticJsx },
      );
    else if (stylisticOptions.braceStyle === "allman")
      addStylisticCustomization(configs, customizations.braceStyle.allman, {
        jsx: isStylisticJsx,
      });
    if (stylisticOptions.experimental === true)
      addStylisticCustomization(configs, customizations.experimental, {
        jsx: isStylisticJsx,
      });
    if (
      typeof stylisticOptions.indent === "number" &&
      stylisticOptions.indent !== 2
    )
      addStylisticCustomization(configs, customizations.indent.numberTemplate, {
        jsx: isStylisticJsx,
        numericIndent: stylisticOptions.indent,
      });
    else if (stylisticOptions.indent === "tab")
      addStylisticCustomization(configs, customizations.indent.tab, {
        jsx: isStylisticJsx,
      });
    if (stylisticOptions.quotes === "backtick")
      addStylisticCustomization(configs, customizations.quotes.backtick, {
        jsx: isStylisticJsx,
      });
    else if (stylisticOptions.quotes === "single")
      addStylisticCustomization(configs, customizations.quotes.single, {
        jsx: isStylisticJsx,
      });
    if (stylisticOptions.semi === false)
      addStylisticCustomization(configs, customizations.semiFalse, {
        jsx: isStylisticJsx,
      });
    if (stylisticOptions.overrides)
      configs.push({ rules: { ...stylisticOptions.overrides } });
  }

  if (options.regexp !== false) {
    const regexpOptions = subOptions<OxlintRegExpOptions>(options.regexp);
    addRootConfig(
      configs,
      regexpOptions.level === "warn"
        ? generatedOxlintFragments.regexp.warn
        : generatedOxlintFragments.regexp.error,
      regexpOptions.overrides,
    );
  }

  if (plan.enabled.test) {
    const fragment = plan.isInEditor
      ? generatedOxlintFragments.test.editor
      : generatedOxlintFragments.test.default;
    addFragment(
      configs,
      fragment,
      subOptions<OxlintOverridesOptions>(options.test).overrides,
    );
  }

  if (plan.enabled.vue)
    addFragment(
      configs,
      plan.enabled.typescript
        ? vueOptions.vueVersion === 2
          ? generatedOxlintFragments.vue.typescriptV2
          : generatedOxlintFragments.vue.typescript
        : vueOptions.vueVersion === 2
          ? generatedOxlintFragments.vue.javascriptV2
          : generatedOxlintFragments.vue.javascript,
      vueOptions.overrides,
    );

  if (plan.enabled.react)
    addFragment(
      configs,
      withInlineOverrides(
        isTypeAware
          ? generatedOxlintFragments.react.typeAware
          : generatedOxlintFragments.react.standard,
        "react/only-export-components",
        subOptions<OxlintOverridesOptions>(options.react).overrides,
      ),
    );

  if (plan.enabled.nextjs)
    addFragment(
      configs,
      withInlineOverrides(
        generatedOxlintFragments.nextjs,
        "react/only-export-components",
        subOptions<OxlintOverridesOptions>(options.nextjs).overrides,
      ),
    );

  const enableZod = isEnabled(
    options.zod,
    environment.hasPackage("zod") && environment.hasPackage("next"),
  );
  if (enableZod)
    addFragment(
      configs,
      generatedOxlintFragments.integrations.zod,
      subOptions<OxlintOverridesOptions>(options.zod).overrides,
    );

  if (isEnabled(options.solid, false)) {
    addFragment(
      configs,
      withInlineOverrides(
        plan.enabled.typescript
          ? generatedOxlintFragments.integrations.solid.typescript
          : generatedOxlintFragments.integrations.solid.javascript,
        "solid/reactivity",
        subOptions<OxlintOverridesOptions>(options.solid).overrides,
      ),
    );
    if (plan.enabled.react)
      addFragment(
        configs,
        generatedOxlintFragments.integrations.solid.reactDisables,
      );
  }

  if (isEnabled(options.unocss, false)) {
    const unocssOptions = subOptions<OxlintUnoCSSOptions>(options.unocss);
    const attributify = unocssOptions.attributify !== false;
    const strict = unocssOptions.strict === true;
    const fragment = attributify
      ? strict
        ? generatedOxlintFragments.integrations.unocss.attributifyStrict
        : generatedOxlintFragments.integrations.unocss.attributify
      : strict
        ? generatedOxlintFragments.integrations.unocss.strict
        : generatedOxlintFragments.integrations.unocss.base;
    addRootConfig(configs, fragment, unocssOptions.overrides);
  }

  if (isEnabled(options.i18n, false))
    addFragment(configs, generatedOxlintFragments.integrations.i18n);

  if (isEnabled(options.security, false))
    addRootConfig(
      configs,
      generatedOxlintFragments.integrations.security,
      subOptions<OxlintOverridesOptions>(options.security).overrides,
    );

  const enableTailwind = isEnabled(
    options.tailwindcss,
    environment.hasPackage("tailwindcss"),
  );
  if (enableTailwind) {
    const tailwindOptions = subOptions<OxlintTailwindOptions>(
      options.tailwindcss,
    );
    addRootConfig(
      configs,
      generatedOxlintFragments.integrations.tailwindcss,
      tailwindOptions.overrides,
    );
    if (tailwindOptions.entryPoint !== undefined)
      configs.push({
        settings: {
          "better-tailwindcss": {
            entryPoint: tailwindOptions.entryPoint,
          },
        },
      });
  }

  const enableQuery = isEnabled(
    options.query,
    tanstackQueryPackages.some((name) => environment.hasPackage(name)),
  );
  if (enableQuery)
    addRootConfig(
      configs,
      generatedOxlintFragments.integrations.query,
      subOptions<OxlintOverridesOptions>(options.query).overrides,
    );

  if (isEnabled(options.angular, false))
    addFragment(
      configs,
      generatedOxlintFragments.integrations.angular,
      subOptions<OxlintOverridesOptions>(options.angular).overrides,
    );

  const enableStorybook = isEnabled(
    options.storybook,
    storybookPackages.some((name) => environment.hasPackage(name)),
  );
  if (enableStorybook)
    addRootConfig(configs, generatedOxlintFragments.integrations.storybook);

  if (plan.enabled.jsdoc)
    addFragment(
      configs,
      isStylistic
        ? generatedOxlintFragments.jsdoc.stylistic
        : generatedOxlintFragments.jsdoc.standard,
      subOptions<OxlintOverridesOptions>(options.jsdoc).overrides,
    );

  if (isEnabled(options.tsdoc, false))
    addFragment(
      configs,
      generatedOxlintFragments.integrations.tsdoc,
      subOptions<OxlintOverridesOptions>(options.tsdoc).overrides,
    );

  configs.push(resolveGeneratedJsPlugins(generatedOxlintFragments.tail));
  addDeclarationFileJsPluginSafety(configs);

  if (options.rules && Object.keys(options.rules).length > 0)
    configs.push({ rules: { ...options.rules } });
  configs.push(...userConfigs);

  return composeOxlintConfigs(...configs);
}

function createRecommendedConfig(): OxlintConfig {
  const configs = [
    resolveGeneratedJsPlugins(generatedOxlintFragments.base.default),
    resolveGeneratedJsPlugins(
      generatedOxlintFragments.unicorn.allRecommended.config,
    ),
    resolveGeneratedJsPlugins(generatedOxlintFragments.command),
    resolveGeneratedJsPlugins(generatedOxlintFragments.e18e.app.default),
    resolveGeneratedJsPlugins(generatedOxlintFragments.regexp.error),
    resolveGeneratedJsPlugins(generatedOxlintFragments.tail),
  ] satisfies Array<OxlintConfig>;
  addDeclarationFileJsPluginSafety(configs);
  return composeOxlintConfigs(...configs);
}

export const recommended = createRecommendedConfig();

export function nirtamir2(
  options: OxlintOptions = {},
  ...userConfigs: Array<OxlintConfig>
): OxlintConfig {
  return createOxlintConfig(options, userConfigs, {
    hasPackage: isPackageExists,
    isInEditor: isInEditorEnvironment(),
  });
}
