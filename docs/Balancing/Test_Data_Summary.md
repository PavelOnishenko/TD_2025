# Test Data Summary

## Balance Version History

### v1 (Original - All tests below)
- Energy per kill: 7
- L5 damage: 50
- Waves 12-14 HP: 4.32, 4.55, 4.77
- Endless HP growth: 1.1x per wave

### v2 (Current)
- Energy per kill: **8** (+14%)
- L5 damage: **65** (+30%)
- Waves 12-14 HP: **4.5, 4.65, 4.85** (smoothed)
- Endless HP growth: **1.08x** per wave (reduced from 1.1x)

**Expected impact:** L6 earlier (wave 20?), L5 stronger, wave 12 harder, wave 30+ easier

### v2 Test Result: RUN 1124 - TOO EASY
- **Wave reached:** 45+ (quit, not dead)
- **Lives lost:** 0 (ZERO through wave 45!)
- **First L5:** Wave 14
- **First L6:** Wave 21 (close to goal)
- **Wave 40 comp:** 5L1, 1L2, 1L3, 1L4, 0L5, 4L6
- **Verdict:** Completely broken, way too easy

---

## All Test Runs (v1 Balance)

### Run 728 (Part 1) - L1 Spam Until Failure
- **Waves:** 1-14
- **Strategy:** Pure L1 spam, no merging
- **Result:** Lost 3 lives at wave 12, died wave 14
- **Key Finding:** L1 spam fails around wave 12 (confirms theory)

### Run 728 (Part 2) - Optimal Merging
- **Waves:** 1-26
- **Strategy:** Proper merging, building toward higher levels
- **First L4:** Wave 10
- **First L5:** Wave 22
- **Result:** Died at wave 26
- **Key Finding:** Optimal play reaches mid-20s

### Run 1240 - Grid Limit Test
- **Waves:** 1-6
- **Strategy:** L1 spam until grid maxed
- **Result:** Hit 11 towers by wave 6, no more space
- **Key Finding:** Grid maxes quickly if only building L1s

### Run 1014 - L6 Achievement
- **Waves:** 1-30 ✓ NEW BEST
- **First L5:** Wave 15
- **First L6:** Wave 22
- **Crisis point:** Wave 26 (lost 2 lives, used upgrade)
- **Second L5:** Wave 28
- **Death:** Wave 30 (1 life lost)
- **Final composition:** 7L1, 1L2, 1L3, 1L4, 1L5, 1L6
- **Key Finding:** L6 alone not enough, wave 26-30 brutal even with L6

## Confirmed Breakpoints

| Wave Range | Minimum Requirement | Observation |
|------------|-------------------|-------------|
| 1-6 | L1 spam works | Easy, forgiving |
| 7-11 | Need L2s | L1 spam starts struggling |
| 12-14 | Need L3s minimum | L1 spam fails completely |
| 15-21 | Need L4s, start L5 | First L5 at wave 15 viable |
| 22-26 | L6 necessary | Got L6 wave 22, still challenging |
| 27-30 | L6 + support towers | Even with L6, needs mixed comp |
| 30+ | Unknown | Not tested yet |

## Energy Economy Data

### Run 1014 Energy Flow
| Wave | Start | End | Gained | Spent |
|------|-------|-----|--------|-------|
| 1 | 0 | 201 | 201 | 0 |
| 5 | 49 | 223 | 174 | 0 |
| 10 | 85 | 280 | 195 | 0 |
| 15 | 41 | 253 | 212 | 0 |
| 20 | 19 | 300 | 281 | 0 |
| 22 | 137 | 487 | 350 | 0 |
| 26 | 34 | 227 | 493 | 300 |
| 30 | 136 | 782 | 646 | 0 |

**Key observation:** Energy gains increase significantly late game, but so does difficulty

## Tower Performance (Actual DPS)

Measured in real combat, accounting for AOE/piercing:

| Level | Theoretical DPS | Actual DPS Range | Multiplier |
|-------|----------------|------------------|------------|
| L1 | 16.6 | 7-15 | 0.4-0.9x |
| L2 | 40.0 | 15-25 | 0.4-0.6x |
| L3 | 66.7 | 30-45 | 0.5-0.7x |
| L4 | 75.8 | 50-90 | 0.7-1.2x |
| L5 | 47.6 | 60-120 | 1.3-2.5x |
| L6 | 66.7 | 80-200 | 1.2-3.0x |

**Critical insight:** AOE/piercing creates force multipliers for L5-L6

## What We Learned

1. **L1 spam ceiling:** Wave 12 (slightly later than predicted wave 8-10)
2. **Optimal play ceiling:** Wave 26-30 (with L6)
3. **L6 timing:** Achievable wave 22 (goal was 18-20, slightly late)
4. **L6 power:** Strong but not "win button" - still need support
5. **Wave 26-30 difficulty:** Massive spike even with endgame towers
6. **Energy late game:** Becomes more abundant but not "swimming in it"
7. **Upgrade usage:** Desperate measure at wave 26 (300 energy upgrade)

## Next Tests Needed

1. **Aggressive L6 rush:** Can we get L6 by wave 18-20?
2. **Upgrade-heavy strategy:** How far can upgrades carry vs merging?
3. **Wave 30+ push:** Is wave 30 the ceiling or can we go further?
4. **Color strategy:** Does red/blue distribution matter significantly?
