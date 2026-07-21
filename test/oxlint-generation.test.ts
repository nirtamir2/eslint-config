import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  diffOxlintArtifacts,
  normalizeOxlintArtifactPath,
  renderOxlintArtifacts,
  writeOxlintArtifacts,
} from "../scripts/oxlint/generate";
import { translateOxlintGlob } from "../scripts/oxlint/normalize";

const temporaryDirectories: Array<string> = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("oxlint artifact generation", () => {
  it("normalizes Windows artifact paths to committed POSIX paths", () => {
    expect(
      normalizeOxlintArtifactPath(
        String.raw`src\generated\oxlint\fragments.ts`,
      ),
    ).toBe("src/generated/oxlint/fragments.ts");
  });

  it("renders the same native-only artifacts twice", async () => {
    const first = await renderOxlintArtifacts();
    const second = await renderOxlintArtifacts();

    expect([...first]).toEqual([...second]);
    expect([...first.keys()]).toEqual([
      "src/generated/oxlint/compatibility-report.ts",
      "src/generated/oxlint/fragments.ts",
      "src/generated/oxlint/index.ts",
    ]);
    expect(first.get("src/generated/oxlint/fragments.ts")).not.toContain("?(");
  });

  it("records only generator toolchain versions and frozen React detection", async () => {
    const rendered = await renderOxlintArtifacts();
    const report = rendered.get(
      "src/generated/oxlint/compatibility-report.ts",
    );

    expect(report).toContain(
      "versions: { migrate: string; oxlint: string }",
    );
    expect(report).not.toContain("config: string");
    expect(report).not.toContain('"config":');
    expect(report).toContain('"id": "react-refresh-environment-detection"');
  });

  it("translates ESLint extglobs inside composed Oxlint file patterns", () => {
    expect(translateOxlintGlob("**/cli.?([cm])[jt]s?(x)")).toBe(
      "**/cli.{js,jsx,mjs,mjsx,cjs,cjsx,ts,tsx,mts,mtsx,cts,ctsx}",
    );
    expect(translateOxlintGlob("**/*.{test,spec}.ts?(x)")).toBe(
      "**/*.{test,spec}.{ts,tsx}",
    );
    expect(translateOxlintGlob("**/auto-import?(s).d.ts")).toBe(
      "**/{auto-import,auto-imports}.d.ts",
    );
  });

  it("matches the committed canonical artifacts", async () => {
    const rendered = await renderOxlintArtifacts();

    await expect(
      diffOxlintArtifacts(process.cwd(), rendered),
    ).resolves.toEqual({
      changed: [],
      missing: [],
      unexpected: [],
    });
  });

  it("reports changed, missing, and unexpected files without writing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "oxlint-generation-"));
    temporaryDirectories.push(root);
    const rendered = new Map([
      ["src/generated/oxlint/a.ts", "a\n"],
      ["src/generated/oxlint/b.ts", "b\n"],
    ]);

    await writeOxlintArtifacts(root, rendered);
    await fs.writeFile(
      path.join(root, "src/generated/oxlint/a.ts"),
      "changed\n",
    );
    await fs.rm(path.join(root, "src/generated/oxlint/b.ts"));
    await fs.writeFile(
      path.join(root, "src/generated/oxlint/unexpected.ts"),
      "unexpected\n",
    );

    await expect(diffOxlintArtifacts(root, rendered)).resolves.toEqual({
      changed: ["src/generated/oxlint/a.ts"],
      missing: ["src/generated/oxlint/b.ts"],
      unexpected: ["src/generated/oxlint/unexpected.ts"],
    });

    await expect(
      fs.readFile(path.join(root, "src/generated/oxlint/a.ts"), "utf8"),
    ).resolves.toBe("changed\n");
  });
});
