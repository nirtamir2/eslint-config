import oxlint from "@nirtamir2/eslint-config/oxlint";

export default oxlint(
  {
    e18e: true,
    jsdoc: false,
    jsx: false,
    nextjs: false,
    react: false,
    test: false,
    typescript: false,
    unicorn: false,
    vue: false,
  },
  {
    rules: {
      "no-debugger": "error",
    },
  },
);
