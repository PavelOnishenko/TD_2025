# Ready for Optimization Assessment

## What Info We Have ✓

### From Test Runs
- L1 spam fails wave 12
- Optimal play reaches wave 26-30
- L6 achievable wave 22 (goal: 18-20)
- Actual DPS ranges for all tower levels (accounting for AOE/piercing)
- Energy economy flow wave-by-wave
- Breakpoints for each wave range
- Crisis points (wave 12, wave 22-26)

### From Config
- All tower stats (damage, fire rate, costs, range)
- All enemy stats (HP multipliers, speeds)
- Wave schedule (difficulty 1-20, endless scaling)
- Energy gains (base + scaling breakpoints)
- Upgrade costs and unlock wave
- Formation definitions and difficulty values

### From Code
- Formation selection system (difficulty budget → formations)
- Enemy HP scaling formula (base × multiplier × wave scaling)
- Endless mode formulas (base + growth × offset)

## What Info We're Missing ✗

### Cannot Calculate Without
1. **Wave 30+ ceiling test** - Is wave 30 the actual limit or can we go further?
2. **Energy efficiency curves** - Exact damage-per-energy for each upgrade path
3. **Optimal merge timing** - When to merge vs when to wait
4. **Color strategy impact** - Does red/blue distribution significantly affect survival?

### Nice to Have But Not Critical
- Upgrade-heavy strategy viability
- Advanced technique discovery
- Minimum tower requirements per wave (simulation)

## Can We Calculate Optimal Values?

### YES - We Can Optimize These ✓

**Wave Difficulty (waves 1-20)**
- Current: Linear scaling 13→22
- **Can optimize:** Adjust individual wave difficulty to create better pacing
- **Goal:** Make wave 12 harder (L1 spam should fail earlier), smooth wave 22-26 spike

**Energy Economy**
- Current: 7 per kill, 40 per wave, scaling at waves 10/20/30
- **Can optimize:** Adjust kill rewards to gate L6 timing
- **Goal:** Make L6 achievable wave 18-20, not wave 22

**Tower Stats (Limited)**
- Current: Theoretical DPS doesn't match actual (AOE/piercing not in formula)
- **Can optimize:** Adjust fire rate or damage to better match intended power
- **Goal:** L5→L6 upgrade should feel like power spike, currently marginal

**Endless Scaling**
- Current: HP ×1.1, difficulty +2.4 per wave
- **Can optimize:** Adjust to make wave 30-40 reachable but wave 50+ impossible
- **Goal:** Wave 40 = perfect play + luck

### NO - Need More Data First ✗

**Upgrade Costs**
- Current: 300/600/1200/2500/5000
- **Cannot optimize yet:** Don't know if upgrades are intentionally expensive or if they should be strategic choice
- **Need:** Upgrade-heavy strategy test to see if they're viable or trap

**Formation Difficulty/Probabilities**
- Current: Probabilities scale with wave, some formations rare
- **Cannot optimize yet:** Don't know if current enemy variety is good
- **Need:** More testing to see if specific formations cause unfair spikes

## Recommendation: Limited Optimization Pass

### What We Can Do Now
1. **Adjust energy per kill from 7 to 8-9** → Gates L6 at wave 20 instead of 22
2. **Increase wave 12-14 difficulty by 1-2 points** → L1 spam fails earlier
3. **Smooth wave 22-26 difficulty curve** → Reduce spike (maybe 22→23 instead of 22→24)
4. **Adjust endless HP scaling from 1.1 to 1.08** → Make wave 30-40 more achievable

### What We Should NOT Do Yet
1. Change upgrade costs (need more data)
2. Change tower damage/fire rates dramatically (actual DPS might be intended)
3. Redesign formation system (working as intended)
4. Add/remove mechanics (out of scope)

## Next Strategy to Test

**Skip L6 rush** - we know it lands wave 22, diminishing returns to test again

**Test:** Upgrade-heavy strategy
- **Goal:** See if upgrades can substitute for merging
- **Method:** Use upgrades at wave 15+ liberally, minimal merging
- **Question:** Is this viable or waste of energy?

**Alternative:** Push wave 30+ with current balance
- **Goal:** See if wave 30 is ceiling or if we can reach 35+
- **Method:** Perfect play from wave 1, optimize everything
- **Question:** Is current balance already good for wave 30-40 range?

## Bottom Line

**We have ENOUGH info to make SMALL optimizations** (energy gains, wave difficulty tweaking, endless scaling).

**We do NOT have enough info for MAJOR changes** (tower reworks, upgrade cost overhaul, new mechanics).

**Recommended path:** Make small calculated adjustments, test once more, then lock in values.
