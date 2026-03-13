import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      "**/.temp/**",
      "**/_fixtures/**",
      "**/stuff/**",
    ],
    testTimeout: 60_000,
  },
});
