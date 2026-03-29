## Survival Loop: Fatigue + Sleep (March 28, 2026)

This document explains the new **travel fatigue** and **sleep safety** loop for RGFN.

### Core idea

- `theme.worldMap.cellTravelMinutes` is treated as the travel-time cost for one world-map step.
- We estimate a comfortable travel day as:
  - `awakeHoursPerDay * 60 / cellTravelMinutes`.
- Fatigue is a bounded stat (`0..maxFatigue`) that grows from travel and is reduced by sleep.

With default values:

- `cellTravelMinutes = 12`
- `awakeHoursPerDay = 16`
- Comfortable cells/day: `floor(16*60 / 12) = 80`

So roughly one full “hard but normal” travel day maps to filling the fatigue bar.

### New balance knobs (`balanceConfig.survival`)

- `awakeHoursPerDay`
- `requiredSleepHours`
- `maxFatigue`
- `cautionFatigueThreshold`
- `highFatigueThreshold`
- `villageSleepFatigueRecovery`
- `wildSleepFatigueRecovery`
- `wildSleepAmbushChance`
- `wildSleepAmbushHpLoss`
- `wildSleepAmbushManaLoss`
- `innRoomCostGold`

### Player stat additions

`Player` now tracks:

- `fatigue`
- `getMaxFatigue()`
- `addTravelFatigue(cells)`
- `recoverFatigue(amount)`
- `getFatiguePercent()`
- `getFatigueStateLabel()` (`Rested`, `Tired`, `Exhausted`)

Fatigue is also saved/restored in save-state snapshots.

### Sleep flows

#### 1) World map camping (risky)

- New button: **Camp Sleep (Risky)** in world actions.
- Effects:
  - restores fatigue by `wildSleepFatigueRecovery`.
  - has ambush chance `wildSleepAmbushChance`.
  - ambush applies surprise penalties:
    - HP loss: `wildSleepAmbushHpLoss`
    - mana loss: `wildSleepAmbushManaLoss`

This models unsafe sleep outside settled places.

#### 2) Village inn sleep (safe)

- NPC role pool now includes `Innkeeper`.
- New village action button: **Sleep in room**.
- Only enabled when an innkeeper-like NPC is selected.
- Effects:
  - pay `innRoomCostGold`
  - recover fatigue by `villageSleepFatigueRecovery`
  - small HP/mana restoration bonus
  - no ambush risk

### UI additions

Stats panel now shows:

- `Fatigue: <current>/<max> (<percent>)`
- `Condition: Rested/Tired/Exhausted`

### Future extension ideas

- Convert fatigue state into combat/open-world modifiers.
- Add time-of-day and multi-day calendar progression.
- Trigger full battle ambush encounters during failed wild sleep.
- Add explicit innkeeper dialogue branch (`I want a room for the night`).
