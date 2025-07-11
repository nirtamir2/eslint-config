import expectType from "eslint-plugin-expect-type/configs/recommended";
import sortDestructureKeysTypescriptConfig from "eslint-plugin-sort-destructure-keys-typescript/config";
import { GLOB_ASTRO_TS, GLOB_MARKDOWN, GLOB_TS, GLOB_TSX } from "../globs";
import { pluginAntfu } from "../plugins";
import type {
  OptionsComponentExts,
  OptionsFiles,
  OptionsOverrides,
  OptionsProjectType,
  OptionsTypeScriptParserOptions,
  OptionsTypeScriptWithTypes,
  TypedFlatConfigItem,
} from "../types";
import { interopDefault } from "../utils";

export async function typescript(
  options: OptionsFiles &
    OptionsComponentExts &
    OptionsOverrides &
    OptionsTypeScriptWithTypes &
    OptionsTypeScriptParserOptions &
    OptionsProjectType = {},
): Promise<Array<TypedFlatConfigItem>> {
  const {
    componentExts = [],
    overrides = {},
    overridesTypeAware = {},
    parserOptions = {},
    type = "app",
  } = options;

  const files = options.files ?? [
    GLOB_TS,
    GLOB_TSX,
    ...componentExts.map((ext) => `**/*.${ext}`),
  ];

  const filesTypeAware = options.filesTypeAware ?? [GLOB_TS, GLOB_TSX];
  const ignoresTypeAware = options.ignoresTypeAware ?? [
    `${GLOB_MARKDOWN}/**`,
    GLOB_ASTRO_TS,
  ];
  const tsconfigPath =
    options?.tsconfigPath == null ? undefined : options.tsconfigPath;
  const isTypeAware = tsconfigPath != null;

  const typeAwareRules: TypedFlatConfigItem["rules"] = {
    "dot-notation": "off",
    "no-implied-eval": "off",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/dot-notation": ["error", { allowKeywords: true }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-for-in-array": "error",
    "@typescript-eslint/no-implied-eval": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/no-unsafe-argument": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/promise-function-async": "error",
    "@typescript-eslint/restrict-plus-operands": "error",
    "@typescript-eslint/restrict-template-expressions": "error",
    "@typescript-eslint/return-await": ["error", "in-try-catch"],
    "@typescript-eslint/strict-boolean-expressions": [
      "error",
      { allowString: false, allowNumber: false, allowNullableObject: false },
    ],
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "@typescript-eslint/unbound-method": "error",
  };

  const [pluginTs, parserTs] = await Promise.all([
    interopDefault(import("@typescript-eslint/eslint-plugin")),
    interopDefault(import("@typescript-eslint/parser")),
  ] as const);

  function makeParser(
    typeAware: boolean,
    files: Array<string>,
    ignores?: Array<string>,
  ): TypedFlatConfigItem {
    return {
      files,
      ...(ignores ? { ignores } : {}),
      languageOptions: {
        parser: parserTs,
        parserOptions: {
          extraFileExtensions: componentExts.map((ext) => `.${ext}`),
          sourceType: "module",
          ...(typeAware
            ? {
                projectService: {
                  allowDefaultProject: ["./*.js"],
                  defaultProject: tsconfigPath,
                },
                tsconfigRootDir: process.cwd(),
              }
            : {}),
          ...parserOptions,
        },
      },
      name: `antfu/typescript/${typeAware ? "type-aware-parser" : "parser"}`,
    };
  }

  return [
    {
      // Install the plugins without globs, so they can be configured separately.
      name: "antfu/typescript/setup",
      plugins: {
        antfu: pluginAntfu,
        "@typescript-eslint": pluginTs,
      },
    },
    // assign type-aware parser for type-aware files and type-unaware parser for the rest
    ...(isTypeAware
      ? [
          makeParser(false, files),
          makeParser(true, filesTypeAware, ignoresTypeAware),
        ]
      : [makeParser(false, files)]),
    {
      files,
      name: "antfu/typescript/rules",
      rules: {
        ...pluginTs.configs.strict.rules,
        "no-dupe-class-members": "off",
        "no-redeclare": "off",
        "no-use-before-define": "off",
        "no-useless-constructor": "off",
        "@typescript-eslint/ban-ts-comment": [
          "error",
          { "ts-expect-error": "allow-with-description" },
        ],
        "@typescript-eslint/consistent-type-definitions": [
          "error",
          "interface",
        ],
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            disallowTypeAnnotations: false,
            fixStyle: "separate-type-imports",
            prefer: "type-imports",
          },
        ],

        "@typescript-eslint/method-signature-style": ["error", "property"], // https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful
        "@typescript-eslint/no-dupe-class-members": "error",
        "@typescript-eslint/no-dynamic-delete": "off",
        "@typescript-eslint/no-empty-object-type": [
          "error",
          { allowInterfaces: "always" },
        ],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-extraneous-class": "off",
        "@typescript-eslint/no-import-type-side-effects": "error",
        "@typescript-eslint/no-invalid-void-type": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-redeclare": ["error", { builtinGlobals: false }],
        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/no-unused-expressions": [
          "error",
          {
            allowShortCircuit: true,
            allowTaggedTemplates: true,
            allowTernary: true,
          },
        ],
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-use-before-define": [
          "error",
          { classes: false, functions: false, variables: true },
        ],
        "@typescript-eslint/no-useless-constructor": "off",
        "@typescript-eslint/no-wrapper-object-types": "error",
        "@typescript-eslint/triple-slash-reference": "off",
        "@typescript-eslint/unified-signatures": "off",

        ...(type === "lib"
          ? {
              "@typescript-eslint/explicit-function-return-type": [
                "error",
                {
                  allowExpressions: true,
                  allowHigherOrderFunctions: true,
                  allowIIFEs: true,
                },
              ],
            }
          : {}),
        ...overrides,
      },
    },
    ...(isTypeAware
      ? [
          {
            files: filesTypeAware,
            ignores: ignoresTypeAware,
            rules: {
              ...pluginTs.configs["strict-type-checked"].rules,
            },
          },
          {
            files: filesTypeAware,
            ignores: ignoresTypeAware,
            ...sortDestructureKeysTypescriptConfig(),
          },
          {
            files: filesTypeAware,
            ignores: ignoresTypeAware,
            name: "antfu/typescript/rules-type-aware",
            rules: {
              ...typeAwareRules,
              ...overridesTypeAware,
            },
          },
        ]
      : []),
    {
      files: ["**/*.d.?([cm])ts"],
      name: "antfu/typescript/disables/dts",
      rules: {
        "eslint-comments/no-unlimited-disable": "off",
        "import-x/no-duplicates": "off",
        "no-restricted-syntax": "off",
        "unused-imports/no-unused-vars": "off",
      },
    },
    {
      files: ["**/*.{test,spec}.ts?(x)"],
      name: "antfu/typescript/disables/test",
      rules: {
        "no-unused-expressions": "off",
      },
    },
    {
      files: ["**/*.js", "**/*.cjs"],
      name: "antfu/typescript/disables/cjs",
      rules: {
        "@typescript-eslint/no-require-imports": "off",
      },
    },
    isTypeAware
      ? {
          name: "nirtamir2/typescript/expect-type",
          ...expectType,
          files,
          ignores: [".storybook/**"],
        }
      : [],
    {
      name: "nirtamir2/typescript-rules",
      files,
      ignores: ignoresTypeAware,
      rules: {
        // #region @typescript-eslint off - too strict
        "no-magic-numbers": "off",
        "@typescript-eslint/no-magic-numbers": "off",
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": "off",
        "@typescript-eslint/class-methods-use-this": "off",
        "@typescript-eslint/consistent-type-definitions": "off", // I think it's covered by etc/prefer-interface + I prefer interface than type
        "@typescript-eslint/explicit-module-boundary-types": "off", // nice, but may need to off in tsx files? https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/explicit-module-boundary-types.md#configuring-in-a-mixed-jsts-codebase
        "@typescript-eslint/explicit-function-return-type": "off", // too strict
        "@typescript-eslint/prefer-readonly": "off", // too strict to specify readonly on every param
        "@typescript-eslint/prefer-readonly-parameter-types": "off", // too strict to specify readonly on every param
        "@typescript-eslint/naming-convention": [
          "off",
          /*
                   Too strict: sometimes we get stuff from server like user_id or call server with
                   .match({
                           course_id: course.id,
                           user_id: userId,
                         });
                   And we fail in this lint

                   Another example is something like
                   Function name `AuthProvider` must match one of the following formats: camelCase

                   {
                     selector: "default",
                     format: ["camelCase"],
                     leadingUnderscore: "allow",
                     trailingUnderscore: "allow",
                   },

                   {
                     selector: "variable",
                     format: ["camelCase", "UPPER_CASE"],
                     leadingUnderscore: "allow",
                     trailingUnderscore: "allow",
                   },

                   Also for 3rd party override like in global.d.ts

                  declare global {
                    namespace NodeJS {
                      interface ProcessEnv {
                        NODE_ENV: "development" | "production";
                        MY_ENV_VARIABLE: string;
                      }
                    }
                  }

                  This will complain that interface ProcessEnv not starting with I

                  Or auto-generated TypeScript tool that gets an object json and return it's types

                  */
          {
            selector: "typeLike",
            format: ["PascalCase"],
          },
          // Mine:
          {
            selector: "interface",
            format: ["PascalCase"],
            prefix: ["I"],
          },
          {
            selector: "typeLike",
            format: ["PascalCase"],
            suffix: ["T"],
          },
        ],
        // #endregion

        // #region @typescript-eslint no need
        "@typescript-eslint/ban-tslint-comment": "off",
        // #endregion no need

        // #region @typescript-eslint - warn
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_" },
        ],
        // #endregion

        // #region @typescript-eslint all https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/src/configs/all.ts

        "@typescript-eslint/consistent-generic-constructors": "error",
        "@typescript-eslint/no-unsafe-declaration-merging": "error",
        // "@typescript-eslint/no-unsafe-enum-comparison": "error", new rule
        "@typescript-eslint/no-import-type-side-effects": "error",

        "@typescript-eslint/no-duplicate-enum-values": "error",
        "@typescript-eslint/no-useless-empty-export": "error",
        "@typescript-eslint/ban-ts-comment": [
          "error",
          {
            "ts-expect-error": "allow-with-description",
            "ts-ignore": true,
            "ts-nocheck": true,
            "ts-check": false,
            minimumDescriptionLength: 3,
          },
        ],
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "@typescript-eslint/array-type": ["error", { default: "generic" }],
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/no-restricted-types": [
          "error",
          {
            types: {
              String: {
                message: "Use `string` instead.",
                fixWith: "string",
              },
              Number: {
                message: "Use `number` instead.",
                fixWith: "number",
              },
              Boolean: {
                message: "Use `boolean` instead.",
                fixWith: "boolean",
              },
              Symbol: {
                message: "Use `symbol` instead.",
                fixWith: "symbol",
              },
              Object: {
                message:
                  "The `Object` type is mostly the same as `unknown`. You probably want `Record<string, unknown>` instead. See https://github.com/typescript-eslint/typescript-eslint/pull/848",
                fixWith: "Record<string, unknown>",
              },
              "{}": {
                message:
                  "The `{}` type is mostly the same as `unknown`. You probably want `Record<string, unknown>` instead.",
                fixWith: "Record<string, unknown>",
              },
              object: {
                message:
                  "The `object` type is hard to use. Use `Record<string, unknown>` instead. See: https://github.com/typescript-eslint/typescript-eslint/pull/848",
                fixWith: "Record<string, unknown>",
              },
              Function:
                "Use a specific function type instead, like `() => void`.",
            },
          },
        ],
        "@typescript-eslint/class-literal-property-style": "error", // IDK
        "@typescript-eslint/consistent-indexed-object-style": "error",
        "@typescript-eslint/consistent-type-assertions": "error",
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/consistent-type-exports": "error",
        "default-param-last": "off",
        "@typescript-eslint/default-param-last": "error",
        "dot-notation": "off",
        "@typescript-eslint/dot-notation": "error",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "init-declarations": "off",
        "@typescript-eslint/init-declarations": "error",
        "@typescript-eslint/member-ordering": "error",
        "@typescript-eslint/method-signature-style": "error",
        "no-array-constructor": "off",
        "@typescript-eslint/no-array-constructor": "error",
        "@typescript-eslint/no-base-to-string": "error",
        "@typescript-eslint/no-confusing-non-null-assertion": "error",
        "@typescript-eslint/no-confusing-void-expression": "error",
        "no-dupe-class-members": "off",
        "@typescript-eslint/no-dupe-class-members": "error",
        "no-duplicate-imports": "off",
        "@typescript-eslint/no-dynamic-delete": "error",
        "@typescript-eslint/no-empty-object-type": [
          "error",
          { allowInterfaces: "always" },
        ],
        "no-empty-function": "off",
        "@typescript-eslint/no-empty-function": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-extra-non-null-assertion": "error",

        // Less important rules:
        "@typescript-eslint/no-extraneous-class": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-for-in-array": "error",
        "no-implied-eval": "off",
        "@typescript-eslint/no-implied-eval": "error",
        "@typescript-eslint/no-inferrable-types": "error",
        "no-invalid-this": "off",
        "@typescript-eslint/no-invalid-this": "error",
        "@typescript-eslint/no-invalid-void-type": "error",
        "no-loop-func": "off",
        "@typescript-eslint/no-loop-func": "error",
        "no-loss-of-precision": "off",
        "@typescript-eslint/no-meaningless-void-operator": "error",
        "@typescript-eslint/no-misused-new": "error",
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/no-namespace": "error",
        "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
        "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/parameter-properties": "error",
        "no-redeclare": "off",
        "@typescript-eslint/no-redeclare": "error",
        "@typescript-eslint/no-require-imports": "error",
        "no-restricted-imports": "off",
        "@typescript-eslint/no-restricted-imports": "error",
        "@typescript-eslint/no-this-alias": "error",
        "no-throw-literal": "off",
        "@typescript-eslint/only-throw-error": "error",
        // "@typescript-eslint/no-type-alias": "off", // A & B, type AppRouter = typeof appRouter, Merge<A,B>
        "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
        "@typescript-eslint/no-unnecessary-condition": "error",
        "@typescript-eslint/no-unnecessary-qualifier": "error",
        "@typescript-eslint/no-unnecessary-type-arguments": "error",
        "@typescript-eslint/no-unnecessary-type-assertion": "error",
        "@typescript-eslint/no-unnecessary-type-constraint": "error",
        "@typescript-eslint/no-unsafe-argument": "error",
        "@typescript-eslint/no-unsafe-assignment": "error",
        "@typescript-eslint/no-unsafe-call": "error",
        "@typescript-eslint/no-unsafe-member-access": "error",
        "@typescript-eslint/no-unsafe-return": "error",
        "no-unused-expressions": "off",
        "@typescript-eslint/no-unused-expressions": "error",
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": "error",
        "no-useless-constructor": "off",
        "@typescript-eslint/no-useless-constructor": "error",
        "@typescript-eslint/non-nullable-type-assertion-style": "error",
        "@typescript-eslint/prefer-as-const": "error",
        "@typescript-eslint/prefer-enum-initializers": "error",
        "@typescript-eslint/prefer-for-of": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/prefer-includes": "error",
        "@typescript-eslint/prefer-literal-enum-member": "error",
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "@typescript-eslint/prefer-nullish-coalescing": [
          "error",
          { ignoreIfStatements: true },
        ],
        "@typescript-eslint/prefer-optional-chain": "error",
        "@typescript-eslint/prefer-reduce-type-parameter": "error",
        "@typescript-eslint/prefer-regexp-exec": "error",
        "@typescript-eslint/prefer-return-this-type": "error",
        "@typescript-eslint/prefer-string-starts-ends-with": "error",
        "@typescript-eslint/promise-function-async": "error",
        "@typescript-eslint/require-array-sort-compare": "error",
        "require-await": "off",
        "@typescript-eslint/require-await": "error",
        "@typescript-eslint/restrict-plus-operands": "error",
        "@typescript-eslint/restrict-template-expressions": "error",
        "@typescript-eslint/return-await": ["error", "always"],
        "@typescript-eslint/strict-boolean-expressions": [
          "error",
          {
            allowString: false,
            allowNumber: false,
            allowNullableObject: false,
          },
        ],
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "@typescript-eslint/triple-slash-reference": "error",
        "@typescript-eslint/unbound-method": "error",
        "@typescript-eslint/unified-signatures": "error",
        // #endregion

        "array-callback-return": "off", // https://github.com/typescript-eslint/typescript-eslint/issues/2841 - false positive with TypeScript
        ...(isTypeAware ? {} : pluginTs.configs["disable-type-checked"].rules),
      },
    },
    {
      name: "nirtamir2/typescript/overrides",
      files,
      ...overrides,
    },
  ] as Array<TypedFlatConfigItem>;
}
