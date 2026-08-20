import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
    oxlint: "src/oxlint.ts",
    // Oxlint loads this file itself, so it must stay a separate compiled entry
    // rather than being inlined into the `oxlint` bundle.
    "oxlint-anti-slop": "src/oxlint-plugins/anti-slop/index.ts",
  },
  shims: true,
  format: ["esm"],
  exports: true,
});
