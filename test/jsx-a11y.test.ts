import fs from "node:fs/promises";
import { resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { nirtamir2 } from "../src";

describe("react a11y rules", () => {
  type FactoryOptions = NonNullable<Parameters<typeof nirtamir2>[0]>;

  const createESLint = async (options: FactoryOptions = {}) => {
    const configs = await nirtamir2({
      formatters: false,
      nextjs: false,
      react: true,
      stylistic: false,
      typescript: false,
      ...options,
    });

    return new ESLint({
      overrideConfig: configs as any,
      overrideConfigFile: true,
    });
  };

  const readFixture = async (filePath: string) => {
    return await fs.readFile(resolve("fixtures", filePath), "utf8");
  };

  it("includes jsx-a11y rules for react files", async () => {
    const eslint = await createESLint();
    const config = await eslint.calculateConfigForFile("component.jsx");

    expect(config.rules).toHaveProperty("jsx-a11y/alt-text");
    expect(config.rules).toHaveProperty("jsx-a11y/aria-props");
  });

  it("allows valid accessible JSX", async () => {
    const eslint = await createESLint();
    const code = await readFixture("jsx-a11y-valid/accessible-elements.jsx");

    const [result] = await eslint.lintText(code, { filePath: "test.jsx" });
    const a11yMessages = result.messages.filter((message) =>
      message.ruleId?.startsWith("jsx-a11y/"),
    );

    expect(a11yMessages).toHaveLength(0);
  });

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
