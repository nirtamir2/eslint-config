import { describe, expect, it } from "vitest";
import {
  resolveSharedFeaturePlan,
  sharedFeatureOrder,
} from "../src/feature-plan";

function environment(
  packages: Array<string> = [],
  isInEditor = false,
) {
  return {
    hasPackage: (name: string) => packages.includes(name),
    isInEditor,
  };
}

describe("resolveSharedFeaturePlan", () => {
  it("uses stable defaults without package detection", () => {
    const plan = resolveSharedFeaturePlan({}, environment());

    expect(plan).toEqual({
      enabled: {
        jsdoc: false,
        jsx: true,
        nextjs: false,
        react: false,
        test: true,
        typescript: false,
        unicorn: true,
        vue: false,
      },
      isInEditor: false,
      orderedFeatures: ["unicorn", "jsx", "test"],
      type: "app",
    });
  });

  it("detects only the integrations with existing package probes", () => {
    const plan = resolveSharedFeaturePlan(
      {},
      environment(["typescript", "next", "vitepress"], true),
    );

    expect(plan.enabled).toMatchObject({
      nextjs: true,
      react: false,
      typescript: true,
      vue: true,
    });
    expect(plan.isInEditor).toBe(true);
  });

  it("lets explicit booleans and option objects override detection", () => {
    const plan = resolveSharedFeaturePlan(
      {
        jsdoc: {},
        jsx: false,
        nextjs: false,
        react: { overrides: {} },
        test: false,
        type: "lib",
        typescript: false,
        unicorn: false,
        vue: false,
      },
      environment(["typescript", "next", "vue"]),
    );

    expect(plan.enabled).toEqual({
      jsdoc: true,
      jsx: false,
      nextjs: false,
      react: true,
      test: false,
      typescript: false,
      unicorn: false,
      vue: false,
    });
    expect(plan.orderedFeatures).toEqual(["react", "jsdoc"]);
    expect(plan.type).toBe("lib");
  });

  it("publishes the shared order as an immutable contract", () => {
    expect(sharedFeatureOrder).toEqual([
      "unicorn",
      "jsx",
      "typescript",
      "test",
      "vue",
      "react",
      "nextjs",
      "jsdoc",
    ]);
  });
});
