# Version 0.5 upgrade reference

This upgrade keeps the root ESLint factory and synchronous `/oxlint` factory APIs.
It refreshes dependencies and recommended rules, so consumers can see new findings.
Nir's React/Solid, classname-components, accessibility, TypeScript, editor, and
stylistic defaults remain in place. Unicorn's renamed `name-replacements` rule
stays disabled, matching the previous `prevent-abbreviations` customization.
Unicorn's new documentation-comment rule stays disabled to preserve JSDoc/TSDoc.

## Upstream review

Compared `antfu/eslint-config` snapshot
`5ada54fd1f6527b012203c9694212eb8fa11bc82` with current upstream main
`bb2013690a517ea9b369d36d79a5708356326a64` (v10.0.0, reviewed November 10, 2026).
The review covers the 25 commits between those points. This release is explicitly
requested package maintenance, separate from the bounded automatic ledger workflow.

- Adopt dependency updates, stabilize `antfu/consistent-list-newline`, and enable
  `antfu/reasonable-newline` within the existing stylistic integration.
- Adopt `devEngines` package sorting and `minimumReleaseAgeExcludePrune` in the
  pnpm settings rule. `scripts-info` sorting and erasable export-alias validation
  were already present.
- Keep erasable-syntax-only bundled: this fork enables it by default and needs it
  for the standalone Oxlint entry. Upstream's optional peer change does not fit.
- Keep the existing pnpm field ordering and stylistic API in this release;
  upstream's workspace blank-line policy is deferred to avoid changing YAML
  formatting when this fork disables stylistic rules.
- Defer the new antislop option and its composition fix: it introduces new
  plugins and policy beyond the existing consumer API and Oxlint parity surface.
- Keep the existing JSONC parser integration rather than upstream's language
  migration, and keep the fork's semi, quote, and brace defaults.
- Upstream release commits and contributor-specific documentation need no port.
  The Zed formatting recommendation remains optional editor configuration.

## Dependencies and compatibility

All declared dependencies were refreshed against the registry. The lockfile
records the resolved versions, including Oxlint/migrate 1.93.0, ESLint 10.14.0,
TypeScript 6.0.2, and Unicorn 79.0.0. Existing compiler aliases and the
`@typescript-eslint/utils` override remain aligned with their toolchain.

`@eslint-react/eslint-plugin` 5.28.8 and `eslint-plugin-storybook` 10.6.6 are
intentional exceptions to latest: newer releases were inside pnpm's release-age
cooldown during this run. No new cooldown exclusions are required. The preexisting
classname-components exclusion remains. Existing optional integrations retain
their peer API. Updated plugin types no longer need the security type suppression.

Oxlint artifacts are regenerated from the ESLint sources. Browser globals now
use native environments where emitted by the migrator. Native plugins are also
enabled on feature override blocks so test overrides load without requiring a
consumer workaround. Type-aware JS-plugin rules that Oxlint cannot execute remain
listed in the compatibility report; the upgrade does not claim full ESLint parity.

## Minimal consumer setup

Install `@nirtamir2/eslint-config@^0.5.0`, `eslint@^10.14.0`, and
`oxlint@^1.93.0` as development dependencies. Add `oxlint-tsgolint@^7.0.2006`
and TypeScript when native type-aware lint is needed. Optional framework plugins
are needed for ESLint integrations that use them; unrelated framework peers do
not need to be installed. Add Prettier only when the project uses it for formatting.

```
// oxlint.config.ts
import nirtamir2 from "@nirtamir2/eslint-config/oxlint";

export default nirtamir2({
  react: true, // or solid/vue, as appropriate for the project
  typescript: { typeAware: true },
});
```

Use `oxlint --threads=2` for lint, `oxlint --threads=2 --fix` for fixes, and
`tsc --noEmit` for type checking. Native type-aware lint uses `oxlint --type-aware`.
Keep an ESLint pass when the project needs parser-service rules omitted by Oxlint.
The default export is a config object; consumers do not call it a second time.

## Release workflow

After review and merge, the coordinator tags the merged commit
`eslint-config-v0.5.0` and pushes that tag. The package version is already bumped;
do not run a second version bump. `.github/workflows/release.yml` first installs
with the frozen lockfile and checks generated data, then calls
`sxzz/workflows/.github/workflows/release.yml@v1` with `publish: true` and OIDC
`id-token: write`. The previous v0.4.2 release run `38321778373` succeeded.
Verify that the new Release run succeeds and npm's latest tag resolves to 0.5.0
before updating consumers from local or preview dependencies. No manual npm
publish, deployment, or secret inspection is needed.
