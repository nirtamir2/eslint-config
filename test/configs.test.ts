import { describe, expect, it } from "vitest";
import { angular } from "../src/configs/angular";
import { defaultImportName } from "../src/configs/default-import-name";
import { nextjs } from "../src/configs/nextjs";
import { react } from "../src/configs/react";
import { solid } from "../src/configs/solid";
import { svelte } from "../src/configs/svelte";
import { zod } from "../src/configs/zod";

describe("custom config blocks", () => {
  it("adopts Angular 22 recommended rules from plugin metadata", async () => {
    const configs = await angular();
    const typescriptConfig = configs.find(
      (config) => config.name === "antfu/angular/rules/ts",
    );
    const templateConfig = configs.find(
      (config) => config.name === "antfu/angular/rules/template",
    );

    expect(typescriptConfig?.rules).toMatchObject({
      "@angular-eslint/prefer-on-push-component-change-detection": "error",
    });
    expect(templateConfig?.rules).toMatchObject({
      "@angular-eslint/template/prefer-control-flow": "error",
    });
  });

  it("adopts the current Svelte recommended preset", async () => {
    const configs = await svelte();
    const rulesConfig = configs.find(
      (config) => config.name === "antfu/svelte/rules",
    );

    expect(rulesConfig?.rules).toMatchObject({
      "svelte/infinite-reactive-loop": "error",
      "svelte/no-unnecessary-state-wrap": "error",
      "svelte/require-event-dispatcher-types": "error",
    });
  });

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
    expect(withTypesConfig?.languageOptions?.parser).toBeDefined();
    expect(withTypesConfig?.languageOptions?.parserOptions).toMatchObject({
      project: ["tsconfig.json"],
    });
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

  it("applies the Solid 2.0 preset and type-aware classname-components", async () => {
    const withoutTypes = await solid({ typescript: true });
    const withoutTypesSetup = withoutTypes.find(
      (config) => config.name === "antfu/solid/setup",
    );
    const withoutTypesRules = withoutTypes.find(
      (config) => config.name === "antfu/solid/rules",
    );
    const withoutTypesClassname = withoutTypes.find(
      (config) => config.name === "nirtamir2/solid/classname-components",
    );

    expect(withoutTypesSetup?.settings).toMatchObject({
      solid: { version: 2 },
    });
    expect(withoutTypesRules?.rules).toMatchObject({
      "solid/no-accessor-as-prop": 2,
      "solid/no-browser-globals-in-server-function": 2,
      "solid/no-invalid-server-capture": 2,
      "solid/no-react-deps": 0,
      "solid/no-single-arg-create-effect": 2,
      "solid/prefer-classlist": 0,
      "solid/prefer-structured-class": 1,
      "solid/removed-api": 2,
      "solid/require-async-server-function": 2,
      "solid/valid-use-server": 2,
    });
    expect(withoutTypesClassname).toBeUndefined();
    expect(
      withoutTypes.find((config) => config.name === "nirtamir2/solid/jsx-style")
        ?.rules,
    ).toMatchObject({
      "@stylistic/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never" },
      ],
    });
    expect(
      withoutTypes.find(
        (config) => config.name === "nirtamir2/solid/typescript-disables",
      )?.files,
    ).toEqual(["**/*.?([cm])jsx", "**/*.?([cm])tsx"]);

    const withTypes = await solid({
      tsconfigPath: "tsconfig.json",
      typescript: true,
    });
    const withTypesClassname = withTypes.find(
      (config) => config.name === "nirtamir2/solid/classname-components",
    );

    expect(withTypesClassname).toBeDefined();
    expect(withTypesClassname?.plugins).toHaveProperty(
      "eslint-plugin-classname-components",
    );
    expect(withTypesClassname?.languageOptions?.parser).toBeDefined();
    expect(withTypesClassname?.languageOptions?.parserOptions).toMatchObject({
      project: ["tsconfig.json"],
    });
    expect(withTypesClassname?.rules).toMatchObject({
      "eslint-plugin-classname-components/no-classname-prop-in-styled-components":
        "error",
      "eslint-plugin-classname-components/no-classname-prop-merge-in-styled-components":
        "error",
      "eslint-plugin-classname-components/prefer-plain-props-parameter":
        "error",
      "eslint-plugin-classname-components/prefer-static-classname-in-styled-components":
        "error",
    });

    expect(
      withoutTypes.some((config) => config.plugins?.["@eslint-react"]),
    ).toBe(false);
    expect(
      withoutTypes.some(
        (config) => config.name === "nirtamir2/solid/react-rules-off",
      ),
    ).toBe(false);

    const withReact = await solid({ react: true, typescript: true });
    const reactDisables = withReact.find(
      (config) => config.name === "nirtamir2/solid/react-rules-off",
    );
    expect(
      withReact.some((config) => config.name === "nirtamir2/solid/jsx-style"),
    ).toBe(false);
    expect(reactDisables?.rules).toMatchObject({
      "@eslint-react/no-unstable-context-value": "off",
      "react-refresh/only-export-components": "off",
      "react/jsx-no-constructed-context-values": "off",
      "react/no-unknown-property": "off",
    });
    expect(reactDisables?.files).toEqual(["**/*.?([cm])jsx", "**/*.?([cm])tsx"]);
  });
});
