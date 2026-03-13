import fs from "node:fs/promises";
import { resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { nirtamir2 } from "../src";

type FactoryOptions = NonNullable<Parameters<typeof nirtamir2>[0]>;

async function createESLint(options: FactoryOptions = {}) {
  const configs = await nirtamir2(
    {
      formatters: false,
      nextjs: false,
      react: true,
      stylistic: false,
      typescript: false,
      ...options,
    },
    {
      files: ["fixtures/jsx-a11y-{valid,errors}/**/*.{jsx,tsx}"],
      languageOptions: {
        parserOptions: {
          project: false,
          projectService: false,
        },
      },
    },
  );

  return new ESLint({
    overrideConfig: configs as any,
    overrideConfigFile: true,
  });
}

async function readFixture(filePath: string) {
  return await fs.readFile(resolve("fixtures", filePath), "utf8");
}

describe("react a11y rules", () => {
  it("includes jsx-a11y rules for react files", async () => {
    const eslint = await createESLint();
    const [jsxConfig, tsxConfig] = await Promise.all([
      eslint.calculateConfigForFile("component.jsx"),
      eslint.calculateConfigForFile("component.tsx"),
    ]);

    expect(jsxConfig.rules).toHaveProperty("jsx-a11y/alt-text");
    expect(jsxConfig.rules).toHaveProperty("jsx-a11y/aria-props");
    expect(tsxConfig.rules).toHaveProperty("jsx-a11y/alt-text");
    expect(tsxConfig.rules).toHaveProperty("jsx-a11y/aria-props");
  });

  it.each([
    ["jsx", "jsx-a11y-valid/accessible-elements.jsx", "test.jsx"],
    ["tsx", "jsx-a11y-valid/accessible-elements.tsx", "test.tsx"],
  ])("allows valid accessible %s", async (_extension, fixturePath) => {
    const eslint = await createESLint();
    const code = await readFixture(fixturePath);
    const fixtureFullPath = resolve("fixtures", fixturePath);

    const [result] = await eslint.lintText(code, { filePath: fixtureFullPath });
    const a11yMessages = result.messages.filter((message) =>
      message.ruleId?.startsWith("jsx-a11y/"),
    );

    expect(result.messages).toHaveLength(0);
    expect(a11yMessages).toHaveLength(0);
  });

  it.each([
    ["jsx", "jsx-a11y-errors/missing-alt-text.jsx", "test.jsx"],
    ["tsx", "jsx-a11y-errors/missing-alt-text.tsx", "test.tsx"],
  ])(
    "reports accessibility issues for %s fixtures",
    async (_extension, fixturePath) => {
      const eslint = await createESLint();
      const code = await readFixture(fixturePath);
      const fixtureFullPath = resolve("fixtures", fixturePath);

      const [result] = await eslint.lintText(code, { filePath: fixtureFullPath });
      const ruleIds = result.messages.map((message) => message.ruleId);

      expect(ruleIds).toContain("jsx-a11y/alt-text");
    },
  );

  it("respects react rule overrides from config options", async () => {
    const eslint = await createESLint({
      react: {
        overrides: {
          "react-refresh/only-export-components": "off",
        },
      },
    });
    const configs = await eslint.calculateConfigForFile("component.tsx");
    const reactRefreshRule = configs.rules["react-refresh/only-export-components"];

    expect(reactRefreshRule).toEqual([0]);
  });
});
