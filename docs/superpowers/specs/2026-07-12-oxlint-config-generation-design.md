# Oxlint Config Generation Design

## Status

Accepted for implementation planning.

## Date

2026-07-12

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
couple users to migration-tool internals. Therefore conversion belongs in the
package build rather than the user runtime.

## Goals

- Publish a synchronous `@nirtamir2/eslint-config/oxlint` config factory.
- Preserve familiar option names when Oxlint provides honest equivalent
  behavior.
- Reject ESLint-only or unsupported options instead of silently ignoring them.
- Keep ESLint rules and presets as the sole manually maintained rule source.
- Prefer native Oxlint plugins, with JavaScript-plugin fallbacks only after
  compatibility tests pass.
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
build time. Commit the generated artifacts for review, validate them in CI,
and publish a lightweight synchronous factory that composes only those
artifacts.

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

`recommended` contains the base configuration only. It performs no package
auto-detection.

### Option contract

`OxlintOptions` is an explicit public type, not `OptionsConfig` and not a broad
`Partial<OptionsConfig>`. This ensures that ESLint-only options do not become
accidental public promises.

The initial required option surface covers:

- Structural behavior: `type`, `ignores`, and root `rules`.
- Native-capable integrations: `typescript`, `jsx`, `react`, `nextjs`, `test`,
  `vue`, `unicorn`, and `jsdoc`.
- `overrides` sub-options where the corresponding integration supports native
  Oxlint rule overrides.
- `typescript.typeAware` rather than ESLint's `tsconfigPath`.

All other current ESLint integrations are compatibility candidates. A
candidate enters `OxlintOptions` only through an intentional API change after
its native or JavaScript-plugin fragment passes the compatibility gates in
this document. The public type never changes merely because a new migrator
version happens to emit more rules.

The initial API explicitly excludes options whose defining behavior depends
on unsupported custom languages, parsers, processors, or formatter execution,
including `angular`, `formatters`, `jsonc`, `markdown`, `pnpm`, `stylistic`,
`toml`, and `yaml`. Other candidates remain excluded until admitted by the
same compatibility process.

Vue support is documented as script-block support. It does not promise ESLint
template-processor parity.

User-provided `rules` and trailing configs use Oxlint-native plugin and rule
names. No migration runs at user startup.

### Auto-detection

When a supported option is omitted, the Oxlint factory retains the
corresponding existing package auto-detection behavior whenever the ESLint
factory already auto-detects that integration. Unsupported integrations are
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

A small handwritten Oxlint capability manifest owns semantic decisions that a
migration tool cannot infer:

- Public option key.
- Native, JavaScript-plugin, partial, or unsupported classification.
- Exact JavaScript plugin package specifier and alias.
- Required peer dependency, when applicable.
- Supported generated variants.
- Documented limitations.

The manifest contains no rule lists. It is adapter metadata, not a second
configuration.

### 3. Build generator

`scripts/generate-oxlint.ts` resolves controlled variants of existing ESLint
config functions and passes the resulting flat configs to a pinned
`@oxlint/migrate` version.

The generator must:

1. Resolve only declared variants.
2. Use native Oxlint implementations when available.
3. Admit a JavaScript plugin only when the capability manifest supplies the
   exact specifier and compatibility tests pass.
4. Normalize output deterministically.
5. Validate the normalized config.
6. Emit config fragments and compatibility metadata.
7. Fail on unreviewed compatibility drift.

The generator must not trust guessed plugin package names from the migrator.
The capability manifest is authoritative for JavaScript plugin aliases and
specifiers.

### 4. Generated artifacts

Generated output lives under a clearly marked directory such as
`src/generated/oxlint/` and includes:

- Config fragments.
- Variant metadata.
- Oxlint and migrator versions.
- Per-integration migrated and skipped rule counts.
- Skipped rules grouped by reason.
- Supported, partial, and unsupported capability classifications.

Generated modules are TypeScript data modules so the normal build can bundle
and type-check them. Every generated file starts with a do-not-edit notice.

Generated artifacts are committed. Maintainers review generator diffs but do
not edit the artifacts directly.

### 5. Runtime factory

The runtime Oxlint factory imports only:

- Generated Oxlint data.
- Shared feature detection and ordering.
- Lightweight option validation and composition helpers.

It must not import ESLint, ESLint plugins, or `@oxlint/migrate`.

The factory:

1. Validates option keys and values.
2. Resolves supported auto-detection.
3. Selects generated fragments and variants in shared order.
4. Applies root ignores and rules.
5. Appends user configs.
6. Returns one plain Oxlint config object.

## Variant strategy

Do not generate the Cartesian product of every option. Generate only variants
that change emitted rules or config shape.

Examples include:

- Application versus library rule deltas.
- TypeScript disabled, enabled, and type-aware behavior.
- Framework JavaScript versus TypeScript fragments where the source config
  differs.

Variant declarations live beside the capability manifest. If a new option
changes generated behavior, its variant must be declared and reviewed before
the option can be published.

## Plugin strategy

Native Oxlint plugins always take precedence over ESLint JavaScript plugins.

A JavaScript-plugin fallback is allowed only when:

- No adequate native implementation covers the selected rules.
- The plugin handles file kinds that Oxlint supports for that integration.
- Its exact package specifier is declared in the capability manifest.
- It loads under the pinned Oxlint version.
- Relevant fixtures produce expected diagnostics.
- Its known limitations are published.

Supported JavaScript plugins are peer dependencies because package specifiers
inside imported Oxlint config objects resolve in the consumer environment.
Explicitly enabling a missing peer produces a targeted factory error.
Auto-detected integrations remain disabled when their dependency is absent.

## Failure and compatibility policy

Generation fails closed on:

- Migrator crashes.
- Invalid Oxlint configuration.
- Unknown or guessed JavaScript plugin aliases.
- Schema or load failures.
- Unexpected skipped-rule drift.
- A compatibility regression in an already supported integration.

At runtime:

- Unknown and ESLint-only option keys throw an `Unsupported Oxlint option`
  error.
- Explicitly enabled integrations with missing peer dependencies throw an
  installation error naming the package.
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

- Every native and JavaScript-plugin integration loads under pinned Oxlint.
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
- The static `recommended` export and factory-with-no-options behavior are
  tested separately.

### Packaging tests

- The published `./oxlint` entry contains no runtime import of ESLint or
  `@oxlint/migrate`.
- Generated modules and declarations are included in the package.
- Supported JavaScript plugin peer metadata matches the capability manifest.
- `oxlint`, `@oxlint/migrate`, and compatibility fixtures use aligned pinned
  versions.

## Build and release workflow

Add these script entry points:

- `generate:oxlint`: generate and validate artifacts.
- `check:oxlint-generated`: regenerate and fail on a diff.

Generation runs before the existing build and during `prepack`. CI runs the
drift check independently so a release cannot rely on an uncommitted local
generation result.

The package build adds an Oxlint entry and declaration output. README usage
documents:

- Factory and static imports.
- Supported options.
- Native versus JavaScript fallback status.
- Partial semantics.
- Unsupported ESLint features.
- Peer dependency requirements.

The initial `./oxlint` export is additive. Subsequent capability removals obey
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

Rejected from the initial scope. A generic tool can migrate resolved configs,
but it cannot infer a factory's public options, meaningful variants,
auto-detection contract, or acceptable degradation policy. This repository
will first prove the package-specific workflow.

## Consequences

### Positive

- Rules remain authored once.
- Users receive a synchronous, typed, lightweight Oxlint API.
- Generated differences are visible and reviewable.
- Compatibility gaps cannot disappear silently.
- The package can add Oxlint capabilities incrementally without overpromising
  unsupported ESLint behavior.

### Costs

- The repository gains a generator, generated artifacts, and compatibility
  fixtures.
- Oxlint and migrator upgrades require deliberate regeneration and review.
- Some familiar ESLint options remain unavailable in the Oxlint entry.
- JavaScript-plugin fallbacks require peer dependency and compatibility
  maintenance.
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
