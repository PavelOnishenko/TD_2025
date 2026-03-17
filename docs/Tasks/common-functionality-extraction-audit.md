# Common functionality extraction audit (Neon Void + Eva + RGFN)

## Scope reviewed
- `js/` (Neon Void root game)
- `eva_game/js/`
- `rgfn_game/js/`
- Existing `engine/` usage

## What is already shared well
- Core loop, renderer, input manager, and base entity model are already being reused by Eva and RGFN from `engine/`.
- Viewport math is already centralized in `engine/systems/ViewportManager.js`, and Neon Void wraps it via `js/systems/viewportManager.js`.

## New extraction opportunities

### 1) Shared engine TypeScript declaration package (high value, low risk)
**Why now:** each project keeps its own engine declaration surface and they have drifted.

- Eva defines module declarations for `GameLoop`, `Renderer`, `InputManager`, `Entity`, and `ViewportManager` in `eva_game/js/engine.d.ts`.
- RGFN defines very similar declarations in `rgfn_game/js/engine.d.ts`.
- Neon Void has another engine declaration shape in `js/engine.d.ts`.

**Recommendation:** move these into one canonical declaration file in `engine/types/` (or generated `.d.ts`) and have all projects import from that single source.

**Payoff:**
- Stops type drift and mismatched signatures.
- Faster feature additions in engine modules (change once, consumed by all).

### 2) Reusable save-state adapter for localStorage / platform storage (high value, medium risk)
**Why now:** two games already implement snapshot/versioned persistence with custom plumbing.

- Neon Void persistence does validation/version gating and serializes game snapshot data via storage helpers.
- RGFN does versioned snapshot save/load with change detection and localStorage writes.

**Recommendation:** extract an `engine/services/SaveStateStore` with:
- key/version handling,
- load/parse/validate hooks,
- optional change-detection (`lastSnapshot`) write suppression,
- pluggable backend (`localStorage`, CrazyGames SDK data client, etc.).

**Payoff:**
- New games get save/load quickly with less boilerplate.
- Cleaner migration path when save versions change.

### 3) Input binding/bootstrap helper (medium value, low risk)
**Why now:** both Eva and RGFN re-implement the same event wiring pattern.

- Eva maps actions/axes and binds `keydown`/`keyup` listeners in `Game.setupInput()`.
- RGFN maps actions and binds the same listeners in `GameInputSetup.configure()`.

**Recommendation:** add an engine utility like `bindKeyboardInput(inputManager, bindings, target=document)` that:
- registers action/axis maps,
- attaches listeners,
- returns a cleanup function for unmount/restart safety.

**Payoff:**
- Less repetitive setup code in each game entrypoint.
- Encourages consistent key handling and lifecycle cleanup.

### 4) Game bootstrap skeleton for canvas games (medium value, medium risk)
**Why now:** startup concerns recur across games with slight differences.

- Neon Void main bootstrap does canvas lookup, game creation, resize binding, UI/audio/init hooks.
- Eva main does canvas lookup, start/pause/restart overlays, and resize wiring.
- RGFN main does canvas lookup and game startup.

**Recommendation:** extract an optional `engine/bootstrap/createCanvasGameBootstrap(...)` for common lifecycle steps:
- find canvas and validate,
- instantiate game,
- start policy (`auto` or gated by UI),
- optional resize hook,
- optional debug hotkey registration.

**Payoff:**
- Faster startup scaffolding for future prototypes.
- Lower chance of entrypoint inconsistencies.

## Probably not worth extracting yet
- Game-specific combat/mode systems in Eva/RGFN are still domain-specific and unlikely to generalize cleanly.
- Neon Void enemy/tower behavior is currently tightly coupled to that project’s mechanics.

## Suggested extraction order
1. **Engine `.d.ts` unification** (quick win).
2. **Save-state adapter service** (big long-term leverage).
3. **Input bootstrap helper**.
4. **Optional bootstrap skeleton** after first three stabilize.

## Practical next step
If you want, I can implement step 1 immediately as a low-risk first PR, then follow with step 2 in a second PR so save logic refactor is isolated.
