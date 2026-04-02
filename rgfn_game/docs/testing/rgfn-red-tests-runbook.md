# RGFN red-tests runbook

## Why RGFN tests sometimes fail all at once

RGFN tests import compiled files from `rgfn_game/dist/**`, not TypeScript source files.
If the dist output is missing or stale, many tests fail with `ERR_MODULE_NOT_FOUND` (for example, missing `rgfn_game/dist/entities/Skeleton.js`).

This is expected behavior for the current production layout: runtime code is consumed from built JS artifacts.

## Canonical test command

Use the script that always rebuilds first:

```bash
npm run test:rgfn
```

That command performs:
1. `npm run build:rgfn`
2. `node --test rgfn_game/test/**/*.test.js`

## Fast diagnosis checklist

1. Confirm dist exists:
   ```bash
   test -f rgfn_game/dist/entities/Skeleton.js && echo "dist ok" || echo "dist missing"
   ```
2. Rebuild:
   ```bash
   npm run build:rgfn
   ```
3. Re-run tests:
   ```bash
   node --test rgfn_game/test/**/*.test.js
   ```

## Typical failure signatures and meaning

- `Error [ERR_MODULE_NOT_FOUND]: ... rgfn_game/dist/...`
  - Meaning: build artifacts missing/outdated.
  - Fix: rebuild RGFN (`npm run build:rgfn`) and rerun tests.

- Assertion failure in an individual `*.test.js`
  - Meaning: behavior mismatch between test expectation and current product logic.
  - Fix: align test expectations to current production behavior or patch code intentionally (only if product behavior is truly incorrect).

## Notes for contributors

- Running repo-wide `npm test` may still fail for non-RGFN suites unless other build prerequisites are satisfied.
- For RGFN-specific validation, prefer `npm run test:rgfn`.
