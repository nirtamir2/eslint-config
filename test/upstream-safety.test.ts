import { describe, expect, it } from "vitest";
import { e18e } from "../src/configs/e18e";
import { unicorn } from "../src/configs/unicorn";
import { GLOB_SRC } from "../src/globs";

describe("upstream safety backports", () => {
  it("disables e18e copy-on-write and spread rewrites by default", async () => {
    const [config] = await e18e();

    expect(config.rules).toMatchObject({
      "e18e/prefer-array-to-reversed": "off",
      "e18e/prefer-array-to-sorted": "off",
      "e18e/prefer-array-to-spliced": "off",
      "e18e/prefer-spread-syntax": "off",
    });
  });

  it("disables behavior-changing e18e array rewrites by default", async () => {
    const [config] = await e18e();

    expect(config.rules).toMatchObject({
      "e18e/prefer-array-at": "off",
      "e18e/prefer-array-from-map": "off",
    });
  });

  it("disables static-regex rewrites for apps but keeps them for libraries", async () => {
    const [[appConfig], [libraryConfig]] = await Promise.all([
      e18e({ type: "app" }),
      e18e({ type: "lib" }),
    ]);

    expect(appConfig.rules?.["e18e/prefer-static-regex"]).toBe("off");
    expect(libraryConfig.rules?.["e18e/prefer-static-regex"]).not.toBe("off");
  });

  it("scopes Unicorn rules to source files while registering the plugin globally", async () => {
    const configs = await unicorn();
    const setupConfig = configs.find((config) => config.plugins?.unicorn);
    const rulesConfig = configs.find(
      (config) => config.rules?.["unicorn/error-message"],
    );

    expect(setupConfig).toBeDefined();
    expect(setupConfig?.files).toBeUndefined();
    expect(setupConfig?.rules).toBeUndefined();
    expect(rulesConfig).toBeDefined();
    expect(rulesConfig?.files).toEqual([GLOB_SRC]);
    expect(rulesConfig?.plugins).toBeUndefined();
  });
});
