import { describe, expect, it } from "vitest";
import { defaultImportName } from "../src/configs/default-import-name";
import { nextjs } from "../src/configs/nextjs";
import { react } from "../src/configs/react";
import { zod } from "../src/configs/zod";

describe("custom config blocks", () => {
  it("includes the default-import-name preset", async () => {
    const [config] = await defaultImportName();

    expect(config.name).toBe("eslint-plugin-default-import-name");
    expect(config.plugins).toHaveProperty("eslint-plugin-default-import-name");
    expect(config.rules).toMatchObject({
      "eslint-plugin-default-import-name/default-import-name": "warn",
    });
  });

  it("adds the Next.js middleware override", async () => {
    const configs = await nextjs();
    const middlewareConfig = configs.find(
      (config) => config.name === "nirtamir2/next/middleware",
    );

    expect(middlewareConfig).toBeDefined();
    expect(middlewareConfig?.files).toEqual(["**/src/middleware.ts"]);
    expect(middlewareConfig?.rules).toMatchObject({
      "unicorn/prefer-string-raw": "off",
    });
  });

  it("enables the zod namespace rule on JS and TS sources", async () => {
    const [config] = await zod();

    expect(config.name).toBe("nirtamir2/zod/setup");
    expect(config.files).toEqual([
      "**/*.?([cm])js",
      "**/*.?([cm])ts",
      "**/*.?([cm])jsx",
      "**/*.?([cm])tsx",
    ]);
    expect(config.rules).toMatchObject({
      "import-zod/prefer-zod-namespace": "error",
    });
  });

  it("adds classname-components only for type-aware React TSX rules", async () => {
    const withoutTypes = await react();
    const withoutTypesConfig = withoutTypes.find(
      (config) => config.name === "nirtamir2/react/classname-components",
    );

    expect(withoutTypesConfig).toBeUndefined();

    const withTypes = await react({ tsconfigPath: "tsconfig.json" });
    const withTypesConfig = withTypes.find(
      (config) => config.name === "nirtamir2/react/classname-components",
    );

    expect(withTypesConfig).toBeDefined();
    expect(withTypesConfig?.plugins).toHaveProperty(
      "eslint-plugin-classname-components",
    );
    expect(withTypesConfig?.rules).toMatchObject({
      "eslint-plugin-classname-components/no-classname-prop-in-styled-components":
        "error",
      "eslint-plugin-classname-components/no-classname-prop-merge-in-styled-components":
        "error",
      "eslint-plugin-classname-components/prefer-plain-props-parameter":
        "error",
      "eslint-plugin-classname-components/prefer-static-classname-in-styled-components":
        "error",
    });
  });
});
