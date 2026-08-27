import type { OxlintConfig } from "oxlint";
import { describe, expect, it } from "vitest";
import { generatedOxlintFragments } from "../src/generated/oxlint";
import oxlint, { recommended } from "../src/oxlint";
import { composeOxlintConfigs } from "../src/oxlint/compose";
import { createOxlintConfig } from "../src/oxlint/factory";
import { resolveGeneratedJsPlugins } from "../src/oxlint/js-plugins";
import {
  applyTypeAwareScope,
  defaultTypeAwareExcludes,
  defaultTypeAwareFiles,
} from "../src/oxlint/type-aware-scope";
import type { OxlintOptions } from "../src/oxlint/types";

const noPackages = {
  hasPackage: () => false,
  isInEditor: false,
};

function jsPluginNames(config: OxlintConfig): Array<string> {
  return [
    ...(config.jsPlugins ?? []),
    ...(config.overrides?.flatMap((override) => override.jsPlugins ?? []) ??
      []),
  ].map((entry) => (typeof entry === "string" ? entry : entry.name));
}

function hasEnabledRule(config: OxlintConfig, rule: string): boolean {
  return [
    config.rules?.[rule],
    ...(config.overrides?.map((override) => override.rules?.[rule]) ?? []),
  ].some((value) => value != null && ![0, "off"].includes(value as 0 | "off"));
}

function configuredRuleNames(config: OxlintConfig): Array<string> {
  return [
    ...Object.keys(config.rules ?? {}),
    ...(config.overrides?.flatMap((override) =>
      Object.keys(override.rules ?? {}),
    ) ?? []),
  ];
}

describe("oxlint config factory", () => {
  it("returns a plain config synchronously", () => {
    const config = oxlint({
      jsdoc: false,
      jsx: false,
      nextjs: false,
      react: false,
      test: false,
      typescript: false,
      unicorn: false,
      vue: false,
    });

    expect(config).not.toBeInstanceOf(Promise);
    expect(config).toEqual(expect.any(Object));
  });

  it("loads project gitignore patterns by default and can disable them", () => {
    const withGitignore = createOxlintConfig({}, [], noPackages);
    const withoutGitignore = createOxlintConfig(
      { gitignore: false },
      [],
      noPackages,
    );

    expect(withGitignore.ignorePatterns).toContain("**/stuff/");
    expect(withoutGitignore.ignorePatterns).not.toContain("**/stuff/");
  });

  it("keeps object-form gitignore strictness aligned with ESLint", () => {
    expect(() =>
      createOxlintConfig(
        { gitignore: { files: "__missing_oxlint_gitignore__" } },
        [],
        noPackages,
      ),
    ).toThrow("__missing_oxlint_gitignore__");
  });

  it("can transform generated ignores and override the JavaScript base", () => {
    const firstGeneratedIgnore =
      generatedOxlintFragments.base.default.ignorePatterns?.[0];
    const config = createOxlintConfig(
      {
        ignores: (defaults) => [
          ...defaults.filter((pattern) => pattern !== firstGeneratedIgnore),
          "custom-ignore/**",
        ],
        javascript: { overrides: { eqeqeq: "off" } },
      },
      [],
      noPackages,
    );

    expect(config.ignorePatterns).not.toContain(firstGeneratedIgnore);
    expect(config.ignorePatterns).toContain("custom-ignore/**");
    expect(config.rules?.eqeqeq).toBe("off");
  });

  it("replays producers that ESLint composes after JavaScript overrides", () => {
    const commentsRule =
      "@eslint-community/eslint-comments/disable-enable-pair";
    const nodeRule = "eslint-node/prefer-global/process";
    const javascriptSuffixRule = "sonarjs/prefer-read-only-props";
    const config = createOxlintConfig(
      {
        javascript: {
          overrides: {
            [commentsRule]: "error",
            [nodeRule]: "off",
            [javascriptSuffixRule]: "error",
          },
        },
      },
      [],
      noPackages,
    );

    expect(config.rules?.[commentsRule]).toBe("off");
    expect(config.rules?.[nodeRule]).toEqual(["error", "never"]);
    expect(config.rules?.[javascriptSuffixRule]).toBe("off");
  });

  it("exports a static app base without auto-detected or default JSX/test integrations", () => {
    const recommendedWithoutDeclarationSafety = {
      ...recommended,
      overrides: recommended.overrides?.filter(
        (override) =>
          !(
            override.files.includes("**/*.d.{ts,mts,cts}") &&
            override.jsPlugins == null &&
            override.rules?.["sonarjs/cognitive-complexity"] === "off"
          ),
      ),
    };

    expect(recommendedWithoutDeclarationSafety).toEqual(
      composeOxlintConfigs(
        resolveGeneratedJsPlugins(generatedOxlintFragments.base.default),
        resolveGeneratedJsPlugins(
          generatedOxlintFragments.unicorn.allRecommended.config,
        ),
        resolveGeneratedJsPlugins(generatedOxlintFragments.command),
        resolveGeneratedJsPlugins(generatedOxlintFragments.e18e.app.default),
        resolveGeneratedJsPlugins(generatedOxlintFragments.regexp.error),
        resolveGeneratedJsPlugins(generatedOxlintFragments.tail),
      ),
    );

    const factoryDefault = createOxlintConfig({}, [], noPackages);
    expect(factoryDefault).not.toEqual(recommended);
    expect(factoryDefault.overrides?.length ?? 0).toBeGreaterThan(
      recommended.overrides?.length ?? 0,
    );
    expect(
      factoryDefault.jsPlugins?.map((entry) =>
        typeof entry === "string" ? entry : entry.name,
      ),
    ).toEqual(
      expect.arrayContaining([
        "command",
        "default-import-name",
        "e18e",
        "regexp",
      ]),
    );
    expect(factoryDefault.rules).toMatchObject({
      "command/command": "error",
      "default-import-name/default-import-name": "warn",
      "e18e/prefer-date-now": "error",
      "regexp/prefer-d": "error",
    });
  });

  it("selects variants in shared order and lets root and trailing rules win", () => {
    const trailing = {
      rules: {
        eqeqeq: "off",
        "no-alert": "warn",
      },
    } satisfies OxlintConfig;
    const config = createOxlintConfig(
      {
        ignores: ["generated/**"],
        jsdoc: true,
        jsx: true,
        nextjs: true,
        react: true,
        rules: { eqeqeq: "warn" },
        test: true,
        type: "lib",
        typescript: { typeAware: true },
        unicorn: { allRecommended: false },
        vue: true,
      },
      [trailing],
      {
        hasPackage: (name) => name === "oxlint-tsgolint",
        isInEditor: false,
      },
    );

    expect(config.ignorePatterns).toContain("generated/**");
    expect(config.options?.typeAware).toBe(true);
    expect(config.rules).toMatchObject({
      eqeqeq: "off",
      "no-alert": "warn",
    });
    expect(config.overrides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          files:
            generatedOxlintFragments.typescript.lib.typeAware.overrideTarget
              ?.files,
        }),
      ]),
    );
  });

  it("omits React JavaScript-plugin rules that require TypeScript parser services", () => {
    const config = createOxlintConfig(
      { react: true, typescript: { typeAware: true } },
      [],
      {
        hasPackage: (name) => name === "oxlint-tsgolint",
        isInEditor: false,
      },
    );
    const rules = Object.fromEntries(
      config.overrides?.flatMap((override) =>
        Object.entries(override.rules ?? {}),
      ) ?? [],
    );

    expect(config.options?.typeAware).toBe(true);
    expect(rules).not.toHaveProperty(
      "@eslint-react/no-leaked-conditional-rendering",
    );
    expect(rules).not.toHaveProperty("@eslint-react/no-unused-props");
    expect(jsPluginNames(config)).not.toContain("classname-components");
  });

  it("omits TypeScript JavaScript-plugin rules that require parser services", () => {
    const config = createOxlintConfig({ typescript: { typeAware: true } }, [], {
      hasPackage: (name) => name === "oxlint-tsgolint",
      isInEditor: false,
    });
    const rules = Object.fromEntries(
      config.overrides?.flatMap((override) =>
        Object.entries(override.rules ?? {}),
      ) ?? [],
    );

    expect(config.options?.typeAware).toBe(true);
    expect(jsPluginNames(config)).not.toContain(
      "sort-destructure-keys-typescript",
    );
    expect(
      Object.keys(rules).some((rule) =>
        rule.startsWith("sort-destructure-keys-typescript/"),
      ),
    ).toBe(false);
  });

  it("retargets type-aware TypeScript rules without losing default exclusions", () => {
    const config = createOxlintConfig(
      {
        typescript: {
          filesTypeAware: ["custom/**/*.ts"],
          overridesTypeAware: { "typescript/no-floating-promises": "warn" },
          typeAware: true,
        },
      },
      [],
      {
        hasPackage: (name) => name === "oxlint-tsgolint",
        isInEditor: false,
      },
    );
    const scopedRule = config.overrides?.findLast(
      (override) =>
        override.files.includes("custom/**/*.ts") &&
        Object.hasOwn(override.rules ?? {}, "typescript/no-floating-promises"),
    );

    expect(config.options?.typeAware).toBe(true);
    expect(scopedRule?.excludeFiles).toEqual(defaultTypeAwareExcludes);
    expect(scopedRule?.rules?.["typescript/no-floating-promises"]).toBe("warn");
  });

  it("applies TypeScript ignoresTypeAware without enabling type awareness", () => {
    const config = createOxlintConfig(
      { typescript: { ignoresTypeAware: ["custom-generated/**"] } },
      [],
      noPackages,
    );
    const scopedFinalRuleMaps = config.overrides?.filter(
      (override) =>
        override.excludeFiles?.includes("custom-generated/**") &&
        (Object.hasOwn(override.rules ?? {}, "array-callback-return") ||
          Object.hasOwn(
            override.rules ?? {},
            "eslint-typescript/member-ordering",
          )),
    );

    expect(config.options?.typeAware).not.toBe(true);
    expect(scopedFinalRuleMaps).toHaveLength(2);
  });

  it("keeps the custom type-aware template equivalent to the full preset", () => {
    const customScope = resolveGeneratedJsPlugins(
      applyTypeAwareScope(
        generatedOxlintFragments.typescript.app.typeAwareCustomScopeNonErasable
          .config,
        defaultTypeAwareFiles,
        defaultTypeAwareExcludes,
      ),
    );
    const full = resolveGeneratedJsPlugins(
      generatedOxlintFragments.typescript.app.typeAwareNonErasable.config,
    );

    expect(customScope).toEqual(full);
  });

  it("disables JavaScript-plugin rules on declaration files", () => {
    const config = createOxlintConfig({ typescript: { typeAware: true } }, [], {
      hasPackage: (name) => name === "oxlint-tsgolint",
      isInEditor: false,
    });
    const declarationOverride = config.overrides?.find(
      (override) =>
        override.files.includes("**/*.d.{ts,mts,cts}") &&
        override.rules?.["sonarjs/cognitive-complexity"] === "off",
    );

    expect(declarationOverride?.rules).toMatchObject({
      "eslint-typescript/member-ordering": "off",
      "sonarjs/cognitive-complexity": "off",
    });

    const recommendedDeclarationOverride = recommended.overrides?.find(
      (override) =>
        override.files.includes("**/*.d.{ts,mts,cts}") &&
        override.rules?.["sonarjs/cognitive-complexity"] === "off",
    );
    expect(recommendedDeclarationOverride?.rules).toMatchObject({
      "sonarjs/cognitive-complexity": "off",
    });
  });

  it("mirrors later ESLint disables to aliased fallback rule IDs", () => {
    const config = createOxlintConfig({}, [], noPackages);
    const testFiles =
      generatedOxlintFragments.test.default.overrideTarget?.files ?? [];
    const testOverride = config.overrides?.find(
      (override) =>
        [0, "off"].includes(
          override.rules?.["eslint-node/prefer-global/process"] as 0 | "off",
        ) && testFiles.every((file) => override.files.includes(file)),
    );

    expect([0, "off"]).toContain(
      config.rules?.["eslint-unicorn/template-indent"],
    );
    expect(testOverride?.files).toEqual(testFiles);
  });

  it("preserves Solid-specific TypeScript and React disables", () => {
    const config = createOxlintConfig(
      { react: true, solid: true, typescript: true },
      [],
      noPackages,
    );
    const solidFiles =
      generatedOxlintFragments.integrations.solid.typescript.overrideTarget
        ?.files ?? [];
    const solidRules = Object.assign(
      {},
      ...(config.overrides ?? [])
        .filter(
          (override) =>
            solidFiles.length === override.files.length &&
            solidFiles.every((file) => override.files.includes(file)),
        )
        .map((override) => override.rules ?? {}),
    ) as NonNullable<OxlintConfig["rules"]>;

    expect(solidRules).toMatchObject({
      "@eslint-react/no-unstable-context-value": "off",
      "prefer-const": "off",
      "typescript/no-non-null-assertion": "off",
    });
    expect(solidRules).not.toHaveProperty(
      "sonarjs/no-unstable-nested-components",
    );
    expect(solidRules).not.toHaveProperty(
      "sonarjs/jsx-no-constructed-context-values",
    );
  });

  it("inserts feature overrides before later producer-internal disables", () => {
    const config = createOxlintConfig(
      {
        nextjs: {
          overrides: { "unicorn/prefer-string-raw": "error" },
        },
        solid: { overrides: { "prefer-const": "error" } },
        typescript: {
          overrides: { "no-unused-expressions": "error" },
          overridesTypeAware: { "no-unused-expressions": "error" },
          typeAware: true,
        },
      },
      [],
      {
        hasPackage: (name) => name === "oxlint-tsgolint",
        isInEditor: false,
      },
    );
    const testRuleValues = config.overrides
      ?.filter((override) =>
        override.files.includes("**/*.{test,spec}.{ts,tsx}"),
      )
      .map((override) => override.rules?.["no-unused-expressions"])
      .filter((value) => value !== undefined);
    const middlewareRuleValues = config.overrides
      ?.filter((override) => override.files.includes("**/src/middleware.ts"))
      .map((override) => override.rules?.["unicorn/prefer-string-raw"])
      .filter((value) => value !== undefined);
    const solidFiles =
      generatedOxlintFragments.integrations.solid.typescript.overrideTarget
        ?.files ?? [];
    const solidRuleValues = config.overrides
      ?.filter((override) =>
        solidFiles.every((file) => override.files.includes(file)),
      )
      .map((override) => override.rules?.["prefer-const"])
      .filter((value) => value !== undefined);

    expect(testRuleValues?.at(-1)).toBe("off");
    expect(middlewareRuleValues?.at(-1)).toBe("off");
    expect(solidRuleValues?.at(-1)).toBe("off");
  });

  it("keeps integration overrides scoped to that integration", () => {
    const customRule = "typescript/no-explicit-any";
    const config = createOxlintConfig(
      {
        jsdoc: false,
        jsx: false,
        nextjs: false,
        react: false,
        test: false,
        typescript: { overrides: { [customRule]: "error" } },
        unicorn: false,
        vue: false,
      },
      [],
      noPackages,
    );
    const target =
      generatedOxlintFragments.typescript.app.standard.overrideTarget;

    expect(config.rules).not.toHaveProperty(customRule);
    expect(
      config.overrides?.find(
        (override) => override.rules?.[customRule] === "error",
      ),
    ).toMatchObject({ files: target?.files, rules: { [customRule]: "error" } });
  });

  it.each([
    {
      name: "root rules",
      options: {
        rules: { "typescript/no-explicit-any": "off" },
        typescript: true,
      },
      userConfigs: [],
    },
    {
      name: "a trailing config",
      options: { typescript: true },
      userConfigs: [{ rules: { "typescript/no-explicit-any": "off" } }],
    },
  ] satisfies Array<{
    name: string;
    options: OxlintOptions;
    userConfigs: Array<OxlintConfig>;
  }>)(
    "lets $name override earlier integration-scoped rules",
    ({ options, userConfigs }) => {
      const customRule = "typescript/no-explicit-any";
      const config = createOxlintConfig(
        {
          jsdoc: false,
          jsx: false,
          nextjs: false,
          react: false,
          test: false,
          unicorn: false,
          vue: false,
          ...options,
        },
        userConfigs,
        noPackages,
      );
      const scopedRules = config.overrides
        ?.filter((override) => Object.hasOwn(override.rules ?? {}, customRule))
        .map((override) => override.rules?.[customRule]);

      expect(scopedRules?.length).toBeGreaterThan(0);
      expect(scopedRules).toEqual(scopedRules?.map(() => "off"));
    },
  );

  it("auto-detects the shared TypeScript, Vue, and Next.js features", () => {
    const detected = createOxlintConfig({}, [], {
      hasPackage: (name) => ["next", "typescript", "vue"].includes(name),
      isInEditor: false,
    });
    const withoutDetection = createOxlintConfig(
      {
        nextjs: false,
        typescript: false,
        vue: false,
      },
      [],
      noPackages,
    );

    expect(detected.overrides?.length ?? 0).toBeGreaterThan(
      withoutDetection.overrides?.length ?? 0,
    );
    const detectedOverridePlugins = detected.overrides?.flatMap(
      (override) => override.plugins ?? [],
    );
    expect(detectedOverridePlugins).toEqual(
      expect.arrayContaining(["nextjs", "typescript", "vue"]),
    );
  });

  it("honors explicit editor, erasable TypeScript, Vue, and Stylistic variants", () => {
    const explicitEditor = createOxlintConfig(
      { isInEditor: true },
      [],
      noPackages,
    );
    const detectedEditor = createOxlintConfig({}, [], {
      ...noPackages,
      isInEditor: true,
    });
    expect(explicitEditor).toEqual(detectedEditor);

    const erasable = createOxlintConfig(
      { typescript: { erasableOnly: true } },
      [],
      noPackages,
    );
    const nonErasable = createOxlintConfig(
      { typescript: { erasableOnly: false } },
      [],
      noPackages,
    );
    expect(jsPluginNames(erasable)).toContain("erasable-syntax-only");
    expect(jsPluginNames(nonErasable)).not.toContain("erasable-syntax-only");

    const vue2 = createOxlintConfig({ vue: { vueVersion: 2 } }, [], noPackages);
    const vue3 = createOxlintConfig({ vue: { vueVersion: 3 } }, [], noPackages);
    expect(vue2).not.toEqual(vue3);

    const lessOpinionated = createOxlintConfig(
      {
        jsx: false,
        lessOpinionated: true,
        stylistic: true,
      },
      [],
      noPackages,
    );
    expect(lessOpinionated.rules?.curly).toBe("off");
    expect(hasEnabledRule(lessOpinionated, "antfu/top-level-function")).toBe(
      false,
    );
    expect(
      configuredRuleNames(lessOpinionated).some((rule) =>
        rule.startsWith("@stylistic/jsx-"),
      ),
    ).toBe(false);
  });

  it("composes each e18e rule family independently", () => {
    const disabledFamilies = createOxlintConfig(
      {
        e18e: {
          modernization: false,
          moduleReplacements: false,
          performanceImprovements: false,
        },
      },
      [],
      noPackages,
    );
    expect(hasEnabledRule(disabledFamilies, "e18e/prefer-includes")).toBe(
      false,
    );
    expect(hasEnabledRule(disabledFamilies, "e18e/ban-dependencies")).toBe(
      false,
    );
    expect(hasEnabledRule(disabledFamilies, "e18e/prefer-date-now")).toBe(
      false,
    );
    expect(jsPluginNames(disabledFamilies)).toContain("e18e");

    const enabledFamilies = createOxlintConfig(
      {
        e18e: {
          modernization: true,
          moduleReplacements: true,
          performanceImprovements: true,
        },
      },
      [],
      noPackages,
    );
    expect(hasEnabledRule(enabledFamilies, "e18e/prefer-includes")).toBe(true);
    expect(hasEnabledRule(enabledFamilies, "e18e/ban-dependencies")).toBe(true);
    expect(hasEnabledRule(enabledFamilies, "e18e/prefer-date-now")).toBe(true);

    const libraryDefaults = createOxlintConfig(
      { e18e: true, type: "lib" },
      [],
      noPackages,
    );
    const applicationDefaults = createOxlintConfig(
      { e18e: true, type: "app" },
      [],
      noPackages,
    );
    expect(hasEnabledRule(libraryDefaults, "e18e/prefer-static-regex")).toBe(
      true,
    );
    expect(
      hasEnabledRule(applicationDefaults, "e18e/prefer-static-regex"),
    ).toBe(false);
  });

  it("preserves e18e safety disables before its integration overrides", () => {
    const earlierProducerOverride = createOxlintConfig(
      {
        e18e: true,
        javascript: {
          overrides: { "e18e/prefer-static-regex": "error" },
        },
        type: "app",
      },
      [],
      noPackages,
    );
    expect(earlierProducerOverride.rules?.["e18e/prefer-static-regex"]).toBe(
      "off",
    );

    const integrationOverride = createOxlintConfig(
      {
        e18e: { overrides: { "e18e/prefer-static-regex": "error" } },
        type: "app",
      },
      [],
      noPackages,
    );
    expect(integrationOverride.rules?.["e18e/prefer-static-regex"]).toBe(
      "error",
    );
  });

  it("preserves executable explicit disables from later producers", () => {
    const config = createOxlintConfig(
      {
        javascript: {
          overrides: {
            "better-tailwindcss/enforce-consistent-line-wrapping": "error",
            "regexp/strict": "error",
          },
        },
        tailwindcss: true,
      },
      [],
      noPackages,
    );

    expect(config.rules?.["regexp/strict"]).toBe("off");
    expect(
      config.rules?.["better-tailwindcss/enforce-consistent-line-wrapping"],
    ).toBe("off");
    expect(config.rules?.curly).toBe("off");
    expect(config.rules?.["no-unexpected-multiline"]).toBe("off");
  });

  it("includes stylistic rules contributed by imports and JSDoc", () => {
    const config = createOxlintConfig(
      { jsdoc: true, stylistic: true },
      [],
      noPackages,
    );

    expect(hasEnabledRule(config, "import/newline-after-import")).toBe(true);
    expect(hasEnabledRule(config, "eslint-jsdoc/check-alignment")).toBe(true);
    expect(hasEnabledRule(config, "eslint-jsdoc/multiline-blocks")).toBe(true);
  });

  it("applies every Stylistic customizer without re-enabling JSX", () => {
    const config = createOxlintConfig(
      {
        jsx: false,
        stylistic: {
          braceStyle: "allman",
          experimental: true,
          indent: 4,
          jsx: false,
          quotes: "single",
          semi: false,
        },
      },
      [],
      noPackages,
    );

    expect(config.rules?.["@stylistic/brace-style"]).toEqual(
      expect.arrayContaining(["error", "allman"]),
    );
    expect(config.rules?.["@stylistic/indent"]).toEqual(
      expect.arrayContaining(["error", 4]),
    );
    expect(config.rules?.["@stylistic/quotes"]).toEqual(
      expect.arrayContaining(["error", "single"]),
    );
    expect(config.rules?.["@stylistic/semi"]).toEqual(
      expect.arrayContaining(["error", "never"]),
    );
    expect(hasEnabledRule(config, "@stylistic/exp-list-style")).toBe(true);
    expect(config.rules?.["antfu/consistent-list-newline"]).toBe("off");
    expect(
      configuredRuleNames(config).some((rule) =>
        rule.startsWith("@stylistic/jsx-"),
      ),
    ).toBe(false);
  });

  it("composes every executable JavaScript-plugin integration", () => {
    const config = createOxlintConfig(
      {
        e18e: true,
        jsdoc: false,
        jsx: false,
        nextjs: false,
        perfectionist: true,
        query: true,
        react: false,
        regexp: true,
        security: true,
        solid: true,
        storybook: true,
        stylistic: true,
        tailwindcss: { entryPoint: "src/app.css" },
        test: false,
        tsdoc: true,
        typescript: true,
        unocss: { attributify: true, strict: true },
        unicorn: false,
        vue: false,
        zod: true,
      },
      [],
      noPackages,
    );
    const names = jsPluginNames(config);

    expect(names).toEqual(
      expect.arrayContaining([
        "@stylistic",
        "@tanstack/query",
        "better-tailwindcss",
        "e18e",
        "import-zod",
        "perfectionist",
        "regexp",
        "security",
        "solid",
        "storybook",
        "tsdoc",
        "unocss",
      ]),
    );
    expect(names).not.toContain("@eslint-react");
    expect(names).not.toContain("ssr-friendly");
    expect(config.settings?.["better-tailwindcss"]).toEqual({
      entryPoint: "src/app.css",
    });
    const emptyEntryPoint = createOxlintConfig(
      { tailwindcss: { entryPoint: "" } },
      [],
      noPackages,
    );
    expect(emptyEntryPoint.settings?.["better-tailwindcss"]).toEqual({
      entryPoint: "",
    });
    expect(config.rules).toMatchObject({
      "security/detect-eval-with-expression": "warn",
      "unocss/blocklist": "error",
      "unocss/order-attributify": "warn",
    });
  });

  it("rejects unsupported and malformed options with targeted errors", () => {
    expect(() =>
      createOxlintConfig({ markdown: true } as never, [], noPackages),
    ).toThrow('Unsupported Oxlint option "markdown"');
    expect(() =>
      createOxlintConfig(
        { typescript: { tsconfigPath: "tsconfig.json" } } as never,
        [],
        noPackages,
      ),
    ).toThrow('Unsupported Oxlint option "typescript.tsconfigPath"');
    expect(() =>
      createOxlintConfig({ ignores: "dist/**" } as never, [], noPackages),
    ).toThrow(
      'Oxlint option "ignores" must be an array of strings or transformer function',
    );
    expect(() =>
      createOxlintConfig({ jsx: {} } as never, [], noPackages),
    ).toThrow('Oxlint option "jsx" must be a boolean');
    expect(() =>
      createOxlintConfig(
        { unocss: { strict: "yes" } } as never,
        [],
        noPackages,
      ),
    ).toThrow('Oxlint option "unocss.strict" must be a boolean');
  });

  it("fails early when type-aware linting is explicitly enabled without its peer", () => {
    expect(() =>
      createOxlintConfig({ typescript: { typeAware: true } }, [], noPackages),
    ).toThrow("Install oxlint-tsgolint");
  });
});
