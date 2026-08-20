# Vendored: anti-slop

These files are copied verbatim from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop),
by Dillon Mulroy, MIT licensed. See `LICENSE` in this directory.

Upstream advises vendoring rather than depending on a published package: the plugin is
not published to npm, and `oxlint-plugin-anti-slop` is marked `private`.

| | |
| --- | --- |
| Upstream ref | `6d538555cb151d4121ed51a27db81890eacf8ae9` |
| Vendored on | 2026-08-20 |
| Upstream path | `src/` |

## What was copied

`index.ts`, `rules/*.ts` (15 rules) and `shared/*.ts`. Deliberately **not** copied:

- `src/effect/` — the opt-in Effect rule group, which encodes Effect Layer/service
  architecture policy this package does not take a position on.
- `src/**/*.test.ts` — upstream's tests are standalone `tsx` scripts, not Vitest.

## Keeping this in sync

Files here are kept **byte-identical to upstream** so the diff stays readable. They are
excluded from this repo's Prettier and ESLint runs (see `.prettierignore` and
`eslint.config.ts`) for that reason — do not reformat them.

To re-sync, run `pnpm sync:anti-slop`, which rewrites this tree from a pinned upstream
ref and updates the ref recorded above. Review the diff before committing; a rule that
gains or loses an id needs a matching change in `src/oxlint/anti-slop.ts`, which is the
single source of truth for the rule-name list.
