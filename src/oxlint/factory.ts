import type { OxlintConfig } from "oxlint";
import { isPackageExists } from "local-pkg";
import type { GeneratedFragment } from "../generated/oxlint";
import { generatedOxlintFragments } from "../generated/oxlint";
import type { FeatureEnvironment } from "../feature-plan";
import { resolveSharedFeaturePlan } from "../feature-plan";
import { isInEditorEnv } from "../editor-environment";
import { composeOxlintConfigs } from "./compose";
import type {
  OxlintOptions,
  OxlintOverridesOptions,
  OxlintRules,
  OxlintTypeScriptOptions,
  OxlintUnicornOptions,
} from "./types";

const optionKeys = new Set<keyof OxlintOptions>([
  "ignores",
  "jsdoc",
  "jsx",
  "nextjs",
  "react",
  "rules",
  "test",
  "type",
  "typescript",
  "unicorn",
  "vue",
]);

const overrideOptionKeys = new Set(["overrides"]);
const typeScriptOptionKeys = new Set(["overrides", "typeAware"]);
const unicornOptionKeys = new Set(["allRecommended", "overrides"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    !Object.is(value, null) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function assertRules(value: unknown, path: string): asserts value is OxlintRules {
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
  if (!isRecord(value))
    throw new TypeError(`Oxlint option "${name}" must be a boolean or object`);

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key))
      throw new Error(`Unsupported Oxlint option "${name}.${key}"`);
  }

  assertRules(value.overrides, `${name}.overrides`);
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
    (!Array.isArray(options.ignores) ||
      options.ignores.some((pattern) => typeof pattern !== "string"))
  )
    throw new TypeError(
      'Oxlint option "ignores" must be an array of strings',
    );
  if (
    options.type !== undefined &&
    options.type !== "app" &&
    options.type !== "lib"
  )
    throw new TypeError('Oxlint option "type" must be "app" or "lib"');

  assertRules(options.rules, "rules");
  assertBoolean(options.jsx, "jsx");
  assertFeatureOption("jsdoc", options.jsdoc, overrideOptionKeys);
  assertFeatureOption("nextjs", options.nextjs, overrideOptionKeys);
  assertFeatureOption("react", options.react, overrideOptionKeys);
  assertFeatureOption("test", options.test, overrideOptionKeys);
  assertFeatureOption(
    "typescript",
    options.typescript,
    typeScriptOptionKeys,
  );
  assertFeatureOption("unicorn", options.unicorn, unicornOptionKeys);
  assertFeatureOption("vue", options.vue, overrideOptionKeys);

  if (isRecord(options.typescript))
    assertBoolean(options.typescript.typeAware, "typescript.typeAware");
  if (isRecord(options.unicorn))
    assertBoolean(options.unicorn.allRecommended, "unicorn.allRecommended");
}

function subOptions<T>(value: boolean | T | undefined): T {
  return isRecord(value) ? (value as T) : ({} as T);
}

function addFragment(
  configs: Array<OxlintConfig>,
  fragment: GeneratedFragment,
  overrides?: OxlintRules,
): void {
  configs.push(fragment.config);
  if (!overrides || Object.keys(overrides).length === 0) return;
  if (!fragment.overrideTarget)
    throw new Error("Generated Oxlint fragment is missing its override target");

  configs.push({
    overrides: [
      {
        ...fragment.overrideTarget,
        ...(fragment.overrideTarget.excludeFiles
          ? { excludeFiles: [...fragment.overrideTarget.excludeFiles] }
          : {}),
        files: [...fragment.overrideTarget.files],
        rules: { ...overrides },
      },
    ],
  });
}

function assertUserConfigs(
  userConfigs: ReadonlyArray<OxlintConfig>,
): void {
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
  const typeScriptOptions = subOptions<OxlintTypeScriptOptions>(
    options.typescript,
  );
  const unicornOptions = subOptions<OxlintUnicornOptions>(options.unicorn);
  const typeAware =
    plan.enabled.typescript && Object.is(typeScriptOptions.typeAware, true);

  if (typeAware && !environment.hasPackage("oxlint-tsgolint"))
    throw new Error(
      "Install oxlint-tsgolint to use typescript.typeAware in the Oxlint config",
    );

  const configs: Array<OxlintConfig> = [
    plan.isInEditor
      ? generatedOxlintFragments.base.editor
      : generatedOxlintFragments.base.default,
  ];

  for (const feature of plan.orderedFeatures) {
    switch (feature) {
      case "unicorn": {
        const fragment = Object.is(unicornOptions.allRecommended, false)
          ? generatedOxlintFragments.unicorn.selected
          : generatedOxlintFragments.unicorn.allRecommended;
        addFragment(configs, fragment, unicornOptions.overrides);
        break;
      }
      case "jsx": {
        addFragment(configs, generatedOxlintFragments.jsx);
        break;
      }
      case "typescript": {
        const variants = generatedOxlintFragments.typescript[plan.type];
        addFragment(
          configs,
          typeAware ? variants.typeAware : variants.standard,
          typeScriptOptions.overrides,
        );
        break;
      }
      case "test": {
        const fragment = plan.isInEditor
          ? generatedOxlintFragments.test.editor
          : generatedOxlintFragments.test.default;
        addFragment(
          configs,
          fragment,
          subOptions<OxlintOverridesOptions>(options.test).overrides,
        );
        break;
      }
      case "vue": {
        addFragment(
          configs,
          plan.enabled.typescript
            ? generatedOxlintFragments.vue.typescript
            : generatedOxlintFragments.vue.javascript,
          subOptions<OxlintOverridesOptions>(options.vue).overrides,
        );
        break;
      }
      case "react": {
        addFragment(
          configs,
          typeAware
            ? generatedOxlintFragments.react.typeAware
            : generatedOxlintFragments.react.standard,
          subOptions<OxlintOverridesOptions>(options.react).overrides,
        );
        break;
      }
      case "nextjs": {
        addFragment(
          configs,
          generatedOxlintFragments.nextjs,
          subOptions<OxlintOverridesOptions>(options.nextjs).overrides,
        );
        break;
      }
      case "jsdoc": {
        addFragment(
          configs,
          generatedOxlintFragments.jsdoc,
          subOptions<OxlintOverridesOptions>(options.jsdoc).overrides,
        );
        break;
      }
    }
  }

  const userIgnores = options.ignores;
  if (userIgnores && userIgnores.length > 0)
    configs.push({ ignorePatterns: [...userIgnores] });
  if (options.rules && Object.keys(options.rules).length > 0)
    configs.push({ rules: { ...options.rules } });
  configs.push(...userConfigs);

  return composeOxlintConfigs(...configs);
}

export const recommended = composeOxlintConfigs(
  generatedOxlintFragments.base.default,
  generatedOxlintFragments.unicorn.allRecommended.config,
);

export function nirtamir2(
  options: OxlintOptions = {},
  ...userConfigs: Array<OxlintConfig>
): OxlintConfig {
  return createOxlintConfig(options, userConfigs, {
    hasPackage: isPackageExists,
    isInEditor: isInEditorEnv(),
  });
}
