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

Use full-repository lint (`npm run lint:ts`) when your changes affect shared code (for example `engine/`, root-level scripts/config, or multiple games).
