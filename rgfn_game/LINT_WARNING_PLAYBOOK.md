# RGFN Lint Warning Playbook

## What was fixed

This pass removed style-guide and ESLint warnings in core RGFN gameplay modules by applying consistent patterns:

- Converted single-return methods to concise arrow members/functions when requested by `style-guide/arrow-function-style`.
- Repacked comma-separated parameter lists and initializers to satisfy `style-guide/rule17-comma-layout`.
- Broke long expressions and object literals to satisfy `max-len` (170 char cap).
- Added explicit braces for single-line conditionals (`curly`) where eslint autofix applied it.

## Useful patterns for future edits

- **Single-expression method in classes**
  - Prefer: `private fn = (a: A): B => expr;`
- **Dependency-heavy factory constructors**
  - Keep callback bags and argument lists multiline with one property per line once length approaches 170.
- **Rule 17 compactness guidance**
  - If a parameter list can fit in one line under the configured threshold, keep it on one line.
  - Otherwise, split clearly and keep each internal line under 170 chars.

## Test/lint workflow notes

From repository root:

1. Lint only the RGFN TypeScript scope:
   - `npm run lint:ts:rgfn:eslint`
2. Full RGFN lint + style audit:
   - `npm run lint:ts:rgfn`
3. Full test suite currently depends on built `dist/` artifacts for `rgfn_game` and `eva_game` tests:
   - `npm test` will fail early with `ERR_MODULE_NOT_FOUND` if dist files are missing.

## Optional follow-up ideas

- Add a dedicated script that builds required dist outputs before `node --test`.
- Consider adding a focused `test:rgfn` script that excludes unrelated suites when iterating on RGFN-only changes.
