import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      "**/.temp/**",
      "**/_fixtures/**",
      "**/stuff/**",
    ],
    maxWorkers: 2,
    maxConcurrency: 2,
    testTimeout: 60_000,
  },
});
