export const vuePackages = ["vue", "nuxt", "vitepress", "@slidev/cli"] as const;

export const sharedFeatureOrder = [
  "unicorn",
  "jsx",
  "typescript",
  "test",
  "vue",
  "react",
  "nextjs",
  "jsdoc",
] as const;

export type SharedFeature = (typeof sharedFeatureOrder)[number];

export interface SharedFeatureInput {
  isInEditor?: boolean;
  jsdoc?: unknown;
  jsx?: boolean;
  nextjs?: unknown;
  react?: unknown;
  test?: unknown;
  type?: "app" | "lib";
  typescript?: unknown;
  unicorn?: unknown;
  vue?: unknown;
}

export interface FeatureEnvironment {
  isInEditor: boolean;
  hasPackage: (name: string) => boolean;
}

export interface SharedFeaturePlan {
  enabled: Readonly<Record<SharedFeature, boolean>>;
  isInEditor: boolean;
  orderedFeatures: ReadonlyArray<SharedFeature>;
  type: "app" | "lib";
}

/**
 * Resolve a feature switch that a user may write as a boolean or as a sub-options object.
 *
 * Generic over the caller's own option type so each feature keeps its declared shape
 * instead of being widened at this boundary.
 */
function resolveEnabled<TOption>(option: TOption, fallback: boolean): boolean {
  if (option == null) return fallback;
  return !Object.is(option, false);
}

export function resolveSharedFeaturePlan(
  input: SharedFeatureInput,
  environment: FeatureEnvironment,
): SharedFeaturePlan {
  // SAFETY: one entry is built per feature name, so the record covers every key.
  const enabled = Object.fromEntries([
    ["unicorn", resolveEnabled(input.unicorn, true)],
    ["jsx", resolveEnabled(input.jsx, true)],
    [
      "typescript",
      resolveEnabled(
        input.typescript,
        environment.hasPackage("typescript"),
      ),
    ],
    ["test", resolveEnabled(input.test, true)],
    [
      "vue",
      resolveEnabled(
        input.vue,
        vuePackages.some((name) => environment.hasPackage(name)),
      ),
    ],
    ["react", resolveEnabled(input.react, false)],
    ["nextjs", resolveEnabled(input.nextjs, environment.hasPackage("next"))],
    ["jsdoc", resolveEnabled(input.jsdoc, false)],
  ] satisfies Array<[SharedFeature, boolean]>) as Record<
    SharedFeature,
    boolean
  >;

  return {
    enabled,
    isInEditor: input.isInEditor ?? environment.isInEditor,
    orderedFeatures: sharedFeatureOrder.filter((feature) => enabled[feature]),
    type: input.type ?? "app",
  };
}
