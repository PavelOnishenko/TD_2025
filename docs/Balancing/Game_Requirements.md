# Game Requirements & Design Goals

## Victory & End Condition
- **No winning condition** - game is endless
- **Progression:** Highscores only
- Game ends when base loses all lives

## Difficulty Philosophy

### Wave Progression
- **Waves 1-10:** Gradually increasing difficulty, forgiving for new players
- **Waves 10-20:** First-time players typically reach this range
- **Waves 20-30:** Challenging but achievable with good strategy
- **Waves 30+:** Hard to achieve, requires very specific strategies
- **Wave 40+:** Perfect strategy + luck required

### Player Skill Tiers
- **Very lazy players:** Don't reach waves 10-15
- **First-time players:** Typically reach waves 10-20
- **Skilled players:** Reach wave 30+
- **Perfect execution:** Wave 40+

## Energy Economy

### Core Principle
- Players should spend **all or almost all** energy constantly
- Exception: Saving up for big upgrades
- Energy should **never be abundant**
- Tight resource management is core to gameplay

### Energy Flow
- Tight until wave 10
- Remains tight wave 10-20
- Still tight after wave 20 (NOT abundant)

## Tower Progression

### L6 Achievement Target
- **Goal:** L6 (railgun) achievable just before wave 20
- **Condition:** Player must purposefully merge aggressively
- **Not** achievable through passive/lazy play

### Tower Viability by Wave
- **All tower levels useful on wave 20**
- **L1 towers:** Can kill severely damaged enemies only
- **Cannot work alone:** L1s require stronger towers to soften enemies first
- **No useless towers:** No armor mechanics, all levels contribute
- **Placement matters:** Defense line composition and positioning critical

## Strategic Depth

### Mixed Compositions
- **All viable:** No single optimal composition
- **Synergies possible:** Correct placement + color matching
- **Complexity:** Synergies hard to fully comprehend (emergent gameplay)

### Skill Expression
- **Good strategy defined by:** Smart merges, upgrades, and removals
  - Right place at right time
  - Minimizing breakthrough chance

### Advanced Techniques
- **Should exist:** Purposefully designed into balance
- **High reward:** Extremely effective when mastered
- **Discovery:** Players find through experimentation

## Merge-Only Optimal Path
- **L6 not a win button:** Necessary at some point but not guaranteed victory
- **Mixed compositions viable:** 4xL3 + 2xL4 can work, but locks out further merge-only progression
- **See:** `Tower_Merge_Mathematics.md` for full spatial constraints

## Merge Vulnerability
- **Merging between waves only**
- **Creates risk:** Temporarily fewer active towers
- **Mitigation strategy:** Keep mid-level towers while preparing big merges
- **Intentional tension:** Strategic decision-making, not accidental punishment

## Test Data Confirmed
- L1 spam fails around wave 12
- Optimal play reaches wave 26+ (current data, may change with balancing)
- First L5 appears around wave 22
- Merge timing critical in late game
