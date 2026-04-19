# Engine Extraction + 3-Repository Split Plan (Beginner-Friendly)

Date: 2026-04-17  
Owner: You + Codex assistant  
Scope: Extract `/engine` into a standalone TypeScript npm package, then split games into independent repos:
- Neon Void
- Eva game
- RGFN

---

## 0) Why this plan

You currently have one monorepo with shared engine + multiple games. The goal is:
1. Make engine reusable and versioned as a dependency.
2. Keep each game independent (its own release cycle, issues, CI, docs).
3. Improve TypeScript quality and maintainability.

This plan is intentionally detailed so you can execute it even as a beginner in package publishing.

---

## 1) Target architecture (end-state)

### Repositories

1. `td-engine` (new)
   - Published package: `@your-scope/td-engine`
   - Contains ONLY reusable engine code + engine docs + engine tests.

2. `neon-void` (new)
   - Depends on `@your-scope/td-engine`

3. `eva-game` (new)
   - Depends on `@your-scope/td-engine`

4. `rgfn` (new)
   - Depends on `@your-scope/td-engine`

### Versioning and release contract

- Use SemVer:
  - `MAJOR`: breaking API changes
  - `MINOR`: new backward-compatible features
  - `PATCH`: bug fixes
- Every game pins engine version with a controlled range (`~x.y.z` initially, then relax if stable).

---

## 2) Workstream map (what you do vs what I do)

## You (project owner)

1. Create GitHub repos and permissions:
   - `td-engine`, `neon-void`, `eva-game`, `rgfn`
2. Create npm org/scope (if not yet):
   - e.g. `@your-scope`
3. Create npm token + configure GitHub Actions secret `NPM_TOKEN`
4. Decide license for each repo (MIT recommended unless you need stricter terms)
5. Approve final package name and public/private publishing settings
6. Approve API freezes and breaking changes
7. Run final manual gameplay acceptance on each game after migration

## Me (assistant / implementation partner)

1. Audit dependencies and map engine vs game-specific boundaries
2. Refactor engine into strict TypeScript package structure
3. Add `exports`, `types`, build pipeline, and test strategy
4. Add migration shims/adapters to reduce breakage during transition
5. Produce migration PRs repo-by-repo in safe sequence
6. Write docs, checklists, release notes, and rollback playbooks
7. Keep lint/tests green in touched code before each PR

---

## 3) Phased delivery plan

## Phase A — Discovery + API freeze (no big moves yet)

### Goals
- Stop accidental API drift before extraction.
- Identify what inside `/engine` is really shared.

### Tasks
1. Build module inventory:
   - `engine/core/*`
   - `engine/services/*`
   - `engine/systems/*`
   - `engine/rendering/*`
   - `engine/utils/*`
2. Classify each module:
   - reusable engine module
   - game-specific leakage (must move out)
3. Define initial public API in one place (`src/index.ts` in new package)
4. Mark APIs as:
   - public (supported)
   - internal (not exported)

### Exit criteria
- Written API contract approved.
- No new direct imports from games into engine internals.

---

## Phase B — Create standalone `td-engine` package

### Package structure (recommended)

```text
packages/td-engine/
  src/
    core/
    rendering/
    services/
    systems/
    utils/
    index.ts
  test/
  package.json
  tsconfig.json
  tsconfig.build.json
  eslint.config.mjs
  README.md
  CHANGELOG.md
```

### TypeScript quality baseline

Set strict compiler options:
- `"strict": true`
- `"noImplicitAny": true`
- `"exactOptionalPropertyTypes": true`
- `"noUncheckedIndexedAccess": true`
- `"declaration": true`
- `"declarationMap": true`
- `"sourceMap": true`

### API design rules

1. Prefer interfaces for contracts (`Renderer`, `StorageLike`, etc.)
2. Avoid globals/singletons unless absolutely required
3. Keep browser-specific code behind adapters
4. Export from barrel files only (`index.ts`) to keep stable import paths
5. Add clear JSDoc for all exported symbols

### Build & publish

Use:
- `npm run build` -> output `dist/`
- publish with `npm publish --access public`
- optional GitHub Actions:
  - CI on PR (`lint`, `test`, `build`)
  - publish on git tag (`v*`)

### Exit criteria
- Package builds cleanly
- Unit tests pass
- `npm pack` works
- Local consumer can install tarball and run

---

## Phase C — Migrate consumers to dependency

### Strategy (safest)

1. Use local tarball first:
   - from engine repo: `npm pack`
   - in game repo: `npm i ../td-engine/td-engine-x.y.z.tgz`
2. Replace internal imports:
   - from `../../engine/...` -> `@your-scope/td-engine`
3. Keep temporary compatibility adapters if needed
4. Only after passing tests, switch to published npm version

### Exit criteria
- Each game builds/tests against package (not local engine folder)

---

## Phase D — Split into 3 game repos

### Order (important)

1. `neon-void` split first (usually smallest)
2. `eva-game` split second
3. `rgfn` split third (largest/most complex)

### Per-game split checklist

1. Create new repo
2. Copy game folder + only required shared assets
3. Add package scripts:
   - `build`, `test`, `lint`, `typecheck`
4. Install engine dependency
5. Fix import paths and static assets paths
6. Recreate CI workflow
7. Add migration note from old monorepo path -> new repo path
8. Freeze old folder with pointer README (or archive strategy)

### Exit criteria per game
- CI green
- Game launches locally
- Smoke tests pass
- README has setup steps for beginners

---

## 4) Beginner npm package publishing guide (practical)

## Step-by-step for your first package

1. Create npm account and org/scope
2. Run `npm login`
3. Choose package name:
   - public scope example: `@your-scope/td-engine`
4. Minimal package fields needed:
   - `name`, `version`, `type`, `main`, `module`, `types`, `exports`, `files`, `license`
5. Validate package contents:
   - `npm pack --dry-run`
6. First publish:
   - `npm publish --access public`
7. Install in consumer:
   - `npm i @your-scope/td-engine`

## Very common beginner mistakes

1. Forgetting `types` field in `package.json`
2. Publishing source files accidentally (missing `files` whitelist)
3. Breaking import paths by exposing deep internals
4. Skipping changelog and then losing track of breaking changes
5. Using `latest` blindly in game dependencies (causes surprise breakages)

## Safe defaults

- Start with conservative engine upgrades: `~x.y.z`
- Keep release notes short and strict
- Never break API without major version bump

---

## 5) CI/CD template (recommended)

For every repo:
- PR pipeline:
  - install
  - lint
  - typecheck
  - test
  - build
- main-branch protections:
  - require PR review
  - require passing checks
  - disallow force push

For `td-engine` only:
- publish workflow on tag:
  - validate changelog entry
  - build/test
  - publish to npm with `NPM_TOKEN`

---

## 6) Testing strategy during migration

## Levels

1. Unit tests for engine modules
2. Integration tests for game + engine interactions
3. Smoke test script per game (launch, input, render, pause/resume)

## Must-pass gates before each split PR merge

1. TypeScript build passes
2. Lint passes
3. Existing tests pass
4. Basic gameplay smoke passes manually

---

## 7) Risk register + mitigation

1. **Risk:** Hidden coupling between engine and game logic  
   **Mitigation:** Introduce adapter interfaces and dependency injection.

2. **Risk:** Breaking import paths across games  
   **Mitigation:** Codemod + compatibility re-export layer in transition period.

3. **Risk:** Package API churn  
   **Mitigation:** API freeze document + SemVer discipline.

4. **Risk:** New-repo CI drift  
   **Mitigation:** one shared workflow template copied across repos.

5. **Risk:** Beginner publishing errors  
   **Mitigation:** dry-run publish checklist + initial canary release.

---

## 8) Concrete implementation backlog

## Backlog for me (assistant)

1. Produce engine API inventory markdown
2. Propose strict TS config for engine package
3. Implement package export surface + adapters
4. Write migration codemod notes for import path updates
5. Draft split PR templates per repo
6. Draft release checklist for `td-engine`
7. Provide troubleshooting guide for npm publishing and CI

## Backlog for you

1. Create repos and npm scope
2. Set required org/repo secrets
3. Confirm package naming and visibility
4. Approve first engine public API list
5. Execute final publish command (or approve automation)
6. Perform manual playtesting sign-off per game

---

## 9) PR structure proposal (sequence)

1. PR-1 (current monorepo): documentation + extraction prep checklist
2. PR-2 (`td-engine` repo): initial package scaffold + migrated engine code
3. PR-3 (`td-engine` repo): strict TS + tests + first release `v0.1.0`
4. PR-4 (`neon-void` repo): migrate to dependency
5. PR-5 (`eva-game` repo): migrate to dependency
6. PR-6 (`rgfn` repo): migrate to dependency
7. PR-7 each game: cleanup adapters and legacy compatibility code

---

## 10) Skills to create (high value for future PR velocity)

You asked to “create skills etc.” — this is a great opportunity. Suggested local skills:

1. `engine-package-release-skill`
   - automates version bump, changelog check, pack test, publish preflight
2. `game-repo-split-skill`
   - checklist + commands for creating a new standalone game repo safely
3. `import-migration-skill`
   - standardized process for replacing relative engine imports with package imports
4. `ts-strict-migration-skill`
   - guided sequence to convert JS/loose TS modules to strict TS with minimum regressions
5. `smoke-test-checklist-skill`
   - reproducible manual verification steps for each game mode

Each skill should include:
- Trigger conditions
- Inputs required
- Exact commands
- Expected outputs
- Recovery steps on failure

---

## 11) Definition of done (program-level)

This initiative is done when all are true:

1. `/engine` is no longer consumed via relative path from game code
2. `td-engine` has published stable version and changelog
3. Neon Void, Eva game, RGFN each live in separate repos
4. Each game CI is green and installs `@your-scope/td-engine`
5. Migration docs exist for onboarding a new contributor in <30 minutes

---

## 12) First 7 days execution schedule (recommended)

### Day 1
- finalize engine API inventory + freeze doc

### Day 2
- scaffold `td-engine` repo and strict TS config

### Day 3
- move core modules and make build pass

### Day 4
- tests + adapters + first pre-release package

### Day 5
- migrate Neon Void

### Day 6
- migrate Eva game

### Day 7
- migrate RGFN + finalize documentation

---

## 13) Commands cheat-sheet (beginner)

```bash
# engine package
npm ci
npm run lint
npm run test
npm run build
npm pack --dry-run
npm publish --access public

# in a game repo
npm i @your-scope/td-engine
npm run lint
npm run test
npm run build
```

---

## 14) Final note

We should treat this as a product migration, not just a folder move. The technical success metric is stable package consumption; the practical success metric is that you can release any game independently without touching others.
