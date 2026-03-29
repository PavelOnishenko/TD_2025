# TypeScript Linter and Style Guide Workflow

## Goal

This repository now has a **single TypeScript linter workflow** that should be run for every task before code is submitted for review.

Mandatory expectation for every change:

1. Run the TypeScript linter.
2. Review the results.
3. Fix all blocking lint errors.
4. Re-run lint until it is clean.
5. Run tests.
6. Only then prepare code for review.

## Commands

```bash
npm run lint:ts
npm run lint:ts:fix
npm run style-guide:audit
npm run check:ts-style
```

What each command does:

- `npm run lint:ts` — runs ESLint for all `.ts` files in the repository.
- `npm run lint:ts:fix` — same as above, but auto-fixes supported issues.
- `npm run style-guide:audit` — informational audit for style-guide rules that are hard to fully auto-enforce.
- `npm run check:ts-style` — runs lint + audit in one command.

## Mandatory execution policy for every task

Before publishing any code changes:

1. Run `npm run lint:ts`.
2. If there are errors, run `npm run lint:ts:fix` and/or make manual fixes.
3. Run `npm run lint:ts` again and ensure there are no errors.
4. Run tests (`npm test`, and any relevant project-specific tests).
5. Include lint/test command output summary in task notes or PR.

If lint reports errors, code is **not ready** for review.

## How this maps to `docs/Style_Guide.txt` (17 rules)

The style guide contains both objective and subjective rules.

### Enforced as lint warnings (repository-wide baseline)

1. **Rule 1**: max line length (170 chars) — ESLint `max-len`.
2. **Rule 4**: 4-space indentation — ESLint `indent`.
3. **Rule 14**: no one-liner `if` — ESLint `curly`.
4. **Rule 15**: concise formatting where reasonable — partially supported by the same rules.
5. Unused variables are warnings to help code cleanliness.

Warnings are visible for all TypeScript files so they can be fixed incrementally. For touched code, warnings should be treated as actionable and fixed whenever practical.

### Audited (informational report)

1. **Rule 2**: named functions <= 20 LOC.
2. **Rule 3**: files <= 200 LOC.
3. **Rule 16**: <= 10 immediate children per folder.

These are tracked by `npm run style-guide:audit` so the team can gradually reduce technical debt while keeping active delivery speed.

### Manual/code-review rules (cannot be reliably auto-verified)

- Rule 5: extract repeated code.
- Rule 6: avoid repeated calculation by introducing variables.
- Rule 7: meaningful naming.
- Rule 8: self-explanatory code.
- Rule 9: flexible class decomposition.
- Rule 10: optimize for “right now”.
- Rule 11: testability.
- Rule 12: balanced LOC during extraction.
- Rule 13: simplicity and effectiveness.
- Rule 17: collection/object initialization layout choices beyond the baseline lint checks.

These must be checked by the author and reviewer during implementation and review.

## Recommended task template (copy-paste)

```text
Pre-review checklist:
- [ ] npm run lint:ts
- [ ] npm run style-guide:audit
- [ ] npm test
- [ ] Relevant project-specific tests
- [ ] All lint errors fixed
```

## Why this is intentionally split into lint + audit

Some style-guide rules are architectural and cannot be enforced safely as hard fail rules without breaking a lot of existing code at once.

This setup gives:

- strict, automatic checks for objective syntax/style issues;
- transparent audit visibility for structural debt;
- a repeatable policy that can be tightened over time.
