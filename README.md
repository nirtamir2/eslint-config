# @nirtamir2/eslint-config

[![npm](https://img.shields.io/npm/v/@nirtamir2/eslint-config?color=444&label=)](https://npmjs.com/package/@nirtamir2/eslint-config)

This is a fork of Anthony Fu's [ESLint Config](https://github.com/antfu/eslint-config) maintained by [Nir Tamir](https://github.com/nirtamir2/).

## Usage

### Starter Wizard

We provided a CLI tool to help you set up your project, or migrate from the legacy config to the new flat config with one command.

```bash
npx @nirtamir2/eslint-config@latest
```

### Manual Install

If you prefer to set up manually:

```bash
pnpm i -D eslint @nirtamir2/eslint-config
```

And create `eslint.config.ts` in your project root:

```js
// eslint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2();
```

<details>
<summary>
Combined with legacy config:
</summary>

If you still use some configs from the legacy eslintrc format, you can use the [`@eslint/eslintrc`](https://www.npmjs.com/package/@eslint/eslintrc) package to convert them to the flat config.

```js
// eslint.config.ts
import { FlatCompat } from "@eslint/eslintrc";
import nirtamir2 from "@nirtamir2/eslint-config";

const compat = new FlatCompat();

export default nirtamir2(
  {
    ignores: [],
  },

  // Legacy config
  ...compat.config({
    extends: [
      "eslint:recommended",
      // Other extends...
    ],
  }),

  // Other flat configs...
);
```

> Note that `.eslintignore` no longer works in Flat config, see [customization](#customization) for more details.

</details>

### Add script for package.json

For example:

```json
{
  "scripts": {
    "lint": "eslint",
    "lint:fix": "eslint --fix"
  }
}
```

## Oxlint

This package also publishes a synchronous Oxlint config factory. Its rule
fragments are generated from the ESLint config during development, so the
ESLint rules remain the single manually maintained source. The export aims for
the maximum executable JavaScript and TypeScript parity that Oxlint currently
allows: native Oxlint rules where migration preserves the intended semantics,
`oxlint-tsgolint` for native type-aware rules, and package-anchored
JavaScript-plugin paths for compatible ESLint rules and deliberately retained
plugin behavior.

Install Oxlint alongside this package:

```bash
pnpm i -D eslint oxlint @nirtamir2/eslint-config
```

The ESLint peer remains part of this package's installation footprint. The
compiled `./oxlint` entry does not load ESLint or `@oxlint/migrate` when
Oxlint starts. Generated JavaScript-plugin specifiers are resolved from the
installed `@nirtamir2/eslint-config` package, rather than relative to the
consumer's `oxlint.config.ts`, so bundled fallback plugins also work with
strict package-manager layouts.

Create an `oxlint.config.ts` and call the factory:

```ts
// oxlint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config/oxlint";

export default nirtamir2(
  {
    typescript: true,
    ignores: ["generated/**"],
    rules: {
      "no-console": "warn",
    },
  },
  {
    // Trailing Oxlint configs are applied last.
    rules: {
      "no-debugger": "error",
    },
  },
);
```

Oxlint receives the returned plain config object; it does not call exported
functions itself. Root `rules`, integration `overrides`, and trailing configs
must therefore use Oxlint rule IDs and values. No migration runs in the user
project.

For a deterministic base config without package auto-detection, import the
static preset instead:

```ts
// oxlint.config.ts
import { recommended } from "@nirtamir2/eslint-config/oxlint";

export default recommended;
```

`recommended` contains the application base and its default Unicorn rules. It
also includes the command rules, the application/non-editor e18e variant,
RegExp rules at error level, default-import-name, and the compatible Prettier
and file-scoped rule disables. It does not enable JSX, tests, TypeScript,
React, Next.js, Vue, JSDoc, or detected integrations. Use the factory when you
want integration selection and familiar options. Unlike the factory, the
static preset does not inspect the consumer filesystem or load `.gitignore`.

### Oxlint options

The factory accepts these public options:

| Option            | Default and details                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`            | `"app"`; use `"lib"` for library TypeScript and e18e variants.                                                                                                  |
| `isInEditor`      | Auto-detected; pass a boolean for deterministic editor/non-editor severity variants.                                                                            |
| `gitignore`       | Enabled with `strict: false`; accepts `eslint-config-flat-gitignore` options or `false`.                                                                        |
| `ignores`         | An array appends project-relative globs; a function receives and replaces the generated default-ignore list.                                                    |
| `javascript`      | Always enabled; accepts `overrides`, composed at the same producer boundary as ESLint.                                                                          |
| `rules`           | Root Oxlint rule overrides, applied after every generated fragment.                                                                                             |
| `lessOpinionated` | `false`; selects the less-opinionated branch when Stylistic is enabled.                                                                                         |
| `angular`         | Disabled; accepts `overrides` for the executable TypeScript rule subset. HTML and inline templates are not linted.                                              |
| `unicorn`         | Enabled; accepts `allRecommended` (default `true`) and `overrides`.                                                                                             |
| `jsx`             | Enabled; boolean only.                                                                                                                                          |
| `typescript`      | Detected from `typescript`; accepts `erasableOnly` (default `true`), `typeAware`, `filesTypeAware`, `ignoresTypeAware`, `overrides`, and `overridesTypeAware`.  |
| `test`            | Enabled; accepts `overrides`.                                                                                                                                   |
| `vue`             | Detected from Vue, Nuxt, VitePress, or Slidev; accepts `vueVersion` (`2` or `3`, default `3`) and `overrides`.                                                  |
| `react`           | Disabled; accepts `overrides`.                                                                                                                                  |
| `nextjs`          | Detected from `next`; accepts `overrides`.                                                                                                                      |
| `jsdoc`           | Disabled; accepts `overrides`.                                                                                                                                  |
| `e18e`            | Enabled; accepts `modernization`, `moduleReplacements`, `performanceImprovements`, and `overrides`.                                                             |
| `regexp`          | Enabled; accepts `level: "error"` or `"warn"` and `overrides`.                                                                                                  |
| `perfectionist`   | Disabled; accepts `overrides`.                                                                                                                                  |
| `query`           | Detected from TanStack React Query or Solid Query; accepts `overrides`.                                                                                         |
| `security`        | Disabled; accepts `overrides`.                                                                                                                                  |
| `solid`           | Disabled; accepts `overrides`.                                                                                                                                  |
| `storybook`       | Detected from Storybook packages; boolean only.                                                                                                                 |
| `stylistic`       | Disabled; accepts `braceStyle`, `experimental`, numeric-or-tab `indent`, `jsx`, `quotes`, `semi`, and `overrides`. This is rule coverage, not formatter parity. |
| `tailwindcss`     | Detected from `tailwindcss`; accepts `entryPoint` and `overrides`.                                                                                              |
| `tsdoc`           | Disabled; accepts `overrides`.                                                                                                                                  |
| `unocss`          | Disabled; accepts `attributify` (default `true`), `strict` (default `false`), and `overrides`.                                                                  |
| `i18n`            | Disabled; enables i18next literal-string checks for JavaScript and TypeScript, including JSX/TSX. Locale JSON and validator rules are not linted.               |
| `zod`             | Detected when both `zod` and `next` are present; accepts `overrides`.                                                                                           |

Feature `overrides` must use Oxlint rule IDs and values. A boolean `false`
also disables an auto-detected or default-enabled feature. Unknown options and
unsupported ESLint-only options throw an `Unsupported Oxlint option` error
instead of being ignored.

The factory reads `.gitignore` and `.gitmodules` synchronously and converts
them to Oxlint ignore patterns before generated fragments are composed. Pass
`gitignore: false` to disable this factory conversion, or an options object to
select files, a working directory, recursive discovery, or strict missing-file
behavior. Oxlint's own directory discovery still honors `.gitignore` and
cannot currently be disabled with a CLI flag, although an explicitly named
file may still be selected.

Type-aware linting additionally requires `oxlint-tsgolint`:

```bash
pnpm i -D oxlint-tsgolint
```

`typescript.typeAware` enables Oxlint's native type-aware rules. It does not
make JavaScript ESLint plugins type-aware because their TypeScript parser
services are not supported. `filesTypeAware` retargets the type-aware source
scope, while `overridesTypeAware` applies rules to it. Matching the ESLint
producer, `ignoresTypeAware` also excludes the final TypeScript rule maps when
type-aware linting is disabled.

Editor-mode rule severities are preserved. Oxlint has no equivalent for
ESLint's per-rule autofix suppression, so `isInEditor` cannot disable fixes for
individual rules such as unused-import cleanup or test-only guards.

Most fallback plugins used by the base, Unicorn, JSX, TypeScript, tests, Vue,
JSDoc, e18e, i18n, RegExp, Stylistic, TSDoc, and the tail fragment are package
dependencies and need no separate installation. These opt-in or detected
features use optional peers; install the matching peer before enabling them:

| Feature         | Required optional peer packages                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `angular`       | `@angular-eslint/eslint-plugin`                                                                                 |
| `react`         | `@eslint-react/eslint-plugin`, `eslint-plugin-react-you-might-not-need-an-effect`                               |
| `nextjs`        | `@next/eslint-plugin-next`                                                                                      |
| `perfectionist` | `eslint-plugin-perfectionist`                                                                                   |
| `query`         | `@tanstack/eslint-plugin-query`                                                                                 |
| `security`      | `eslint-plugin-security`                                                                                        |
| `solid`         | `eslint-plugin-solid` (`@eslint-react/eslint-plugin` is already required when Solid and React are both enabled) |
| `storybook`     | `eslint-plugin-storybook`                                                                                       |
| `tailwindcss`   | `eslint-plugin-better-tailwindcss`                                                                              |
| `unocss`        | `@unocss/eslint-plugin`                                                                                         |
| `zod`           | `eslint-plugin-import-zod`                                                                                      |

If an enabled or auto-detected integration is missing its plugin, the factory
names that package in an `Unable to resolve Oxlint JavaScript plugin` error.
Install the peer or explicitly set that feature to `false`. A missing
`oxlint-tsgolint` has a separate install error when `typescript.typeAware` is
enabled.

### Compatibility scope

Oxlint's [JavaScript-plugin API](https://oxc.rs/docs/guide/usage/linter/js-plugins)
is currently alpha. Native implementations remain the fastest and most stable
path; JavaScript-plugin performance and compatibility depend on each plugin's
code and its ESLint API usage. This config uses plugins for reviewed compatible
rules when migration or semantic parity requires them, including aliased
fallbacks for reserved native plugin names and the full RegExp producer.

The factory turns off every generated JavaScript-plugin rule for
`**/*.d.{ts,mts,cts}` because Oxlint's current JavaScript-plugin runtime can
crash on declaration-only AST nodes. Native TypeScript rules, including native
type-aware rules from `oxlint-tsgolint`, still run on declaration files. Root
`rules` and trailing configs compose after this safety override, so they can
explicitly re-enable a rule when appropriate.

The public `oxlintCapabilities` manifest documents every config producer from
the ESLint factory, including its support level, ESLint default/detection
behavior, runtime packages, and known limitations:

```ts
import { oxlintCapabilities } from "@nirtamir2/eslint-config/oxlint";

console.log(oxlintCapabilities.vue);
```

The boundary is intentionally about executable behavior, not merely serializing
every ESLint rule. Oxlint does not currently provide parity for JSON, JSONC,
JSON5, YAML, TOML, or Markdown linting; custom parsers and processors; framework
templates or custom blocks; or formatter execution. Therefore Astro, Svelte,
pnpm workspace files, JSON/package/tsconfig sorting, Markdown, and formatter
producers are not exposed as Oxlint options. Compatible Prettier disables are
retained, but Prettier itself is not run.

Vue support covers supported JavaScript and TypeScript inside script blocks;
Angular support covers TypeScript rules but not external or inline templates;
and i18n support covers i18next literal-string checks in JavaScript and
TypeScript, including JSX/TSX, but not locale JSON, translation-path validators,
or prefix checks. Processor-dependent
Storybook formats and type-aware JavaScript-plugin rules have the same upstream
boundary. Known individual incompatibilities,
such as `eslint-plugin-expect-type`,
`eslint-plugin-sort-destructure-keys-typescript`,
`eslint-plugin-classname-components`, and the legacy
`eslint-plugin-ssr-friendly` API, are recorded in `oxlintCapabilities` rather
than emitted as broken rules.

For maintainers, rule changes are made only in the ESLint source and then
materialized with `pnpm generate:oxlint`. The generated fragments and report
are committed for review. `pnpm build`, `prepack`, and CI use the non-mutating
`check:oxlint-generated` command so stale output fails instead of being
rewritten during packaging.

React Refresh package detection is intentionally frozen in the generated
config. The React fragment does not dynamically vary
`react/only-export-components` for installed Next.js, Vite, or Remix packages.
Enabling `nextjs` still applies its separately generated Next.js fragment; for
Vite- or Remix-specific refresh options, set a `react.overrides` rule until
environment-specific generated variants are available.

For example, add a package script like this:

```json
{
  "scripts": {
    "lint:oxlint": "oxlint"
  }
}
```

## Customization

It uses [ESLint Flat config](https://eslint.org/docs/latest/use/configure/configuration-files-new). It provides much better organization and composition.

Normally you only need to import the `nirtamir2` preset:

```js
// eslint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2();
```

And that's it! Or you can configure each integration individually, for example:

```js
// eslint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2({
  // TypeScript and Vue are auto-detected, you can also explicitly enable them:
  typescript: true,
  vue: true,

  // Disable jsonc and yaml support
  jsonc: false,
  yaml: false,

  // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
  ignores: [
    "**/fixtures",
    // ...globs
  ],
});
```

The `nirtamir2` factory function also accepts any number of arbitrary custom config overrides:

```js
// eslint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2(
  {
    // Configures for nirtamir2's config
  },

  // From the second arguments they are ESLint Flat Configs
  // you can have multiple configs
  {
    files: ["**/*.ts"],
    rules: {},
  },
  {
    rules: {},
  },
);
```

Going more advanced, you can also import fine-grained configs and compose them as you wish:

<details>
<summary>Advanced Example</summary>

We wouldn't recommend using this style in general unless you know exactly what they are doing, as there are shared options between configs and might need extra care to make them consistent.

```js
// eslint.config.ts
import {
  combine,
  comments,
  ignores,
  imports,
  javascript,
  jsdoc,
  jsonc,
  markdown,
  node,
  sortPackageJson,
  sortTsconfig,
  stylistic,
  toml,
  typescript,
  unicorn,
  vue,
  yaml,
} from "@nirtamir2/eslint-config";

export default combine(
  ignores(),
  javascript(/* Options */),
  comments(),
  node(),
  jsdoc(),
  imports(),
  unicorn(),
  sortPackageJson(),
  sortTsconfig(),
  typescript(/* Options */),
  stylistic(),
  vue(),
  jsonc(),
  yaml(),
  toml(),
  markdown(),
);
```

</details>

Check out the [configs](https://github.com/nirtamir2/eslint-config/blob/main/src/configs) and [factory](https://github.com/nirtamir2/eslint-config/blob/main/src/factory.ts) for more details.

> Thanks to [sxzz/eslint-config](https://github.com/sxzz/eslint-config) for the inspiration and reference.

### Rules Overrides

Certain rules would only be enabled in specific files, for example, `ts/*` rules would only be enabled in `.ts` files and `vue/*` rules would only be enabled in `.vue` files. If you want to override the rules, you need to specify the file extension:

```js
// eslint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2(
  {
    vue: true,
    typescript: true,
  },
  {
    // Remember to specify the file glob here, otherwise it might cause the vue plugin to handle non-vue files
    files: ["**/*.vue"],
    rules: {
      "vue/operator-linebreak": ["error", "before"],
    },
  },
  {
    // Without `files`, they are general rules for all files
    rules: {
      "@stylistic/semi": ["error", "never"],
    },
  },
);
```

We also provided the `overrides` options in each integration to make it easier:

```js
// eslint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2({
  vue: {
    overrides: {
      "vue/operator-linebreak": ["error", "before"],
    },
  },
  typescript: {
    overrides: {
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    },
  },
  yaml: {
    overrides: {
      // ...
    },
  },
});
```

### Config Composer

The factory function `nirtamir2()` returns a [`FlatConfigComposer` object from `eslint-flat-config-utils`](https://github.com/nirtamir2/eslint-flat-config-utils#composer) where you can chain the methods to compose the config even more flexibly.

```js
// eslint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2()
  .prepend
  // some configs before the main config
  ()
  // overrides any named configs
  .override("antfu/imports/rules", {
    rules: {
      "import-x/order": ["error", { "newlines-between": "always" }],
    },
  })
  // rename plugin prefixes
  .renamePlugins({
    "old-prefix": "new-prefix",
    // ...
  });
// ...
```

### Optional Rules

This config also provides some optional plugins/rules for extended usage.

#### `command`

Powered by [`eslint-plugin-command`](https://github.com/antfu/eslint-plugin-command). It is not a typical rule for linting, but an on-demand micro-codemod tool that triggers by specific comments.

For a few triggers, for example:

- `/// to-function` - converts an arrow function to a normal function
- `/// to-arrow` - converts a normal function to an arrow function
- `/// to-for-each` - converts a for-in/for-of loop to `.forEach()`
- `/// to-for-of` - converts a `.forEach()` to a for-of loop
- `/// keep-sorted` - sorts an object/array/interface
- ... etc. - refer to the [documentation](https://github.com/antfu/eslint-plugin-command#built-in-commands)

You can add the trigger comment one line above the code you want to transform, for example (note the triple slash):

<!-- eslint-skip -->

```ts
/// to-function
const foo = async (msg: string): void => {
  console.log(msg);
};
```

Will be transformed to this when you hit save with your editor or run `eslint --fix`:

```ts
async function foo(msg: string): void {
  console.log(msg);
}
```

The command comments are usually one-off and will be removed along with the transformation.

### Type Aware Rules

You can optionally enable the [type aware rules](https://typescript-eslint.io/linting/typed-linting/) by passing the options object to the `typescript` config:

```js
// eslint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2({
  typescript: {
    tsconfigPath: "tsconfig.json",
  },
});
```

### Editor Specific Disables

Some rules are disabled when inside ESLint IDE integrations, namely [`unused-imports/no-unused-imports`](https://www.npmjs.com/package/eslint-plugin-unused-imports) [`test/no-only-tests`](https://github.com/levibuzolic/eslint-plugin-no-only-tests)

This is to prevent unused imports from getting removed by the IDE during refactoring to get a better developer experience. Those rules will be applied when you run ESLint in the terminal or [Lint Staged](#lint-staged). If you don't want this behavior, you can disable them:

```js
// eslint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2({
  isInEditor: false,
});
```

### Lint Staged

If you want to apply lint and auto-fix before every commit, you can add the following to your `package.json`:

```json
{
  "simple-git-hooks": {
    "pre-commit": "pnpm lint-staged"
  },
  "lint-staged": {
    "*": "eslint --fix"
  }
}
```

and then

```bash
npm i -D lint-staged simple-git-hooks

// to active the hooks
npx simple-git-hooks
```

## View what rules are enabled

I built a visual tool to help you view what rules are enabled in your project and apply them to what files, [@eslint/config-inspector](https://github.com/eslint/config-inspector)

Go to your project root that contains `eslint.config.ts` and run:

```bash
npx @eslint/config-inspector
```

## License

[MIT](./LICENSE) License &copy; 2019-PRESENT [Anthony Fu](https://github.com/antfu).

[Nir Tamir](https://github.com/nirtamir2) fork his excellent work and adapt it to his own needs.

## Nice ESLint configs

[pawelblaszczyk5's ESLint config](https://github.com/pawelblaszczyk5/pawelblaszczyk.dev/tree/fb90e2982f7f3b6253a24fa51380da773ef12974/tooling/eslint-config)

[eslint-config-sherif](https://github.com/AndreaPontrandolfo/sheriff)

[Antfu's eslint-config](https://github.com/antfu/eslint-config)

[eslint-config-nirtamir2](https://github.com/nirtamir2/eslint-config-nirtamir2)
