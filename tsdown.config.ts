import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/oxlint.ts"],
  shims: true,
  format: ["esm"],
  exports: true,
});
