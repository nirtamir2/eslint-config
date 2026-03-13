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
      files: ["**/*.tsx"],
      languageOptions: {
        parserOptions: {
          project: false,
          projectService: false,
        },
      },
      rules: {
        "import-x/no-unresolved": "off",
        "workspaces/require-dependency": "off",
      },
    },
  );

  return new ESLint({
    overrideConfig: configs as any,
    overrideConfigFile: true,
  });
}

describe("clsx rules", () => {
  it("reports array expressions inside clsx for React components", async () => {
    const eslint = await createESLint();
    const code = `
      import clsx from "clsx";

      interface ButtonProps {
        active: boolean;
      }

      export function Button({ active }: ButtonProps) {
        return <div className={clsx(["btn", active && "btn-active"])} />;
      }
    `;

    const [result] = await eslint.lintText(code, { filePath: "Button.tsx" });
    const ruleIds = result.messages.map((message) => message.ruleId);

    expect(ruleIds).toContain("clsx/forbid-array-expressions");
  });

  it("allows standard clsx usage for React components", async () => {
    const eslint = await createESLint();
    const code = `
      import clsx from "clsx";

      interface ButtonProps {
        active: boolean;
      }

      export function Button({ active }: ButtonProps) {
        return <div className={clsx("btn", active && "btn-active")} />;
      }
    `;

    const [result] = await eslint.lintText(code, { filePath: "Button.tsx" });
    const clsxMessages = result.messages.filter((message) =>
      message.ruleId?.startsWith("clsx/"),
    );

    expect(clsxMessages).toHaveLength(0);
  });
});
