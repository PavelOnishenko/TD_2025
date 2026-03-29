# Contributing Workflow

## Required quality gate for every task

For every code task in this repository, run the TypeScript style checks and tests before submitting changes:

```bash
npm run check:ts-style
npm test
```

If lint reports any errors, fix them immediately and rerun lint before publishing the result.

Detailed policy and Style Guide mapping: `docs/TypeScript_Linter_Workflow.md`.
