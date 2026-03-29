# TypeScript Linter and Style Guide Workflow

## Goal

This repository now has a **TypeScript linter workflow** with both repository-wide and game-scoped options.

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
npm run lint:ts:rgfn
npm run lint:ts:rgfn:fix
npm run style-guide:audit
npm run style-guide:audit:rgfn
npm run check:ts-style
```

What each command does:

- `npm run lint:ts` — runs ESLint for all `.ts` files in the repository.
- `npm run lint:ts:fix` — same as above, but auto-fixes supported issues.
- `npm run lint:ts:rgfn` — runs ESLint only for TypeScript files inside `rgfn_game/`, then prints style-guide audit sections for `rgfn_game/` scope.
- `npm run lint:ts:rgfn:fix` — same as above, but auto-fixes supported issues first.
- `npm run style-guide:audit` — informational audit for style-guide rules that are hard to fully auto-enforce.
- `npm run style-guide:audit:rgfn` — same audit report but scoped to `rgfn_game/` only.
- `npm run check:ts-style` — runs lint + audit in one command.

## Choosing the right lint scope

- **RGFN-only task (`rgfn_game/`)**: run `npm run lint:ts:rgfn` (or `npm run lint:ts:rgfn:fix`).
  - This command includes style-guide sections in output:
    - `Top files over limit`
    - `Top files with long functions (first samples)`
    - `Top folders over children limit`
- **Cross-game/shared task** (e.g. `engine/`, root config/scripts, or multiple games): run `npm run lint:ts`.

This keeps RGFN work fast while still preserving full-repository checks when changes can impact other games.

## Mandatory execution policy for every task

Before publishing any code changes:

1. Choose lint scope:
   - RGFN-only: `npm run lint:ts:rgfn`
   - Cross-project/shared: `npm run lint:ts`
2. If there are errors, run the matching `:fix` command and/or make manual fixes.
3. Re-run the same lint command and ensure there are no errors.
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
- [ ] Use correct lint scope (`npm run lint:ts:rgfn` for RGFN-only, otherwise `npm run lint:ts`)
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

## Practical Rule 17 note (collection/object initialization)

For `docs/Style_Guide.txt` Rule 17, always minimize LOC while staying within Rule 1 max line length (170 chars).

Use this priority order for collection/object initialization:

1. **Single-line form (preferred):** keep all members on one line with braces when line length allows.
2. **Two-brace-lines form:** if one line is too long, keep members on one internal line between opening/closing brace lines.
3. **Two-member-lines form:** if still too long, split members across two internal lines.
4. **One-member-per-line form:** only when required by max length/readability constraints.

Applied example for `rgfn_game/js/config/creatureTypes.ts`:

- `createZeroSkills` should remain a compact single-line object return because it fits within Rule 1.

This section intentionally mirrors Rule 17 so future edits consistently choose the minimum-line acceptable form first.
