import type { StylisticConfig } from "../src/types";
import { describe, expect, it } from "vitest";
import { ignores } from "../src/configs/ignores";
import { stylistic } from "../src/configs/stylistic";
import { vue } from "../src/configs/vue";
import { nirtamir2 } from "../src/factory";

describe("compatible upstream options", () => {
  it("keeps Perfectionist opt-in while allowing rule overrides", async () => {
    const defaultConfigs = await nirtamir2();
    expect(
      defaultConfigs.some(
        (config) => config.name === "antfu/perfectionist/setup",
      ),
    ).toBe(false);

    const options = {
      perfectionist: {
        overrides: {
          "perfectionist/sort-imports": "off",
        },
      },
    } satisfies NonNullable<Parameters<typeof nirtamir2>[0]>;
    const configured = await nirtamir2(options);
    const perfectionistConfig = configured.find(
      (config) => config.name === "antfu/perfectionist/setup",
    );

    expect(perfectionistConfig?.rules?.["perfectionist/sort-imports"]).toBe(
      "off",
    );
  });

  it("passes braceStyle through Stylistic and Vue without changing the default", async () => {
    const allman: StylisticConfig = { braceStyle: "allman" };
    const [defaultStylistic] = await stylistic();
    const [allmanStylistic] = await stylistic(allman);
    const vueConfigs = await vue({ stylistic: allman });
    const vueRules = vueConfigs.find(
      (config) => config.rules?.["vue/brace-style"],
    );

    expect(defaultStylistic.rules?.["style/brace-style"]).toEqual([
      "error",
      "stroustrup",
      { allowSingleLine: true },
    ]);
    expect(allmanStylistic.rules?.["style/brace-style"]).toEqual([
      "error",
      "allman",
      { allowSingleLine: true },
    ]);
    expect(vueRules?.rules?.["vue/brace-style"]).toEqual([
      "error",
      "allman",
      { allowSingleLine: true },
    ]);
  });

  it("adds AI working directories without dropping fork-specific ignores", async () => {
    const [config] = await ignores();

    expect(config.ignores).toEqual(
      expect.arrayContaining([
        "**/.context",
        "**/.claude",
        "**/.agents",
        "**/.*/skills",
        "**/routeTree.gen.ts",
      ]),
    );
  });
});
