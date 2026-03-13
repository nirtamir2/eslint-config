import type {
  OptionsIsInEditor,
  OptionsOverrides,
  TypedFlatConfigItem,
} from "../types";
import { fixupConfigRules } from "@eslint/compat";
import github from "eslint-plugin-github";
import sonarjs from "eslint-plugin-sonarjs";
import workspacesPlugin from "eslint-plugin-workspaces";
import globals from "globals";
import { compat } from "../compat";
import { GLOB_SRC, GLOB_SRC_EXT } from "../globs";
import {
  arrayFunc,
  eslintPluginNoUseExtendNative,
  pluginAntfu,
  pluginUnusedImports,
} from "../plugins";

export async function javascript(
  options: OptionsIsInEditor & OptionsOverrides = {},
): Promise<Array<TypedFlatConfigItem>> {
  const { isInEditor = false, overrides = {} } = options;

  return [
    {
      languageOptions: {
        ecmaVersion: "latest",
        globals: {
          ...globals.browser,
          ...globals.es2021,
          ...globals.node,
          document: "readonly",
          navigator: "readonly",
          window: "readonly",
        },
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          ecmaVersion: "latest",
          sourceType: "module",
        },
        sourceType: "module",
      },
      linterOptions: {
        reportUnusedDisableDirectives: true,
      },
      name: "antfu/javascript/setup",
    },
    {
      name: "antfu/javascript/rules",
      plugins: {
        antfu: pluginAntfu,
        "unused-imports": pluginUnusedImports,
        github,
      },
      rules: {
        "accessor-pairs": [
          "error",
          { enforceForClassMembers: true, setWithoutGet: true },
        ],

        "antfu/no-top-level-await": "error",
        "array-callback-return": "error",
        "block-scoped-var": "error",
        "constructor-super": "error",
        "default-case-last": "error",
        "dot-notation": ["error", { allowKeywords: true }],
        eqeqeq: ["error", "always", { null: "never" }],
        "func-style": ["error", "declaration", { allowArrowFunctions: true }],
        "max-params": "error",
        "new-cap": [
          "error",
          { capIsNew: false, newIsCap: true, properties: true },
        ],
        "no-alert": "error",
        "no-array-constructor": "error",
        "no-async-promise-executor": "error",
        "no-caller": "error",
        "no-case-declarations": "error",
        "no-class-assign": "error",
        "no-compare-neg-zero": "error",
        "no-cond-assign": ["error", "always"],
        "no-console": ["error", { allow: ["warn", "error"] }],
        "no-const-assign": "error",
        "no-constant-binary-expression": "error",
        "no-control-regex": "error",
        "no-debugger": "error",
        "no-delete-var": "error",
        "no-dupe-args": "error",
        "no-dupe-class-members": "error",
        "no-dupe-keys": "error",
        "no-duplicate-case": "error",
        "no-empty": ["error", { allowEmptyCatch: true }],
        "no-empty-character-class": "error",
        "no-empty-pattern": "error",
        "no-eval": "error",
        "no-ex-assign": "error",
        "no-extend-native": "error",
        "no-extra-bind": "error",
        "no-extra-boolean-cast": "error",
        "no-fallthrough": "error",
        "no-func-assign": "error",
        "no-global-assign": "error",
        "no-implicit-coercion": "error",
        "no-implied-eval": "error",
        "no-import-assign": "error",
        "no-invalid-regexp": "error",
        "no-irregular-whitespace": "error",
        "no-iterator": "error",
        "no-labels": ["error", { allowLoop: false, allowSwitch: false }],
        "no-lone-blocks": "error",
        "no-loss-of-precision": "error",
        "no-misleading-character-class": "error",
        "no-multi-str": "error",
        "no-new": "error",
        "no-new-func": "error",
        "no-new-native-nonconstructor": "error",
        "no-new-wrappers": "error",
        "no-obj-calls": "error",
        "no-octal": "error",
        "no-octal-escape": "error",
        "no-param-reassign": "off",
        "no-proto": "error",
        "no-prototype-builtins": "error",
        "no-redeclare": ["error", { builtinGlobals: false }],
        "no-regex-spaces": "error",
        "no-restricted-globals": [
          "error",
          { message: "Use `globalThis` instead.", name: "global" },
          { message: "Use `globalThis` instead.", name: "self" },
        ],
        "no-restricted-properties": [
          "error",
          {
            message:
              "Use `Object.getPrototypeOf` or `Object.setPrototypeOf` instead.",
            property: "__proto__",
          },
          {
            message: "Use `Object.defineProperty` instead.",
            property: "__defineGetter__",
          },
          {
            message: "Use `Object.defineProperty` instead.",
            property: "__defineSetter__",
          },
          {
            message: "Use `Object.getOwnPropertyDescriptor` instead.",
            property: "__lookupGetter__",
          },
          {
            message: "Use `Object.getOwnPropertyDescriptor` instead.",
            property: "__lookupSetter__",
          },
        ],
        "no-restricted-syntax": [
          "error",
          "DebuggerStatement",
          "LabeledStatement",
          "WithStatement",
          "TSEnumDeclaration[const=true]",
          "TSExportAssignment",
        ],
        "no-self-assign": ["error", { props: true }],
        "no-self-compare": "error",
        "no-sequences": "error",
        "no-shadow-restricted-names": "error",
        "no-sparse-arrays": "error",
        "no-template-curly-in-string": "error",
        "no-this-before-super": "error",
        "no-throw-literal": "error",
        "no-undef": "error",
        "no-undef-init": "error",
        "no-unexpected-multiline": "error",
        "no-unmodified-loop-condition": "error",
        "no-unneeded-ternary": ["error", { defaultAssignment: false }],
        "no-unreachable": "error",
        "no-unreachable-loop": "error",
        "no-unsafe-finally": "error",
        "no-unsafe-negation": "error",
        "no-unused-expressions": [
          "error",
          {
            allowShortCircuit: true,
            allowTaggedTemplates: true,
            allowTernary: true,
          },
        ],
        "no-unused-vars": [
          "error",
          {
            args: "none",
            caughtErrors: "none",
            ignoreRestSiblings: true,
            vars: "all",
          },
        ],
        "no-use-before-define": [
          "error",
          { classes: false, functions: false, variables: true },
        ],
        "no-useless-backreference": "error",
        "no-useless-call": "error",
        "no-useless-catch": "error",
        "no-useless-computed-key": "error",
        "no-useless-constructor": "error",
        "no-useless-rename": "error",
        "no-useless-return": "error",
        "no-var": "error",
        "no-with": "error",
        "object-shorthand": [
          "error",
          "always",
          {
            avoidQuotes: true,
            ignoreConstructors: false,
          },
        ],
        "one-var": ["error", { initialized: "never" }],
        "prefer-arrow-callback": [
          "error",
          {
            allowNamedFunctions: false,
            allowUnboundThis: true,
          },
        ],
        "prefer-const": [
          isInEditor ? "warn" : "error",
          {
            destructuring: "any",
            ignoreReadBeforeAssign: true,
          },
        ],
        "prefer-destructuring": ["error", { object: true, array: false }],
        "prefer-exponentiation-operator": "error",
        "prefer-promise-reject-errors": "error",
        "prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],
        "prefer-rest-params": "error",
        "prefer-spread": "error",
        "prefer-template": "error",
        "sort-imports": [
          "error",
          {
            allowSeparatedGroups: false,
            ignoreCase: false,
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
            memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
          },
        ],
        "symbol-description": "error",
        "unicode-bom": ["error", "never"],
        "unused-imports/no-unused-imports": isInEditor ? "warn" : "error",
        "unused-imports/no-unused-vars": [
          "error",
          {
            args: "after-used",
            argsIgnorePattern: "^_",
            ignoreRestSiblings: true,
            vars: "all",
            varsIgnorePattern: "^_",
          },
        ],
        "use-isnan": [
          "error",
          { enforceForIndexOf: true, enforceForSwitchCase: true },
        ],
        "valid-typeof": ["error", { requireStringLiterals: true }],
        "vars-on-top": "error",
        yoda: ["error", "never"],

        // GitHub plugin rules
        "github/array-foreach": 2,
        "github/async-currenttarget": 2,
        "github/async-preventdefault": 2,
        "github/authenticity-token": 2,
        "github/get-attribute": 2,
        "github/js-class-name": 2,
        "github/no-blur": 2,
        "github/no-d-none": 2,
        "github/no-dataset": 2,
        "github/no-implicit-buggy-globals": 2,
        "github/no-inner-html": 2,
        "github/no-innerText": 2,
        "github/no-dynamic-script-tag": 2,
        "github/no-then": 2,
        "github/no-useless-passive": 2,
        "github/prefer-observers": 2,
        "github/require-passive-events": 2,
        "github/unescaped-html-literal": 2,

        ...overrides,
      },
    },
    {
      files: [`**/scripts/${GLOB_SRC}`, `**/cli.${GLOB_SRC_EXT}`],
      name: "antfu/javascript/disables/cli",
      rules: {
        "no-console": "off",
      },
    },
    {
      files: [".prettierrc.mjs"],
      name: "nirtamir2/javascript/prettier-overrides",
      rules: {
        "github/unescaped-html-literal": 0,
      },
    },
    {
      name: "nirtamir2/javascript/typescript-compat",
      rules: {
        "dot-notation": "off", // Collide with TypeScript TS4111
      },
    },
    arrayFunc.configs.recommended,
    {
      name: "nirtamir2/javascript/arrayFunc/overrides",
      rules: {
        "array-func/prefer-array-from": 0, // conflicts with unicorn/prefer-spread
      },
    },
    ...fixupConfigRules(
      compat.config({
        extends: ["plugin:optimize-regex/recommended"],
      }),
    ),
    {
      name: "nirtamir2/javascript/workspaces",
      plugins: {
        workspaces: workspacesPlugin,
      },
      rules: {
        "workspaces/no-relative-imports": "error",
        "workspaces/no-absolute-imports": "error",
        "workspaces/require-dependency": "error",
      },
    },
    eslintPluginNoUseExtendNative.configs.recommended,

    sonarjs.configs!.recommended,
    {
      name: "nirtamir2/javascript/sonar/disables",
      rules: {
        "sonarjs/prefer-read-only-props": "off",
        "sonarjs/deprecation": "off",
        "sonarjs/new-cap": "off",
        "sonarjs/todo-tag": "off",
        "sonarjs/no-fallthrough": "off",
        "sonarjs/void-use": "off",
      },
    },
    ...compat.extends("plugin:clsx/recommended"),
  ];
}
