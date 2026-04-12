# Agent Pre-PR Checklist (Mandatory)

This file is a hard reminder for every future task.

## Required order before publishing results

1. Run the correct lint scope for touched code.
2. Fix all lint errors/warnings that are in scope for the task.
   - Super important: never disable lint/style rules to make output clean.
   - Remove any suppression lines you encounter (`eslint-disable*`, equivalent rule-disable comments, etc.).
   - Fix root causes in code (refactor/extract/reformat) and then re-run lint.
3. Run style-guide audit and drive these to zero for active RGFN refactor tasks:
   - Rule 3 (file <= 200 lines) violations
   - Rule 2 (named function <= 20 lines) potential violations
   - Rule 16 (folder <= 10 children) violations
4. Run tests.
5. Only after steps 1-4 are clean, publish/commit/PR.

## RGFN command set

```bash
npm run lint:ts:rgfn
npm run style-guide:audit:rgfn
npm test
```

## Clean-output target example

```text
- Rule 3 (file <= 200 lines) violations: 0
- Rule 2 (named function <= 20 lines) potential violations: 0
- Rule 16 (folder <= 10 children) violations: 0

Top files over limit:
  - none

Top files with long functions (first samples):
  - none

Top folders over children limit:
  - none
```

If any item is non-zero, continue refactor and re-run checks before reporting completion.
