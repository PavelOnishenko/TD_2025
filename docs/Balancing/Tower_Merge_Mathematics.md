# Tower Merge Mathematics & Strategy

## Core Merge Rule
- **Merging:** 2 adjacent towers of level N → 1 tower of level N+1
- To get 1 tower of level N+K, you need **2^K** towers of level N
- Example: 1 L5 tower requires 2^4 = 16 L1 towers merged progressively

## Grid Constraints
- Each side has **6 slots**
- Towers must be **adjacent** to merge
- Towers can only be merged (combined) or upgraded (paid evolution) or removed (to free space)

## Merge-Only Constraints by Level

### Level 2
- **Slots needed to merge:** 2
- **Max per side:** 5 (the 6th L1 would have no merge partner)
- **Merges required:** 1

### Level 3
- **Slots needed to merge:** 3
- **Max per side:** 4
- **Remaining space:** 2 slots (can fit 1xL1 + 1xL2 max)
- **Merges required:** 3

### Level 4
- **Slots needed to merge:** 4
- **Max per side:** 3
- **Merges required:** 7

### Level 5
- **Slots needed to merge:** 5
- **Max per side:** 2 (must be on opposite edges of the 6-slot space)
- **Merges required:** 15

### Level 6
- **Slots needed to merge:** 6 (entire side)
- **Max per side:** 1
- **Merges required:** 31

## Optimal Merge-Only Composition

Full completion on one side using merges only:
```
654321  or  123456
```
(One tower of each level, depending which edge you build from)

## Strategic Implications

### Merge-Only Path (Optimal)
- Follow the natural progression: L1 → L2 → L3 → L4 → L5 → L6
- Most efficient use of space and resources
- No energy wasted on upgrades
- Predictable, safe progression

### Off-Route Building (Sub-optimal)
- Example: wanting 4xL3 towers instead of following the optimal path
- **Consequence:** Cannot progress to higher levels without using upgrades or removes
- **Locked in:** Must spend energy on upgrades OR remove towers to restart merging

### When to Use Upgrades
- **After threshold:** When merge-only path is maxed out, upgrades become necessary
- **Before threshold:** Risky due to high energy cost, but possible for strategic reasons

### When to Use Removes
- **Primary use:** Free space to build more L1 towers
- **Why:** L1 merging is the most common merge operation
- **Strategy:** Remove mid-level towers to restart the merge chain from L1

## Merge Vulnerability
- Merging can only happen **between waves**
- While preparing a big merge, you have fewer active towers
- **Mitigation:** Keep some mid-level towers active while preparing high-level merges
- **Risk:** Consolidating firepower during difficult waves can cause leaks

## Test Run Observations
- Pure L1 spam fails around wave 12
- Optimal play with merging reaches wave 26+
- First L5 (railgun) appears around wave 22
- Wave 22-26 is where difficulty becomes intense
- Merge timing becomes critical in late game
