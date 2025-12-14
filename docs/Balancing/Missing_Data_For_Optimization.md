# Missing Data for Balance Optimization

## What We Have
✓ Tower stats (damage, fire rate, upgrade costs)
✓ Enemy base stats (HP multipliers, speeds)
✓ Wave schedule (difficulty, HP scaling)
✓ Energy economy (costs, gains, scaling)
✓ Test data from two runs (waves 1-14 L1 spam, waves 1-26 optimal play)

## What We Need to Calculate Optimal Balance

### 1. Enemy HP Formula
**Need:** Actual HP calculation from code
- How does `enemyHp` from wave schedule combine with `hpMultiplier`?
- What's the base HP value?
- Formula: `actual_hp = base_hp × hpMultiplier × wave_scaling`

**Location:** Check enemy spawning code

### 2. Formation Difficulty → Enemy Count
**Need:** How wave difficulty translates to actual enemy spawns
- Wave 1 has difficulty=13, how many enemies spawn?
- How does formation system convert difficulty to formation count?
- Need to extract or derive this from formation spawner logic

**Location:** Wave/formation spawning code

### 3. Effective DPS Analysis
**Need:** Real-world damage accounting for:
- **Color mismatch:** 30% penalty when colors don't match
- **Overkill waste:** Projectile does 8.3 damage to enemy with 2 HP left
- **Miss rate:** Enemies moving, projectiles travel time
- **Range overlap:** Multiple towers hitting same enemy

**Method:** May need combat simulation or extract from test runs

### 4. Breakpoint Wave Analysis
**Need:** Minimum defense requirements per wave
- Wave N requires minimum X total DPS to survive
- Or: Wave N requires at least Y towers of level Z+

**Method:** Can simulate or derive from:
- Enemy HP × enemy count ÷ wave duration = required DPS
- Compare to available tower DPS at that wave

### 5. Energy Efficiency Curves
**Need:** Damage per energy spent for each strategy
- Merge-only path: 16 L1s (1920 energy) → 1 L5 (47.6 DPS)
- Upgrade path: 1 L1 + 9300 energy upgrades → 1 L6 (66.7 DPS)
- Mixed strategies: Which is most efficient at each stage?

**Method:** Calculate from tower stats + costs

### 6. Advanced Technique Opportunities
**Need:** Identify where math creates special strategies
- Are there "power spike" waves where specific merges are optimal?
- Do certain color distributions create damage multipliers?
- Is there an upgrade timing that's unexpectedly efficient?

**Method:** Math analysis + experimentation

## Data We Can Get From Next Test Run

### L6 Rush Test (Next)
- Energy flow when aggressively merging
- Whether 32 L1s (for L6) is achievable by wave 20
- If energy gates L6 or if time/waves gate it
- Survival time after getting L6

### Still Need After That
- **Lazy strategy to wave 30+:** How far can minimal merging go?
- **Multiple color strategies:** Does red/blue split matter?
- **Upgrade-heavy strategy:** Rush L1→L6 via upgrades, compare cost
- **Remove-heavy strategy:** Use removes to cycle towers, measure efficiency

## Can Extract From Code (TODO)

1. Read enemy HP calculation formula
2. Read formation spawning logic
3. Read wave difficulty → formation count conversion
4. Confirm energy scaling formulas match config

## Critical Question to Answer

**For wave N, what is the minimum cost to survive?**

If we can answer this for all N, we can:
1. Calculate if energy economy is balanced
2. Determine if L6 by wave 20 is achievable
3. Find which waves are "gear checks" (must have certain towers)
4. Design advanced techniques (waves where specific merges unlock survival)
