# Contributing Workflow

## Required quality gate for every task

For every code task in this repository, run the TypeScript style checks and tests before submitting changes:

```bash
npm run check:ts-style
npm test
```

If lint reports any errors, fix them immediately and rerun lint before publishing the result.

Detailed policy and Style Guide mapping: `docs/TypeScript_Linter_Workflow.md`.

## Game-scoped linting (RGFN-only tasks)

If the task is **only** for RGFN (`rgfn_game/`), you can run lint only for that game instead of linting all TypeScript projects:

```bash
npm run lint:ts:rgfn
npm run lint:ts:rgfn:fix
```

`npm run lint:ts:rgfn` now runs:
1) ESLint for `rgfn_game/**/*.ts`, and
2) style-guide audit report for `rgfn_game/` only (`Top files over limit`, `Top files with long functions`, `Top folders over children limit`).

Use full-repository lint (`npm run lint:ts`) when your changes affect shared code (for example `engine/`, root-level scripts/config, or multiple games). Use `npm run style-guide:audit` for repository-wide audit output, or `npm run style-guide:audit:rgfn` for RGFN-only audit output.
