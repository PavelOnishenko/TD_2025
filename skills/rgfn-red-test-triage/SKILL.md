---
name: rgfn-red-test-triage
description: Triage and resolve RGFN test failures in this repository. Use when asked to fix failing/red RGFN tests, especially when failures reference rgfn_game/dist module imports, test expectation drift, or build-vs-test sequencing issues.
---

# RGFN Red Test Triage

Follow this workflow.

1. Run the canonical test entrypoint:
   - `npm run test:rgfn`

2. If command is unavailable or failing due dist import errors, run:
   - `npm run build:rgfn`
   - `node --test rgfn_game/test/**/*.test.js`

3. Classify failure type:
   - **Dist/module not found**: fix test sequencing (build before test).
   - **Assertion mismatch**: treat current production behavior as source of truth unless user requests behavior change.
   - **Environment-only issue**: document limitation and provide deterministic local rerun command.

4. After fixes, rerun:
   - `npm run test:rgfn`

5. Capture learnings in markdown:
   - Add/update `rgfn_game/docs/testing/` with concrete failure signatures, root cause, and exact recovery commands.

Keep edits minimal and production-safe.
