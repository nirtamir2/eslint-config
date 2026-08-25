import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import fs from "fs-extra";
import { afterAll, beforeEach, expect, it } from "vitest";

const CLI_PATH = fileURLToPath(new URL("../src/cli/index.ts", import.meta.url));
const genPath = fileURLToPath(new URL(`../.temp/${randomString()}`, import.meta.url));

function randomString() {
  // eslint-disable-next-line sonarjs/pseudo-random
  return Math.random().toString(36).slice(2);
}

async function run(
  parameters: Array<string> = [],
  environment = {
    SKIP_PROMPT: "1",
    NO_COLOR: "1",
  },
) {
  return await execa("pnpm", ["exec", "tsx", CLI_PATH, ...parameters], {
    cwd: genPath,
    env: {
      ...process.env,
      ...environment,
    },
  });
}

async function createMockDir() {
  await fs.rm(genPath, { recursive: true, force: true });
  await fs.ensureDir(genPath);

  await Promise.all([
    fs.writeFile(join(genPath, "package.json"), JSON.stringify({}, null, 2)),
    fs.writeFile(join(genPath, ".eslintrc.yml"), ""),
    fs.writeFile(join(genPath, ".eslintignore"), "some-path\nsome-file"),
    fs.writeFile(join(genPath, ".prettierc"), ""),
    fs.writeFile(join(genPath, ".prettierignore"), "some-path\nsome-file"),
  ]);
}

beforeEach(async () => {
  await createMockDir();
});
afterAll(async () => {
  await fs.rm(genPath, { recursive: true, force: true });
});

it("package.json updated", async () => {
  const { stdout } = await run();

  const packageContent: Record<string, any> = await fs.readJSON(
    join(genPath, "package.json"),
  );

  expect(JSON.stringify(packageContent.devDependencies)).toContain(
    "@nirtamir2/eslint-config",
  );
  expect(stdout).toContain("Changes wrote to package.json");
});

it("esm eslint.config.js", async () => {
  const packageContent = await fs.readFile(join(genPath, "package.json"), "utf8");
  await fs.writeFile(
    join(genPath, "package.json"),
    JSON.stringify({ ...JSON.parse(packageContent), type: "module" }, null, 2),
  );

  const { stdout } = await run();

  const eslintConfigContent = await fs.readFile(
    join(genPath, "eslint.config.js"),
    "utf8",
  );
  expect(eslintConfigContent.includes("export default")).toBeTruthy();
  expect(stdout).toContain("Created eslint.config.js");
});

it("ignores files added in eslint.config.js", async () => {
  const { stdout } = await run();

  const eslintConfigContent = (
    await fs.readFile(join(genPath, "eslint.config.mjs"), "utf8")
  ).replaceAll("\\", "/");

  expect(stdout).toContain("Created eslint.config.mjs");
  expect(eslintConfigContent).toMatchInlineSnapshot(`
      "import nirtamir2 from '@nirtamir2/eslint-config'

      export default nirtamir2({
        ignores: ["some-path","**/some-path/**","some-file","**/some-file/**"],
      })
      "
    `);
});

it("suggest remove unnecessary files", async () => {
  const { stdout } = await run();

  expect(stdout).toContain("You can now remove those files manually");
  expect(stdout).toContain(
    ".eslintignore, .eslintrc.yml, .prettierc, .prettierignore",
  );
});
