import { describe, expect, it } from "vitest";
import { antiSlop } from "../src/configs/anti-slop";
import { nirtamir2 } from "../src/factory";
import { GLOB_SRC } from "../src/globs";
import index from "../src/oxlint-plugins/anti-slop/index.ts";
import { antiSlopRuleNames } from "../src/oxlint-plugins/anti-slop-rule-names";
import { createOxlintConfig } from "../src/oxlint/factory";
import {
  ANTI_SLOP_PLUGIN_NAME,
  createAntiSlopConfig,
  resolveAntiSlopSpecifier,
} from "../src/oxlint/anti-slop";

const antiSlopPlugin = index;
const compareNames = (left: string, right: string) => left.localeCompare(right);
const environment = { hasPackage: () => false, isInEditor: false };

describe("vendored anti-slop plugin", () => {
  it("registers under the name both linters reference", () => {
    expect(antiSlopPlugin.meta?.name).toBe(ANTI_SLOP_PLUGIN_NAME);
  });

  it("matches the shared rule-name list", () => {
    // Guards against an upstream re-sync silently adding or dropping a rule.
    expect(Object.keys(antiSlopPlugin.rules).toSorted(compareNames)).toEqual(
      antiSlopRuleNames.toSorted(compareNames),
    );
  });

  it("exposes ESLint-compatible and Oxlint-native entry points", () => {
    for (const rule of Object.values(antiSlopPlugin.rules)) {
      // `create` comes from the plugin's own eslintCompatPlugin wrapper; `createOnce`
      // is the Oxlint-native entry point the rules are actually authored against.
      expect(rule).toHaveProperty("create", expect.any(Function));
      expect(rule).toHaveProperty("createOnce", expect.any(Function));
    }
  });

  it("resolves to a plugin file that exists on disk", () => {
    expect(resolveAntiSlopSpecifier()).toMatch(/anti-slop/u);
  });
});

describe("oxlint anti-slop fragment", () => {
  it("is absent unless requested", () => {
    const config = createOxlintConfig({}, [], environment);
    expect(config.jsPlugins).toBeUndefined();
    expect(Object.keys(config.rules ?? {})).not.toContain(
      "anti-slop/no-reflect-get",
    );
  });

  it("registers the JS plugin and every rule when enabled", () => {
    const config = createOxlintConfig({ antiSlop: true }, [], environment);
    expect(config.jsPlugins).toEqual([
      { name: "anti-slop", specifier: resolveAntiSlopSpecifier() },
    ]);

    const enabled = Object.entries(config.rules ?? {}).filter(([rule]) =>
      rule.startsWith("anti-slop/"),
    );
    expect(enabled).toHaveLength(antiSlopRuleNames.length);
    expect(enabled.every(([, level]) => level === "error")).toBe(true);
  });

  it("downgrades every rule with level: warn", () => {
    const config = createAntiSlopConfig({ level: "warn" });
    expect(config.rules?.["anti-slop/no-reflect-get"]).toBe("warn");
  });

  it("applies overrides after the defaults", () => {
    const config = createAntiSlopConfig({
      overrides: { "anti-slop/no-runtime-typeof": "off" },
    });
    expect(config.rules?.["anti-slop/no-runtime-typeof"]).toBe("off");
    expect(config.rules?.["anti-slop/no-reflect-get"]).toBe("error");
  });

  it("passes a user specifier through untouched", () => {
    const config = createAntiSlopConfig({
      specifier: "./tools/oxlint/anti-slop/index.ts",
    });
    expect(config.jsPlugins).toEqual([
      { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
    ]);
  });

  it("lets trailing user configs win over anti-slop rules", () => {
    const config = createOxlintConfig(
      { antiSlop: true },
      [{ rules: { "anti-slop/no-object-parameters": "off" } }],
      environment,
    );
    expect(config.rules?.["anti-slop/no-object-parameters"]).toBe("off");
  });

  it("rejects malformed options", () => {
    expect(() =>
      // SAFETY: the cast is the point of the test — it feeds deliberately invalid
    // input past the compiler so the runtime validator can be exercised.
      createOxlintConfig({ antiSlop: { nope: true } } as never, [], environment),
    ).toThrow('Unsupported Oxlint option "antiSlop.nope"');
    expect(() =>
      createOxlintConfig(
        // SAFETY: the cast is the point of the test — it feeds deliberately invalid
    // input past the compiler so the runtime validator can be exercised.
        { antiSlop: { level: "info" } } as never,
        [],
        environment,
      ),
    ).toThrow('Oxlint option "antiSlop.level" must be "error" or "warn"');
    expect(() =>
      createOxlintConfig(
        // SAFETY: the cast is the point of the test — it feeds deliberately invalid
    // input past the compiler so the runtime validator can be exercised.
        { antiSlop: { specifier: 5 } } as never,
        [],
        environment,
      ),
    ).toThrow('Oxlint option "antiSlop.specifier" must be a string');
  });
});

describe("eslint anti-slop config", () => {
  it("is absent from the default factory output", async () => {
    const configs = await nirtamir2({});
    expect(
      configs.some((config) => config.name?.includes("anti-slop")),
    ).toBe(false);
  });

  it("registers the plugin and rules when enabled", async () => {
    const configs = await nirtamir2({ antiSlop: true });
    const names = configs
      .map((config) => config.name)
      .filter((name) => name?.includes("anti-slop"));
    expect(names).toEqual([
      "nirtamir2/anti-slop/setup",
      "nirtamir2/anti-slop/rules",
    ]);

    const setup = configs.find(
      (config) => config.name === "nirtamir2/anti-slop/setup",
    );
    expect(Object.keys(setup?.plugins ?? {})).toEqual(["anti-slop"]);

    const rules = configs.find(
      (config) => config.name === "nirtamir2/anti-slop/rules",
    );
    expect(rules?.files).toEqual([GLOB_SRC]);
    expect(Object.keys(rules?.rules ?? {})).toHaveLength(
      antiSlopRuleNames.length,
    );
  });

  it("honours level and overrides", async () => {
    const [, rules] = await antiSlop({
      level: "warn",
      overrides: { "anti-slop/no-reflect-get": "off" },
    });
    expect(rules?.rules?.["anti-slop/no-runtime-typeof"]).toBe("warn");
    expect(rules?.rules?.["anti-slop/no-reflect-get"]).toBe("off");
  });
});
