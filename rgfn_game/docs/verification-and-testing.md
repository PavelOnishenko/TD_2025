## March 25, 2026 update: village populations are now persistent per settlement

### What changed
- Villagers are now generated once per village name and cached in `VillagePopulation`.
- Re-entering the same village no longer re-rolls NPC roster size, colors, animations, or base routing indices.
- Different villages still receive different villager rosters.
- On re-entry, villagers are re-aligned to current village layout coordinates (important when canvas size changes) before rendering resumes.

### Why this matters
- Fixes immersion break where villagers changed every time the player left and re-entered the same village tile.
- Keeps village social context stable over time while preserving per-village uniqueness.

### Files involved
- `js/systems/village/VillagePopulation.ts`
- `js/systems/village/VillageLifeRenderer.ts`
- `test/systems/villagePopulation.test.js`

### Verification checklist
1. Enter village A, note visible villagers (count/look).
2. Leave and re-enter village A multiple times.
3. Confirm same villagers remain present.
4. Travel to village B and confirm villagers differ from village A.
5. Return to village A and confirm original villagers are restored.

# Verification and Testing Discussion

## March 25, 2026 update: village sidebar now shows current village name

### Problem observed
- Village UI heading was static (`Village`) and did not show the current settlement name.
- This caused avoidable orientation friction when moving between multiple villages or quickly re-entering from world mode.

### Changes made
- Added a dedicated village title element ID in the village sidebar (`#village-title`).
- Extended `VillageUI` typing + UI factory wiring so runtime code can update this header directly.
- Updated village entry flow so `VillageActionsController.enterVillage(...)` sets heading text to `Village: <currentVillageName>`.

### Why this implementation
- The game already passes canonical village names through `WorldMap -> GameVillageCoordinator -> VillageActionsController`.
- Reusing that flow avoids duplicate state and keeps title updates deterministic across both first entry and re-entry.

### Regression checks
1. Discover/enter a village and verify heading shows its real name.
2. Leave and re-enter the same tile (Space or world panel button) and confirm heading still matches that village.
3. Travel to a different village and confirm heading updates to the new name.
4. Confirm village prompt/actions still open/close as before.

### Commands run for this change
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`

## March 25, 2026 update: vitality save should keep full HP at full-health breakpoint

### Bug report context
- Repro from gameplay UI:
  1. Character HP is currently full (`hp === maxHp`), e.g. `7/7`.
  2. Player allocates points into **vitality** and clicks **Save**.
  3. Before fix, `maxHp` increased but `hp` stayed unchanged (e.g. `7/9`).
- Expected behavior: when character was already at full HP before the vitality save, current HP should track new max (e.g. `9/9`).

### Root cause
- `Player.addStat(...)` recalculated derived stats via `updateStats()`, then clamped HP using `Math.min(this.hp, this.maxHp)`.
- That clamp preserved the old numeric HP value, but it did not preserve the "was full" state.

### Resolution
- Added a full-HP guard in `Player.addStat(...)`:
  - capture `hadFullHp` before recalculation,
  - if true after stat application, set `hp = maxHp`,
  - otherwise preserve prior value with standard clamp (`Math.min(previousHp, maxHp)`).
- This keeps non-full HP behavior stable while fixing the full-HP vitality-save flow.

### Regression test added
- New entity test: `Player keeps full HP state when max HP increases from vitality`.
- The test verifies:
  - max HP increases after vitality allocation,
  - HP remains exactly equal to max HP when player started at full HP.

### Suggested manual smoke checks
1. Open character with full HP (e.g. `7/7`), allocate vitality, press Save → confirm `9/9` style result.
2. Repeat when not full HP (e.g. `4/7`), allocate vitality, press Save → confirm current HP does **not** jump to full.
3. Confirm intelligence/connection upgrades still preserve existing mana behavior.
## March 25, 2026 update: village sell-list synchronization hardening

### Problem observed
- In village mode, the **Sell inventory item** dropdown could occasionally show a stale snapshot of inventory contents after buy-driven inventory changes.
- Result: players could see incomplete sell choices until another village UI refresh happened.

### Changes made
- Added proactive sell-list refresh hooks on the sell dropdown itself:
  - refresh on `focus`
  - refresh on `pointerdown` (right before opening)
- This keeps sell options synchronized with the most current inventory right as the player opens/uses the control.
- Also fixed sell button enablement logic to follow the select's disabled state directly, preventing action enablement drift when placeholder text is shown.

### Regression checks
1. Enter village and buy items multiple times in a row.
2. Open the sell dropdown immediately after each buy and confirm every current inventory item is listed.
3. Sell until inventory is empty and confirm:
   - dropdown shows placeholder text,
   - **Sell selected** button is disabled.
4. Obtain a new item, reopen sell dropdown, confirm button re-enables and item appears.

### Commands run for this change
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`

## March 2026 update: village re-entry controls on world map

### Feature summary
- Added a world-map action button: **Enter Village (Space)**.
- Added keyboard shortcut: **Space**.
- Both controls re-enter village mode when the player is standing on a village tile (including immediately after leaving a village).
- If used away from a village tile, game stays in world mode and writes a guidance log message.

### Why this was needed
- Previously, entering villages was mostly movement-driven encounter flow.
- After leaving a village while still standing on that same tile, there was no direct "re-enter now" action.
- New behavior mimics old Fallout-style interaction: stand on location and press action key/button.

### Regression checks to keep
1. Enter a village by moving onto a village tile still works.
2. Leave village, press **Space**, and confirm village prompt opens again.
3. Leave village, open World Map panel, click **Enter Village (Space)**, and confirm village prompt opens again.
4. Press **Space** while not on a village tile and confirm no state transition occurs.
5. Confirm existing world controls still work: movement, zoom, pan, centering.

---

## March 2026: Battle view player visibility fix

### Change summary
- The player battle rendering now draws a visible mini-avatar (shadow/body/head/shoulders) in addition to the HP bar.
- Previously, players could appear as "only a highlighted cell + tiny HP bar", especially when turn highlights moved to enemies.

### Fast regression checklist for this specific area
1. Start a battle and confirm the player pawn is clearly visible in their tile even when it is **not** the player's turn.
2. Confirm enemy sprites still draw correctly and are not occluded by player rendering.
3. Verify HP bars still render above entities and update after damage.
4. Enter/exit battle mode and ensure no rendering artifacts remain on world map.
5. Resize browser window during battle and confirm avatar scales/positions correctly with battle grid resize.

### Programmatic verification commands
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`

---

## March 24, 2026 – Inventory Equip Regression Note

### Problem statement
- Reported UX bug: picking up a weapon could immediately equip it, even when the player intended to keep current loadout.
- This behavior came from `PlayerInventory.addItem(...)`, which auto-equipped any weapon/armor that passed `canEquip`.

### Resolution summary
- Updated inventory behavior so pickup only adds items to bag storage.
- Equipment changes are now explicit-only via:
  - inventory click/drag equip actions,
  - direct slot interactions,
  - explicit equip APIs.

### Regression coverage added/updated
- `Player inventory keeps discovered equipment in inventory until explicitly equipped`
  - verifies that newly found weapons/armor stay in inventory and do not alter equipped state.
- `Equipped items are removed from inventory and return on unequip`
  - now performs explicit equip actions first, then validates round-trip equip/unequip behavior.

### Commands run for this change
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`
- `node --test rgfn_game/test/entities/player.test.js`

### Current suite status snapshot
- The focused player tests pass after this fix.
- The full `rgfn_game` suite still contains at least one unrelated pre-existing failure in `creatures.test.js` (`Enemy archetypes derive resulting stats from base stats plus shared skills`), which is outside the inventory workflow touched here.

## How I Verified the XP Fix

### The Honest Truth
I didn't actually run the game and verify the fix works through manual testing. Here's what I actually did:

1. **Code Inspection**
   - Read through the codebase to understand the data flow
   - Traced how XP is awarded in `handleAttack()` when an enemy dies
   - Identified issues by reading the code, not by seeing it fail

2. **Issues Found by Analysis**
   - Type casting: `(target as any).xpValue` was unreliable - better to cast to `Skeleton` explicitly
   - Missing HUD updates: `updateHUD()` wasn't called when entering/exiting battle modes
   - The XP award logic was there but UI updates weren't propagating to world mode

3. **Fixes Applied Through Logic**
   - Made the type cast explicit: `const skeleton = target as Skeleton`
   - Added `updateHUD()` calls to `enterWorldMode()` and `enterBattleMode()`
   - Already had `updateHUD()` after kills but added one after every attack too

4. **TypeScript Compilation**
   - Ran `npx tsc` to ensure no type errors
   - This catches syntax and type issues but doesn't verify runtime behavior

5. **Debug Logging Added**
   - Added `console.log()` statements to track XP awards
   - These will help YOU verify it works when you run the game
   - Example output: `Skeleton defeated: Skeleton XP Value: 3`

### What I Can't Know
- Whether the XP actually increments when you play
- Whether the HUD visually updates correctly in the browser
- Whether returning to world map preserves the XP/level/skill points
- Whether the level up animation/messages appear correctly
- Whether there are edge cases or timing issues

### You Need To Verify
The fix is **logically sound** based on code analysis, but you need to:
1. Open the game in a browser
2. Kill a skeleton
3. Check the browser console for debug messages
4. Verify the HUD shows "+3 XP"
5. Verify XP persists after returning to world map
6. Level up and verify skill points are granted

---

## Should RGFN Have Tests Like Neon Void?

### Neon Void's Test Coverage
I checked the root project (Neon Void) and it has **extensive tests**:
- 30+ test files covering:
  - Game logic (wave management, enemy spawning, projectiles)
  - Engine systems (Entity, GameLoop, Renderer, InputManager)
  - Game systems (saves, high scores, audio)
  - State management
  - Asset loading
  - Integration tests

They use Node.js built-in test runner with assertions and mocked helpers.

### Would Tests Be Good For RGFN?

**YES - If You Want Confidence**

The RGFN game has complex systems that would benefit from tests:

#### What Should Be Tested
1. **Level System Math**
   - XP calculation: `getXpForLevel(level)` returns correct values
   - Total XP: `getTotalXpForLevel(5)` = sum of levels 1-4
   - XP overflow: Gain 20 XP at level 1, verify it levels up AND carries over

2. **Stat Conversions**
   - `calculateMaxHp(vitality)`: Verify formula (5 + vitality × 1)
   - `calculateArmor(toughness)`: Verify 3 points = 1 armor
   - `calculateTotalDamage(strength)`: Verify 2 points = +1 damage

3. **Player Leveling**
   - `player.addXp(5)`: Should level from 1 → 2
   - `player.addXp(15)`: Should level multiple times
   - Verify skill points granted correctly
   - Verify HP heals to full on level up

4. **Combat Mechanics**
   - `player.takeDamage(8)` with 3 armor: Should take 5 damage
   - `player.takeDamage(2)` with 3 armor: Should take 1 damage (minimum chip damage)
   - Skeleton dies → XP awarded correctly


**Armor rule note:** Armor reduces incoming damage, but positive hits always deal at least 1 damage.

5. **Stat Allocation**
   - `player.addStat('vitality')`: Decrements skill points, increases maxHp
   - Verify can't allocate without skill points
   - Verify HP percentage preserved (not healed mid-battle)

#### Benefits
- **Catch regressions**: If you change XP formula, tests fail
- **Refactoring confidence**: Change internals, tests verify behavior unchanged
- **Document behavior**: Tests show how systems should work
- **Balance tuning**: Verify damage/armor formulas work as intended

#### Costs
- **Time to write**: Initial investment to set up test infrastructure
- **Maintenance**: Tests need updating when you change systems
- **Overhead**: RGFN is much simpler than Neon Void - might be overkill

### My Recommendation

**Start Small, Test What Matters:**

1. **High Priority**: Test the math functions
   - `levelConfig.ts` calculation functions
   - Stat conversion formulas
   - These are pure functions - easy to test

2. **Medium Priority**: Test Player class logic
   - Level up mechanics
   - Stat allocation
   - XP accumulation

3. **Lower Priority**: Integration tests
   - Full battle flow
   - State transitions
   - UI updates

**Example Test Structure:**
```
rgfn_game/
  test/
    config/
      levelConfig.test.ts    # Test XP formulas
      balanceConfig.test.ts  # Verify config values
    entities/
      Player.test.ts         # Test leveling, stats, damage
      Skeleton.test.ts       # Test enemy stats
    systems/
      combat.test.ts         # Test damage calculations
```

### When To Add Tests

**Now (If Time):**
- Test suite would catch the XP bug immediately
- Good foundation for future features

**Later (When Needed):**
- Add tests when you hit bugs
- Add tests before refactoring
- Add tests for new features

**Never (If Small Project):**
- RGFN is a learning/prototype project
- Manual testing might be sufficient
- Focus effort on features, not infrastructure

---

## Conclusion

I verified the XP fix through **code analysis and TypeScript compilation**, not runtime testing. The logic is sound, but **you must verify it actually works** by playing the game.

For tests: **RGFN would benefit from tests like Neon Void**, especially for level/stat math. But whether to invest that time depends on project goals. Start with testing the math functions if you decide to add tests - they're the most valuable and easiest to write.

---

*Written by Claude - January 2026*

## 2026-03 Regression Notes (Current Test Workflow)

### Reliable local command sequence
1. Build RGFN TypeScript output first:
   - `npm run build:rgfn`
2. Run the RGFN test suite against compiled `dist/` modules:
   - `node --test $(find rgfn_game/test -name '*.test.js' -print)`

### Why the build step matters
RGFN tests import from `rgfn_game/dist/**`. If `dist` is missing/stale, many suites fail with `ERR_MODULE_NOT_FOUND` before running assertions.

### Enemy stat expectation gotcha
Enemy HP in runtime is not raw archetype HP. `Skeleton` applies `balanceConfig.enemies.hpMultiplier` to derived HP:
- `finalMaxHp = Math.round(derivedMaxHp * hpMultiplier)`

So tests asserting fixed literal HP values (for example zombie `7`) will fail when multiplier is `2` (actual becomes `14`). The stable assertion pattern is:
- derive with `deriveCreatureStats(...)`
- then apply `hpMultiplier` for expected HP

### Practical guidance for future test additions
- Prefer formula-based expectations tied to `balanceConfig` over hardcoded literals when behavior is config-driven.
- Keep one regression note per behavior change here to avoid rediscovering the same pitfalls.

## 2026-03 Equipment Change Turns in Battle (RGFN)

### Behavior change
- Equipping or unequipping **weapons/armor during battle** now costs **3 total turns**:
  - current player turn is spent immediately,
  - plus 2 additional upcoming player turns are consumed automatically.
- Out of battle, equipment still changes instantly (no turn cost).
- In battle, equipment changes are only accepted on the player's own active turn.

### Technical notes
- `TurnManager` now tracks consumed turns as a per-entity counter map instead of a boolean-style set, so multiple queued skipped turns are supported for one combatant.
- `BattleCommandController` now exposes `handleEquipmentAction(...)` and applies the 3-turn flow for battle-only equipment interactions.
- `HudController` routes inventory/equipment slot changes through the battle action handler before applying actual equip/unequip mutations.

### Regression tests added
- `test/systems/turnManager.test.js`
  - verifies multi-turn consumption on a single entity.
- `test/systems/battleCommandController.test.js`
  - verifies equipment action in battle queues 2 additional consumed turns and advances battle flow.
- `test/helpers/testUtils.js`
  - combat entity test helper now assigns stable synthetic `id` values, which is required for turn-consumption tracking keyed by entity id.

## Village dialogue verification
- Build RGFN bundle: `npm run build:rgfn`.
- Run RGFN tests: `node --test rgfn_game/test/**/*.test.js`.
- New coverage includes `villageDialogueEngine.test.js` for truthful/lying/refusal behavior.

## 2026-03 Victory Popup Movement Input Guard (RGFN)

### Symptom
- During the **victory splash popup** shown at battle end, pressing a movement key (`WASD` or arrow keys) could leak a queued player movement action into battle mode.
- On a subsequent encounter, this stale battle input path could trigger an immediate battle-end flow, causing players to see a victory popup right away and effectively skip intended combat.

### Root cause
- `GameBattleCoordinator.updateBattleMode()` still forwarded movement polling while splash transitions were active.
- The existing transition flag (`turnTransitioning`) already blocked click/button actions but did not block the movement polling path.

### Fix
- `GameBattleCoordinator` now:
  - sets `turnTransitioning = true` as soon as battle entry begins (before the battle-start splash dismisses),
  - early-returns from `updateBattleMode()` while transitioning,
  - sets `turnTransitioning = true` at battle end (victory/defeat/flee transition window),
  - resets `turnTransitioning = false` on battle exit cleanup.

### Verification checklist
1. Win a battle and keep pressing movement during the victory splash.
2. Allow return to world map, continue moving, and trigger another encounter.
3. Confirm battle-start splash appears normally and combat proceeds (no immediate victory splash).
4. Confirm normal in-battle movement still works once player turn becomes ready.

### Automated regression coverage
- Added `test/systems/gameBattleCoordinator.test.js` with guards for:
  - no movement updates during battle-start splash transition,
  - no movement updates during battle-end splash transition,
  - movement updates resuming after `onPlayerTurnReady()`.
