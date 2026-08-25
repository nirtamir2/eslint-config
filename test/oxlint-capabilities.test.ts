import { describe, expect, it } from "vitest";
import { oxlintCapabilities as publicCapabilities } from "../src/oxlint";
import { oxlintCapabilities } from "../src/oxlint/capabilities";

const eslintConfigProducers = [
  "gitignore",
  "ignores",
  "javascript",
  "comments",
  "node",
  "imports",
  "unicorn",
  "command",
  "perfectionist",
  "jsx",
  "typescript",
  "e18e",
  "stylistic",
  "regexp",
  "test",
  "vue",
  "react",
  "nextjs",
  "zod",
  "solid",
  "svelte",
  "unocss",
  "i18n",
  "security",
  "tailwindcss",
  "query",
  "astro",
  "angular",
  "storybook",
  "jsonc",
  "sortPackageJson",
  "sortTsconfig",
  "pnpm",
  "defaultImportName",
  "jsdoc",
  "tsdoc",
  "yaml",
  "toml",
  "markdown",
  "formatters",
  "prettier",
  "disables",
] as const;

describe("oxlint capability manifest", () => {
  it("accounts for every ESLint config producer", () => {
    expect(Object.keys(oxlintCapabilities)).toEqual(eslintConfigProducers);
    expect(publicCapabilities).toBe(oxlintCapabilities);
  });

  it("records an explicit support boundary and limitation for every producer", () => {
    const supportedKinds = ["native", "js-plugin", "mixed", "unsupported"];
    const defaultKinds = ["always", "enabled", "disabled", "detected"];

    for (const capability of Object.values(oxlintCapabilities)) {
      expect(supportedKinds).toContain(capability.support);
      expect(defaultKinds).toContain(capability.eslintDefault);
      expect(capability.limitations.length).toBeGreaterThan(0);
      expect(new Set(capability.runtimePackages).size).toBe(
        capability.runtimePackages.length,
      );
    }
  });

  it("makes every auto-detection trigger machine-readable", () => {
    for (const capability of Object.values(oxlintCapabilities)) {
      if (capability.eslintDefault === "detected") {
        expect(capability.detection.kind).not.toBe("none");
      } else {
        expect(capability.detection).toEqual({ kind: "none" });
      }
    }
  });

  it("identifies custom-parser and processor integrations as partial or unsupported", () => {
    expect(oxlintCapabilities.vue.support).toBe("mixed");
    expect(oxlintCapabilities.angular.support).toBe("mixed");

    for (const producer of [
      "svelte",
      "astro",
      "jsonc",
      "sortPackageJson",
      "sortTsconfig",
      "pnpm",
      "yaml",
      "toml",
      "markdown",
      "formatters",
    ] as const) {
      expect(oxlintCapabilities[producer].support).toBe("unsupported");
      expect(oxlintCapabilities[producer].runtimePackages).toEqual([]);
    }
  });

  it("publishes the packages required by type-aware and JavaScript-plugin coverage", () => {
    expect(oxlintCapabilities.typescript).toMatchObject({
      support: "mixed",
      runtimePackages: expect.arrayContaining([
        "oxlint-tsgolint",
        "@typescript-eslint/eslint-plugin",
        "eslint-plugin-erasable-syntax-only",
      ]),
    });
    expect(oxlintCapabilities.typescript.runtimePackages).not.toContain(
      "eslint-plugin-sort-destructure-keys-typescript",
    );
    expect(oxlintCapabilities.jsx).toMatchObject({
      support: "mixed",
      runtimePackages: ["@stylistic/eslint-plugin"],
    });
    expect(oxlintCapabilities.react).toMatchObject({
      support: "mixed",
      runtimePackages: expect.arrayContaining([
        "@eslint-react/eslint-plugin",
        "@stylistic/eslint-plugin",
        "eslint-plugin-react-you-might-not-need-an-effect",
      ]),
    });
    expect(oxlintCapabilities.react.runtimePackages).not.toContain(
      "eslint-plugin-classname-components",
    );
    expect(oxlintCapabilities.solid).toMatchObject({
      support: "js-plugin",
      runtimePackages: ["@eslint-react/eslint-plugin", "eslint-plugin-solid"],
    });
    expect(oxlintCapabilities.command).toMatchObject({
      support: "js-plugin",
      runtimePackages: ["eslint-plugin-command"],
    });
    expect(oxlintCapabilities.angular).toMatchObject({
      support: "mixed",
      runtimePackages: ["@angular-eslint/eslint-plugin"],
    });
    expect(oxlintCapabilities.i18n).toMatchObject({
      support: "mixed",
      runtimePackages: ["eslint-plugin-i18next"],
    });
    expect(oxlintCapabilities.storybook).toMatchObject({
      support: "js-plugin",
      runtimePackages: ["eslint-plugin-storybook"],
    });
    expect(oxlintCapabilities.stylistic.runtimePackages).toEqual([
      "@stylistic/eslint-plugin",
      "eslint-plugin-antfu",
    ]);
    expect(oxlintCapabilities.test.runtimePackages).toEqual([
      "eslint-plugin-antfu",
      "eslint-plugin-n",
      "eslint-plugin-no-only-tests",
    ]);
    expect(oxlintCapabilities.vue.runtimePackages).toEqual([
      "eslint-plugin-antfu",
      "eslint-plugin-n",
      "eslint-plugin-vue",
    ]);
  });

  it("publishes aliased fallbacks for native-reserved plugin prefixes", () => {
    expect(oxlintCapabilities.node).toMatchObject({
      support: "mixed",
      runtimePackages: ["eslint-plugin-n"],
    });
    expect(oxlintCapabilities.unicorn).toMatchObject({
      support: "mixed",
      runtimePackages: ["eslint-plugin-unicorn"],
    });
    expect(oxlintCapabilities.nextjs).toMatchObject({
      support: "mixed",
      runtimePackages: ["@next/eslint-plugin-next"],
    });
    expect(oxlintCapabilities.jsdoc).toMatchObject({
      support: "mixed",
      runtimePackages: ["eslint-plugin-jsdoc"],
    });
  });
});
