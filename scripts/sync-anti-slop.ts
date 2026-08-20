/**
 * Re-vendor the anti-slop Oxlint plugin from upstream.
 *
 * Maintainer tool, deliberately kept out of CI: it needs network access, and the
 * vendored tree is reviewed by hand before it lands. Pass a ref to pin a different
 * commit, tag or branch:
 *
 * ```bash
 * pnpm sync:anti-slop            # re-fetch the ref recorded in UPSTREAM.md
 * pnpm sync:anti-slop main       # follow upstream main
 * pnpm sync:anti-slop <sha>      # pin an explicit commit
 * ```
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { antiSlopRuleNames } from "../src/oxlint-plugins/anti-slop-rule-names";

const repository = "dmmulroy/anti-slop";
const vendorRoot = fileURLToPath(
  new URL("../src/oxlint-plugins/anti-slop/", import.meta.url),
);
const upstreamDocPath = path.join(vendorRoot, "UPSTREAM.md");
const refPattern = /^\| Upstream ref \| `(?<ref>[^`]+)` \|$/mu;

const requestedRef = process.argv[2] ?? (await readRecordedRef());
const commitSha = await resolveCommitSha(requestedRef);

const files = [
  "LICENSE",
  "src/index.ts",
  ...antiSlopRuleNames.map((ruleName) => `src/rules/${ruleName}.ts`),
  "src/shared/dictionary-types.ts",
  "src/shared/lexical-type-parameters.ts",
  "src/shared/reflect-method.ts",
];

for (const file of files) {
  const contents = await fetchFile(commitSha, file);
  const target = path.join(
    vendorRoot,
    file === "LICENSE" ? "LICENSE" : file.slice("src/".length),
  );
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents);
  process.stdout.write(`  ${path.relative(vendorRoot, target)}\n`);
}

await recordRef(commitSha);

process.stdout.write(
  `\nVendored ${files.length} files from ${repository}@${commitSha}.\n` +
    "Review the diff, then run `pnpm test` — test/anti-slop.test.ts fails if the rule\n" +
    "set no longer matches src/oxlint-plugins/anti-slop-rule-names.ts.\n",
);

async function fetchFile(ref: string, file: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${repository}/${ref}/${file}`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return await response.text();
}

async function resolveCommitSha(ref: string): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/commits/${ref}`,
    { headers: { accept: "application/vnd.github+json" } },
  );
  if (!response.ok)
    throw new Error(`Failed to resolve ${repository}@${ref}: ${response.status}`);
  const commit = await response.json();
  // SAFETY: the GitHub commits endpoint always returns a `sha` string on success.
  const { sha } = commit as { sha: string };
  return sha;
}

async function readRecordedRef(): Promise<string> {
  const doc = await fs.readFile(upstreamDocPath, "utf8");
  const ref = refPattern.exec(doc)?.groups?.ref;
  if (ref == null)
    throw new Error(`No upstream ref recorded in ${upstreamDocPath}`);
  return ref;
}

async function recordRef(sha: string): Promise<void> {
  const doc = await fs.readFile(upstreamDocPath, "utf8");
  await fs.writeFile(
    upstreamDocPath,
    doc.replace(refPattern, () => `| Upstream ref | \`${sha}\` |`),
  );
}
