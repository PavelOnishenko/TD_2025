---
name: neon-void-formations-ts-migration
description: Workflow for continuing Neon Void formation-system TypeScript migration with OOP-first structure, mixed JS/TS compatibility, and deterministic validation commands.
---

# Neon Void Formations TS Migration

Use this when continuing migration work around `js/core/game/formations*`.

## Goals
- Keep runtime stable for legacy JS call-sites.
- Migrate logic in small OOP units (manager/parser/planner/resolver).
- Maintain zero lint warnings in touched TS files.

## Required flow
1. Inspect current checkpoints:
   - `docs/NEON_VOID_MIGRATION_NOTES.md`
   - `docs/NEON_VOID_TYPESCRIPT_MIGRATION.md`

2. Keep mixed-mode compatibility:
   - Do **not** remove `js/core/game/formations.js` unless all runtime importers are migrated.
   - Implement new logic in `js/core/game/formations.ts` and `js/core/game/formations/*.ts` first.

3. Use OOP-first split:
   - Parser (`FormationParser`)
   - Planner (`FormationPlanner`)
   - Difficulty resolver (`WaveDifficultyResolver`)
   - Manager orchestration (`FormationManager`)

4. Validation commands (run all):
   - `npx eslint js/core/game/formations.ts js/core/game/formations/*.ts`
   - `npm run build`
   - `node --test test/game/formations.test.js`

5. Documentation update (mandatory):
   - Append migration checkpoint details to `docs/NEON_VOID_MIGRATION_NOTES.md`.
   - Update progress/next-step section in `docs/NEON_VOID_TYPESCRIPT_MIGRATION.md`.

## Known repo-level caveat
- Root `npm test` includes eva/rgfn tests that may fail without their own `dist/` builds; treat this as out-of-scope unless the task explicitly targets those suites.
