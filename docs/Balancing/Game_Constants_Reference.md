# Game Constants Reference

**Source:** `js/config/balanceConfig.js`

This document extracts all numeric constants from the balance config for easy reference during optimization calculations.

## Player Economy

### Initial Resources
- **Lives:** 5
- **Starting Energy:** 480
- **Max Waves (before endless):** 20

### Costs
- **L1 Tower Placement:** 120 energy
- **Color Switch:** 0 energy (free)

### Energy Gains - Base
- **Per Enemy Kill:** 7 energy
- **Tank Kill Multiplier:** 2x (14 energy per tank)
- **Per Wave Completion:** 40 energy

### Energy Gains - Scaling
Kill energy bonus scales by wave:
- **Base Wave:** 1 (no scaling)
- **Base Bonus:** 0
- **Max Bonus:** 1 (100% increase cap)

**Breakpoints:**
- Wave 10: +3% bonus
- Wave 20: +10% bonus
- Wave 30: +30% bonus

## Tower Stats

### Range
- **Base Range:** 140
- **Per Level:** +20% (multiplicative)
- **Bonus Multiplier:** 1.3x

### Damage & Fire Rate by Level
| Level | Damage | Fire Interval (ms) | Upgrade Cost | Theoretical DPS | **Actual DPS** |
|-------|--------|-------------------|--------------|-----------------|----------------|
| L1    | 8.3    | 500               | 300          | 16.6            | **7-15**       |
| L2    | 8.0    | 200               | 600          | 40.0            | **15-25**      |
| L3    | 4.0    | 60                | 1200         | 66.7            | **30-45**      |
| L4    | 9.1    | 120               | 2500         | 75.8            | **50-90**      |
| L5    | 50.0   | 1050              | 5000         | 47.6            | **60-120**     |
| L6    | 80.0   | 1200              | N/A          | 66.7            | **80-200**     |

**Actual DPS** measured from gameplay testing, accounts for:
- AOE (area of effect) damage
- Piercing (projectiles hitting multiple enemies)
- Color matching effectiveness (30% penalty for mismatches)
- Real combat conditions

**Note:** Actual DPS varies based on enemy density, color distribution, and positioning.

### Upgrade System
- **Unlock Wave:** 15 (upgrade button appears)
- **Upgrade costs** listed above (energy to upgrade from level N to N+1)

## Projectile Stats

### Base Stats
- **Speed:** 700
- **Base Radius:** 18
- **Radius Per Level:** +5

### Color Mechanics
- **Color Mismatch Multiplier:** 0.3 (30% damage)
- **Color Match:** 1.0 (100% damage)

### Rockets (L5)
- **Explosion Radius Min:** 18
- **Explosion Range Multiplier:** 0.5

## Enemy Stats

### Spawn
- **Default Position:** x=-600, y=600

### Base Stats
- **Speed Multiplier:** 0.9 (global)

### Swarm
- **HP Multiplier:** 10
- **Speed:** x=200, y=0
- **Group Size:** 3

### Tank
- **HP Multiplier:** 35.7
- **Speed:** x=100, y=0

## Wave Difficulty

### Wave Schedule (Waves 1-20)
| Wave | Difficulty | Enemy HP |
|------|-----------|----------|
| 1    | 13        | 1.34     |
| 2    | 13        | 1.64     |
| 3    | 14        | 1.94     |
| 4    | 14        | 2.24     |
| 5    | 15        | 2.53     |
| 6    | 15        | 2.97     |
| 7    | 16        | 3.20     |
| 8    | 16        | 3.42     |
| 9    | 17        | 3.65     |
| 10   | 17        | 3.87     |
| 11   | 18        | 4.10     |
| 12   | 18        | 4.32     |
| 13   | 19        | 4.55     |
| 14   | 19        | 4.77     |
| 15   | 20        | 5.00     |
| 16   | 20        | 5.22     |
| 17   | 21        | 5.00     |
| 18   | 21        | 5.25     |
| 19   | 22        | 5.45     |
| 20   | 22        | 5.65     |

### Endless Mode (Wave 21+)
- **HP Growth:** 1.1x per wave (10% increase)
- **Difficulty Increment:** +3 per wave

### Difficulty Multiplier
- **Global Multiplier:** 1.0 (can be increased to make waves more epic)

## Scoring

### Points
- **Per Kill:** 10 points
- **Wave Clear:** 150 points
- **Base Hit Penalty:** -25 points

## Formation System

### Formation Spawning
- **Formation Gap:** 0.85 seconds between formations
- **Minimum Weight:** 0.02 (formation selection threshold)

### Endless Difficulty Scaling
- **Start Wave:** 21
- **Base Difficulty:** 24
- **Growth:** +2.4 per wave
- **Max Difficulty:** 160

## Missing Data for Optimization

### Need to Calculate/Derive
- **Actual enemy HP values** (need formula: base HP × hpMultiplier × wave scaling)
- **Effective DPS accounting for:**
  - Tower range overlap
  - Color mismatch penalties
  - Projectile travel time
  - Overkill waste
- **Energy efficiency curves** (damage per energy spent for each upgrade path)
- **Breakpoint analysis** (minimum tower levels required to survive each wave)
- **Formation difficulty-to-enemy-count conversion** (how difficulty translates to spawn counts)

### Can Extract from Code
- Enemy HP calculation formula
- Formation spawning logic
- Actual enemy counts per wave from test data
