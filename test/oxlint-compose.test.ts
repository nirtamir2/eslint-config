import type { OxlintConfig } from "oxlint";
import { describe, expect, it } from "vitest";
import { composeOxlintConfigs } from "../src/oxlint/compose";

describe("composeOxlintConfigs", () => {
  it("merges Oxlint fields with deterministic later-config precedence", () => {
    const base = {
      categories: { correctness: "warn" },
      env: { browser: true },
      globals: { BASE: "readonly" },
      ignorePatterns: ["dist/**"],
      jsPlugins: [{ name: "legacy", specifier: "eslint-plugin-a" }],
      options: { maxWarnings: 10 },
      overrides: [{ files: ["**/*.ts"], rules: { "no-console": "off" } }],
      plugins: ["import", "unicorn"],
      rules: { eqeqeq: ["error", "always"], "no-console": "warn" },
      settings: { react: { version: "18" } },
    } satisfies OxlintConfig;
    const extension = {
      categories: { correctness: "error", suspicious: "warn" },
      env: { browser: false, node: true },
      globals: { EXTENSION: "writable" },
      ignorePatterns: ["dist/**", "generated/**"],
      jsPlugins: [
        { name: "legacy", specifier: "eslint-plugin-b" },
        "eslint-plugin-extra",
      ],
      options: { typeAware: true },
      overrides: [{ files: ["**/*.test.ts"], rules: { eqeqeq: "off" } }],
      plugins: ["typescript", "import"],
      rules: { eqeqeq: "warn", "no-alert": "error" },
      settings: { next: { rootDir: "apps/web" } },
    } satisfies OxlintConfig;

    expect(composeOxlintConfigs(base, extension)).toEqual({
      categories: { correctness: "error", suspicious: "warn" },
      env: { browser: false, node: true },
      globals: { BASE: "readonly", EXTENSION: "writable" },
      ignorePatterns: ["dist/**", "generated/**"],
      jsPlugins: [
        { name: "legacy", specifier: "eslint-plugin-b" },
        "eslint-plugin-extra",
      ],
      options: { maxWarnings: 10, typeAware: true },
      overrides: [
        { files: ["**/*.ts"], rules: { "no-console": "off" } },
        { files: ["**/*.test.ts"], rules: { eqeqeq: "off" } },
      ],
      plugins: ["import", "unicorn", "typescript"],
      rules: { eqeqeq: "warn", "no-alert": "error", "no-console": "warn" },
      settings: {
        next: { rootDir: "apps/web" },
        react: { version: "18" },
      },
    });
    expect(base.ignorePatterns).toEqual(["dist/**"]);
    expect(base.overrides).toHaveLength(1);

    const result = composeOxlintConfigs(base);
    (result.rules?.eqeqeq as Array<unknown>)[0] = "off";
    (result.settings?.react as { version: string }).version = "changed";
    expect(base.rules.eqeqeq).toEqual(["error", "always"]);
    expect(base.settings.react.version).toBe("18");
  });

  it("resolves imported object extends depth-first", () => {
    const shared = {
      rules: { eqeqeq: "error", "no-console": "error" },
    } satisfies OxlintConfig;
    const wrapper = {
      extends: [shared],
      rules: { "no-console": "warn" },
    } satisfies OxlintConfig;

    expect(
      composeOxlintConfigs(wrapper, { rules: { "no-console": "off" } }),
    ).toEqual({
      rules: { eqeqeq: "error", "no-console": "off" },
    });
  });

  it("lets an explicit null clear JavaScript plugins", () => {
    expect(
      composeOxlintConfigs(
        { jsPlugins: ["eslint-plugin-example"] },
        { jsPlugins: null },
      ),
    ).toEqual({ jsPlugins: null });
  });

  it("rejects cyclic and path-based extends", () => {
    const cyclic: OxlintConfig = {};
    cyclic.extends = [cyclic];

    expect(() => composeOxlintConfigs(cyclic)).toThrow(
      "Cyclic Oxlint config extends",
    );
    expect(() =>
      composeOxlintConfigs({ extends: ["./base.json"] } as unknown as OxlintConfig),
    ).toThrow("Import extended Oxlint configs as objects");
  });
});
