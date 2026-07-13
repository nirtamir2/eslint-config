import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  diffOxlintArtifacts,
  formatOxlintArtifactDiff,
  hasOxlintArtifactDiff,
  renderOxlintArtifacts,
  writeOxlintArtifacts,
} from "./oxlint/generate";

const root = fileURLToPath(new URL("..", import.meta.url));
const rendered = await renderOxlintArtifacts();

if (process.argv.includes("--check")) {
  const diff = await diffOxlintArtifacts(root, rendered);
  if (hasOxlintArtifactDiff(diff)) {
    console.error(formatOxlintArtifactDiff(diff));
    process.exitCode = 1;
  } else {
    console.log("Generated Oxlint artifacts are up to date.");
  }
} else {
  await writeOxlintArtifacts(root, rendered);
  console.log(`Generated ${rendered.size} Oxlint artifacts.`);
}
