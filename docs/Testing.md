# Test Execution Guide

This project uses the Node.js test runner.

## Quick Start

```bash
npm test
```

The command requires Node.js 18 or newer.

## Important: build-dependent test suites

Part of the repository test coverage imports generated JavaScript from:

- `eva_game/dist/...`
- `rgfn_game/dist/...`

If these build artifacts are absent, `npm test` fails with `ERR_MODULE_NOT_FOUND` before reaching the corresponding assertions.

Run this sequence to get meaningful results:

```bash
npm run build:eva
npm run build:rgfn
npm test
```

## Known failure categories to report explicitly

When tests fail, include the category in the report so the next person can react quickly:

1. **Environment/setup failures**
   - Example: missing `dist` files (`ERR_MODULE_NOT_FOUND`).
   - Typical fix: run build commands above.
2. **Logic/regression failures**
   - Example: assertion mismatch or runtime error in game logic.
   - Requires code/debug follow-up.

## Screenshot/reporting note for CI-like environments

If there is no browser/screenshot tool in the execution environment, prefer an actionable message instead of a generic warning.

Recommended wording:

> ⚠️ Screenshot not attached: browser/screenshot tool is unavailable in this environment.  
> Action taken: validated changes via automated tests and attached command output.  
> Next step: capture UI screenshot locally (or in CI job with browser support) before release if visual verification is required.

This keeps the status transparent while also documenting what was verified and what remains.
