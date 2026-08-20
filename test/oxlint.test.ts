import type { OxlintConfig } from "oxlint";
import { describe, expect, it } from "vitest";
import oxlint, { recommended } from "../src/oxlint";
import { composeOxlintConfigs } from "../src/oxlint/compose";
import { createOxlintConfig } from "../src/oxlint/factory";
import type { OxlintOptions } from "../src/oxlint/types";
import { generatedOxlintFragments } from "../src/generated/oxlint";

const noPackages = {
  hasPackage: () => false,
  isInEditor: false,
};

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

  it("exports a static app base without auto-detected or default JSX/test integrations", () => {
    expect(recommended).toEqual(
      composeOxlintConfigs(
        generatedOxlintFragments.base.default,
        generatedOxlintFragments.unicorn.allRecommended.config,
      ),
    );

    const factoryDefault = createOxlintConfig({}, [], noPackages);
    expect(factoryDefault).not.toEqual(recommended);
    expect(factoryDefault.overrides?.length ?? 0).toBeGreaterThan(
      recommended.overrides?.length ?? 0,
    );
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
          files: generatedOxlintFragments.typescript.lib.typeAware
            .overrideTarget?.files,
        }),
      ]),
    );
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
    const target = generatedOxlintFragments.typescript.app.standard
      .overrideTarget;

    expect(config.rules).not.toHaveProperty(customRule);
    expect(config.overrides?.at(-1)).toEqual({
      ...target,
      rules: { [customRule]: "error" },
    });
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
      userConfigs: [
        { rules: { "typescript/no-explicit-any": "off" } },
      ],
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
        ?.filter((override) =>
          Object.hasOwn(override.rules ?? {}, customRule),
        )
        .map((override) => override.rules?.[customRule]);

      expect(scopedRules?.length).toBeGreaterThan(0);
      expect(scopedRules).toEqual(scopedRules?.map(() => "off"));
    },
  );

  it("auto-detects the shared TypeScript, Vue, and Next.js features", () => {
    const detected = createOxlintConfig({}, [], {
      hasPackage: (name) =>
        ["next", "typescript", "vue"].includes(name),
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

  it("rejects unsupported and malformed options with targeted errors", () => {
    expect(() =>
      // SAFETY: the cast is the point of the test — it feeds deliberately invalid
    // input past the compiler so the runtime validator can be exercised.
      createOxlintConfig({ markdown: true } as never, [], noPackages),
    ).toThrow('Unsupported Oxlint option "markdown"');
    expect(() =>
      createOxlintConfig(
        // SAFETY: the cast is the point of the test — it feeds deliberately invalid
    // input past the compiler so the runtime validator can be exercised.
        { typescript: { tsconfigPath: "tsconfig.json" } } as never,
        [],
        noPackages,
      ),
    ).toThrow('Unsupported Oxlint option "typescript.tsconfigPath"');
    expect(() =>
      // SAFETY: the cast is the point of the test — it feeds deliberately invalid
    // input past the compiler so the runtime validator can be exercised.
      createOxlintConfig({ ignores: "dist/**" } as never, [], noPackages),
    ).toThrow('Oxlint option "ignores" must be an array of strings');
    expect(() =>
      // SAFETY: the cast is the point of the test — it feeds deliberately invalid
    // input past the compiler so the runtime validator can be exercised.
      createOxlintConfig({ jsx: {} } as never, [], noPackages),
    ).toThrow('Oxlint option "jsx" must be a boolean');
  });

  it("fails early when type-aware linting is explicitly enabled without its peer", () => {
    expect(() =>
      createOxlintConfig(
        { typescript: { typeAware: true } },
        [],
        noPackages,
      ),
    ).toThrow("Install oxlint-tsgolint");
  });
});
