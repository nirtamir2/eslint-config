import process from "node:process";

export function isInGitHooksOrLintStaged(): boolean {
  return Boolean(
    process.env.GIT_PARAMS ||
      process.env.VSCODE_GIT_COMMAND ||
      process.env.npm_lifecycle_script?.startsWith("lint-staged"),
  );
}

export function isInEditorEnv(): boolean {
  if (process.env.CI || isInGitHooksOrLintStaged()) return false;
  return Boolean(
    process.env.VSCODE_PID ||
      process.env.VSCODE_CWD ||
      process.env.JETBRAINS_IDE ||
      process.env.VIM ||
      process.env.NVIM ||
      (process.env.ZED_ENVIRONMENT && !process.env.ZED_TERM),
  );
}
