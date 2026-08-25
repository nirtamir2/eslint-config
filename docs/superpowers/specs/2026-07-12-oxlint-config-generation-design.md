# Oxlint Config Generation Design

## Status

Implemented and verified.

## Date

2026-07-12

Last reconciled with the implementation on 2026-08-24.

## Context

`@nirtamir2/eslint-config` is an ESLint 10 flat-config package whose public
factory dynamically composes integrations based on options, installed
packages, the working directory, and the editor environment. It contains
rules from ESLint core and many plugins, plus ESLint-specific parsers and
processors for Vue, Svelte, Astro, Markdown, JSONC, YAML, TOML, and other
formats.

Users should also be able to consume an Oxlint configuration through a
familiar import-and-options API:

```text
// oxlint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config/oxlint";

export default nirtamir2({
  react: true,
  typescript: { typeAware: true },
});
```

The ESLint configuration must remain the only manually authored rule source.
Maintainers must not keep a second handwritten Oxlint rule configuration in
sync.

Oxlint provides the official `@oxlint/migrate` converter. It accepts a
resolved ESLint flat config and asynchronously returns an Oxlint config.
Running that converter in every consumer process would require top-level
`await`, load the ESLint plugin graph during every Oxlint invocation, and
couple users to migration-tool internals. Therefore conversion belongs in an
explicit maintainer generation workflow rather than the user runtime.

## Goals

- Publish a synchronous `@nirtamir2/eslint-config/oxlint` config factory.
- Preserve familiar option names when Oxlint provides honest equivalent
  behavior.
- Reject ESLint-only or unsupported options instead of silently ignoring them.
- Keep ESLint rules and presets as the sole manually maintained rule source.
- Export the maximum executable JavaScript and TypeScript coverage: prefer
  native Oxlint rules, add native type-aware rules through `oxlint-tsgolint`,
  and use reviewed JavaScript-plugin fallbacks where Oxlint lacks a native
  implementation.
- Produce deterministic generated artifacts and a reviewable compatibility
  report.
- Prevent a release from silently losing previously supported rules or
  integrations.
- Keep ESLint and `@oxlint/migrate` out of the published Oxlint runtime path.

## Non-goals

- Perfect semantic parity where Oxlint lacks the required parser, processor,
  setting, rule, or file-language support.
- Runtime translation of arbitrary consumer-provided ESLint configs.
- Runtime translation of consumer rule overrides; users write Oxlint rule IDs
  in Oxlint configs.
- A generic third-party config conversion framework or a new standalone
  package in the first version.
- Replacing formatting behavior with Oxlint. Formatting remains a separate
  concern, such as Oxfmt or Prettier.
- Preserving the `FlatConfigComposer` chaining API in the Oxlint entry point.

## Decision

Generate Oxlint config fragments from the existing ESLint config functions at
maintainer request. Commit the generated artifacts for review, verify drift
without rewriting them during build and release checks, and publish a
lightweight synchronous factory that composes only those artifacts.

The generator is repository-specific. Its internal units should be isolated
and unsurprising, but extraction into a generic tool is outside this scope.

## Public API

### Package export

Add the `./oxlint` subpath:

```json
{
  "exports": {
    ".": "./dist/index.mjs",
    "./cli": "./dist/cli.mjs",
    "./oxlint": "./dist/oxlint.mjs",
    "./package.json": "./package.json"
  }
}
```

The actual package export must include its generated declaration entry in the
same way as the existing build output.

### Factory

The default and named `nirtamir2` export is synchronous:

```text
function nirtamir2(
  options?: OxlintOptions,
  ...userConfigs: OxlintConfig[]
): OxlintConfig;
```

Generated fragments are composed first. Trailing `userConfigs` are composed
afterward and therefore override generated defaults.

```text
import nirtamir2 from "@nirtamir2/eslint-config/oxlint";

export default nirtamir2(
  {
    react: true,
    typescript: { typeAware: true },
    ignores: ["generated/**"],
  },
  {
    rules: {
      "no-console": "warn",
    },
  }
);
```

The function returns a plain Oxlint config object. Oxlint does not invoke a
default-exported function, so consumers must call the factory as shown.

### Static config

The subpath also exports a generated `recommended` object:

```text
import { recommended } from "@nirtamir2/eslint-config/oxlint";

export default recommended;
```

`recommended` contains the default application base, the full recommended
Unicorn fragment, command rules, the application/non-editor e18e variant,
RegExp rules at error level, and the tail fragment containing
default-import-name plus compatible Prettier and file-scoped disables. It
includes no JSX, test, TypeScript, or framework fragment and performs no
package auto-detection or consumer-filesystem gitignore discovery.

### Option contract

`OxlintOptions` is an explicit public type, not `OptionsConfig` and not a broad
`Partial<OptionsConfig>`. This ensures that ESLint-only options do not become
accidental public promises.

The public option surface covers:

- Structural behavior: `type`, `isInEditor`, `gitignore`, `ignores`,
  `javascript.overrides`, `lessOpinionated`, and root `rules`. Ignore arrays
  append to generated defaults; an ignore transformer can replace that default
  list.
- Native, mixed, and JavaScript-plugin-backed integrations: `angular`, `e18e`,
  `i18n`, `jsdoc`, `jsx`, `nextjs`, `perfectionist`, `query`, `react`, `regexp`,
  `security`, `solid`, `storybook`, `stylistic`, `tailwindcss`, `test`,
  `typescript`, `tsdoc`, `unocss`, `unicorn`, `vue`, and `zod`.
- `overrides` sub-options for integrations whose generated shape supports rule
  overrides.
- TypeScript controls: `erasableOnly`, native `typeAware` rather than ESLint's
  `tsconfigPath`, `filesTypeAware`, `ignoresTypeAware`, and
  `overridesTypeAware`.
- Integration-specific controls: the three e18e rule families,
  `unicorn.allRecommended`, `regexp.level`, `vue.vueVersion`, Stylistic brace,
  experimental, indentation, JSX, quote, and semicolon choices,
  `tailwindcss.entryPoint`, and `unocss.attributify`/`unocss.strict`.

`isInEditor` preserves the source config's editor severity variants. Oxlint
does not expose ESLint's per-rule autofix suppression, so editor mode cannot
turn off fixes independently of a rule's severity.

All other current ESLint integrations are compatibility candidates. A
candidate enters `OxlintOptions` only through an intentional API change after
its native or JavaScript-plugin-backed fragment passes the compatibility gates
in this document. The public type never changes merely because a new migrator
version happens to emit more rules.

The API explicitly excludes options whose defining behavior depends entirely
on unsupported custom languages, parsers, processors, or formatter execution,
including `astro`, `formatters`, `jsonc`, `markdown`, `pnpm`, `svelte`, `toml`,
and `yaml`. JSON/package/tsconfig sorting is also excluded because it depends on
JSONC parsing. Angular exports its TypeScript-only subset, while i18n exports its
JavaScript/TypeScript literal-string subset, including JSX/TSX; their template,
JSON, validator, and processor behavior stays explicitly out of scope.

Vue support is documented as script-block support, Angular as TypeScript-only,
and i18n as JavaScript/TypeScript, including JSX/TSX. None promises template,
JSON, validator, or processor parity. More generally, the export covers
JavaScript, TypeScript, JSX, TSX, and supported Vue script blocks. It does not
claim
executable parity for JSON, JSONC, JSON5, YAML, TOML, or Markdown; custom
framework templates or blocks; processor-created virtual files; or formatter
execution.

User-provided `rules` and trailing configs use Oxlint-native plugin and rule
names. No migration runs at user startup.

### Auto-detection

The factory conditionally adds the default Unicorn, JSX, test, e18e, and
RegExp fragments, then adds supported TypeScript, Next.js, Vue, Query,
Storybook, Tailwind CSS, and Zod fragments using package auto-detection when
their options are omitted. Angular, i18n, React, JSDoc, Perfectionist, Security,
Solid, Stylistic, TSDoc, and UnoCSS remain opt-in. Unsupported integrations are
never auto-enabled.

To avoid maintaining orchestration twice, extract shared, linter-independent
feature detection and ordering from the current ESLint factory. Both factories
consume that shared plan; each factory remains responsible for its own
linter-specific config objects.

## Architecture

### 1. Shared feature plan

The shared feature-plan module owns:

- Integration ordering.
- Package detection for integrations supported by both factories.
- Common defaults such as application versus library mode.
- Normalized enabled/disabled decisions.

It contains no ESLint plugin objects, Oxlint plugin names, or rule maps.

### 2. Capability manifest

A small handwritten, publicly exported `oxlintCapabilities` manifest owns
semantic decisions that a migration tool cannot infer. It has one entry for
every ESLint config producer and records:

- Native, JavaScript-plugin, mixed, or unsupported classification.
- ESLint default and package/file detection behavior.
- Runtime plugin packages, when applicable.
- Documented semantic limitations.

The manifest contains no rule lists. It is adapter metadata, not a second
configuration.

### 3. Artifact generator

`scripts/generate-oxlint.ts` resolves isolated existing ESLint config
producers and their declared variants, then passes each resulting flat config
unit to a pinned `@oxlint/migrate` version. Isolating source units preserves
feature boundaries and makes compatibility changes attributable.

The generator must:

1. Resolve only declared variants.
2. Run the pinned migrator per variant with JavaScript plugins and nursery
   coverage enabled; select type-aware migration only for declared type-aware
   TypeScript variants.
3. Preserve source `files` and `ignores` scopes in the generated fragment
   metadata and Oxlint overrides.
4. Temporarily mark explicit disabled rules with a valid severity so the
   migrator can map native IDs, aliases, and only rules it recognizes, then
   restore the mapped values to a bare `off`. Validate rule names exposed by
   source-registered JavaScript plugins before marking them; migrate the
   Prettier producer in native-only mode so compatible disables do not pull in
   formatting-only plugin packages.
5. Normalize disabled rule arrays such as `["off", options]` to a bare
   disabled severity so Oxlint does not validate inactive ESLint-only options.
6. Translate supported ESLint extglobs to Oxlint-compatible brace globs and
   fail on any unrecognized extglob instead of emitting an inert file scope.
7. Normalize output deterministically.
8. Preserve compatible per-variant JavaScript-plugin entries emitted by the
   migrator.
9. Recover reviewed rules from native/reserved plugin namespaces through
   explicit aliases when Oxlint does not yet implement them natively.
10. Exclude rules that require unsupported parsers, processors, TypeScript
    parser services in JavaScript plugins, or legacy ESLint APIs.
11. Feed the normalized config to pinned CLI compatibility validation.
12. Emit config fragments and compatibility metadata.
13. Fail on unreviewed compatibility drift.

The effective migration settings are `withNursery: true`, the variant's
declared type-aware setting, and `jsPlugins: true` for executable linter
producers. The Prettier compatibility source is deliberately native-only;
reviewed Unicorn aliases are recovered separately. Plugin aliases and manually
recovered rules are reviewed adaptations, not unbounded guesses based on
package names.

### 4. Generated artifacts

Generated output lives under a clearly marked directory such as
`src/generated/oxlint/` and includes:

- Config fragments.
- Variant metadata.
- Oxlint and migrator versions.
- Per-integration migrated and skipped rule counts.
- Skipped rules grouped by reason.
- Explicit migration warnings and deliberate adaptations.
- Supported or partial variant classifications. A variant is partial whenever
  it has skipped rules, a migration warning, or a deliberate omission.

Generated modules are TypeScript data modules so the normal build can bundle
and type-check them. Every generated file starts with a do-not-edit notice.

Generated artifacts are committed. Maintainers review generator diffs but do
not edit the artifacts directly.

### 5. Runtime factory

The runtime Oxlint factory imports only:

- Generated Oxlint data.
- Shared feature detection and ordering.
- Lightweight option validation, synchronous gitignore conversion,
  JavaScript-plugin resolution, and composition helpers.

It must not import this package's ESLint config producer modules, ESLint itself,
or `@oxlint/migrate`. The runtime additionally uses
`eslint-config-flat-gitignore` to materialize project ignore patterns; Oxlint
loads only the explicitly generated JavaScript-plugin packages required by the
selected fragments.

The factory:

1. Validates option keys and values.
2. Resolves supported auto-detection.
3. Loads `.gitignore`/`.gitmodules` patterns by default with non-strict missing
   file behavior; `gitignore: false` disables this filesystem step, while
   Oxlint's own directory discovery still honors `.gitignore` independently
   and currently has no switch to disable that filtering; explicitly named
   files may still be selected.
4. Selects generated fragments and variants in shared order.
5. Resolves generated JavaScript-plugin specifiers relative to the installed
   package, preserving aliases and leaving user-supplied trailing configs
   untouched.
6. Adds a safety override that disables generated JavaScript-plugin rules for
   `**/*.d.{ts,mts,cts}` while leaving native TypeScript and native type-aware
   rules enabled.
7. Applies root rules after the safety override. Ignore customization is
   folded into the base before feature fragments are composed.
8. Appends user configs, allowing an explicit later rule to re-enable a
   JavaScript-plugin rule for declaration files.
9. Returns one plain Oxlint config object.

## Variant strategy

Do not generate the Cartesian product of every option. Generate only variants
that change emitted rules or config shape.

Examples include:

- Application versus library rule deltas.
- TypeScript standard, type-aware, erasable/non-erasable, and sentinel-based
  custom type-aware scope templates. Runtime substitution changes only the
  source `filesTypeAware`/`ignoresTypeAware` positions, preserving declaration,
  test, and CommonJS override ordering. In standard mode, custom
  `ignoresTypeAware` values retarget the final TypeScript rule maps that consume
  the same source option even without parser services.
- Editor/non-editor base and test behavior; independently composable e18e
  modernization, module-replacement, and performance families.
- Vue 2 and Vue 3 script variants, plus JavaScript/TypeScript branches.
- Stylistic opinionation, JSX, and primitive customization deltas.
- Framework JavaScript versus TypeScript fragments where the source config
  differs.

Variant declarations live beside the capability manifest. If a new option
changes generated behavior, its variant must be declared and reviewed before
the option can be published.

## Plugin strategy

Native Oxlint plugins always take precedence over ESLint JavaScript plugins.

JavaScript-plugin fallback rules are admitted only when:

- No adequate native implementation covers the selected rules.
- The plugin handles file kinds that Oxlint supports for that integration.
- Its exact package specifier is declared in the capability manifest.
- It loads under the pinned Oxlint version.
- Relevant fixtures produce expected diagnostics.
- Its known limitations are published.

Generated plugin specifiers are converted to package-anchored absolute module
paths with `import.meta.resolve`, so bundled fallbacks resolve correctly under
strict package-manager layouts regardless of the consumer config's location.
Fallbacks used by always-on and package-owned fragments are regular package
dependencies. Plugins used only by opt-in or auto-detected external
integrations remain optional peers, and the runtime reports the exact missing
package with an install-or-disable error.

JavaScript plugins remain an alpha Oxlint capability. Their compatibility and
performance depend on their ESLint API usage and implementation. They cannot
provide custom parsers or processors, and JavaScript-plugin rules requiring
TypeScript parser services remain unsupported even when native type-aware
linting is enabled.

Oxlint's JavaScript-plugin runtime currently crashes on some declaration-only
AST nodes. The factory therefore turns off every generated JavaScript-plugin
rule for `**/*.d.{ts,mts,cts}`. This does not disable native TypeScript or
`oxlint-tsgolint` rules. Root user rules and trailing configs are deliberately
composed afterward so consumers can opt back in when a specific plugin/runtime
combination is known to be safe.

## Failure and compatibility policy

Generation fails closed on:

- Migrator crashes.
- Invalid Oxlint configuration.
- JavaScript plugins that fail to load or exercise unsupported APIs in a
  declared supported fragment.
- Schema or load failures.
- Unexpected skipped-rule drift.
- A compatibility regression in an already supported integration.

At runtime:

- Unknown and ESLint-only option keys throw an `Unsupported Oxlint option`
  error.
- Features requiring an optional runtime companion, such as type-aware
  linting, produce a targeted installation error when it is unavailable.
- Enabled fragments whose optional JavaScript plugin cannot be resolved name
  the missing package and instruct the user to install it or disable the
  integration.
- User rule configuration is left to Oxlint's own validation.
- The factory never silently falls back to ESLint.

Compatibility changes follow public API semantics:

- Removing a supported option or materially weakening its documented behavior
  is breaking.
- Adding a newly compatible option is additive.
- Migrator and Oxlint upgrades are intentional, version-aligned changes.
- Changed generated rules are reviewed as configuration behavior changes, not
  accepted as incidental build noise.

## Verification

### Generation tests

- Two consecutive generator runs are byte-identical.
- Regeneration followed by `git diff --exit-code` detects stale artifacts.
- Every emitted fragment validates against the pinned Oxlint configuration
  schema.
- Compatibility reports match reviewed baselines.

### Compatibility tests

- Every native, mixed, and JavaScript-plugin integration loads under pinned
  Oxlint.
- Representative fixtures assert diagnostics, not only successful parsing.
- Framework combinations cover ordering interactions such as React with
  TypeScript and Vue with TypeScript.
- Previously supported integrations failing compatibility block the build.

### Public API tests

- Type tests accept supported options and reject ESLint-only options.
- Runtime tests cover unknown options, missing peers, auto-detection,
  overrides, and ordering.
- A consumer fixture imports the published `./oxlint` entry from a real
  `oxlint.config.ts`.
- The consumer fixture verifies that generated JavaScript plugins resolve from
  the installed package under a strict dependency layout.
- The static `recommended` export and factory-with-no-options behavior are
  tested separately.

### Packaging tests

- The published `./oxlint` entry contains no runtime import of ESLint or
  `@oxlint/migrate`.
- Generated modules and declarations are included in the package.
- `oxlint`, `@oxlint/migrate`, and compatibility fixtures use aligned pinned
  versions.

## Build and release workflow

Add these script entry points:

- `generate:oxlint`: the only command that writes generated artifacts; it
  generates them explicitly for maintainers.
- `check:oxlint-generated`: generate in memory or a temporary location and
  fail on drift without mutating the working tree.

The build, `prepack`, and CI run the non-mutating drift check. They never
rewrite tracked files, so a release cannot hide stale artifacts behind an
uncommitted local generation result.

The package build adds an Oxlint entry and declaration output. README usage
documents:

- Factory and static imports.
- Supported options.
- Native versus JavaScript fallback status.
- Partial semantics.
- Unsupported ESLint features.
- Peer dependency requirements.

The `./oxlint` export is additive. Subsequent capability removals obey
the package's breaking-change policy.

## Alternatives considered

### Runtime migration wrapper

Call `@oxlint/migrate` from the consumer's `oxlint.config.ts`.

Rejected because it is asynchronous, requires top-level `await`, loads the
ESLint plugin graph on every invocation, exposes consumers to migration drift,
and defeats the lightweight Oxlint runtime path.

### Handwritten Oxlint factory

Maintain an ESLint factory and an Oxlint factory independently.

Rejected because rule changes would need manual duplication and inevitably
drift.

### Neutral cross-linter configuration model

Move both linters to a new linter-independent rule representation.

Rejected for the first version because existing rule data is interleaved with
plugin presets, parser objects, processors, and executable config behavior. It
would be a large refactor and still require linter-specific adapters.

### Generic published generator

Create a new reusable package that turns arbitrary ESLint config factories
into Oxlint factories.

Deferred from the initial scope. A generic tool can migrate resolved configs,
but it cannot infer a factory's public options, meaningful variants,
auto-detection contract, or acceptable degradation policy. Those decisions
require package-specific declarations even when rule conversion is generic.

## Consequences

### Positive

- Rules remain authored once.
- Users receive a synchronous, typed, lightweight Oxlint API.
- Generated differences are visible and reviewable.
- Compatibility gaps cannot disappear silently.
- The package can add Oxlint capabilities incrementally without overpromising
  unsupported ESLint behavior.
- The published runtime does not import ESLint or the migrator, although the
  same package retains its existing ESLint install footprint.

### Costs

- The repository gains a generator, generated artifacts, and compatibility
  fixtures.
- Oxlint and migrator upgrades require deliberate regeneration and review.
- Some familiar ESLint options remain unavailable in the Oxlint entry.
- JavaScript-plugin fallbacks add runtime dependency, compatibility, and
  performance maintenance.
- Shared feature detection requires a targeted refactor of the current ESLint
  factory.

## References

- Oxlint migration guide:
  https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint
- `@oxlint/migrate`:
  https://github.com/oxc-project/oxlint-migrate
- Oxlint shared configuration:
  https://oxc.rs/docs/guide/usage/linter/config.html#extend-shared-configs
- Oxlint JavaScript plugins:
  https://oxc.rs/docs/guide/usage/linter/js-plugins.html
