# RGFN World Map Performance Optimization Plan (Scientific Method)

## Goal

Raise world-map smoothness (FPS stability + input responsiveness) and lower laptop heat/power usage without changing gameplay semantics.

---

## 1) Problem statement and hypotheses

### Observed symptom

- Across three zoom detail modes, subjective smoothness remains similar (not smooth enough).
- Laptop thermals rise during map interaction, which implies sustained high CPU/GPU workload.

### Working hypotheses

H1. **Main thread saturation**: world-map render path still spends too much CPU time per frame (especially in medium/high detail layers and overlays), so frame budget is exceeded intermittently.

H2. **Redundant redraws**: expensive layers are redrawn every frame although their content is mostly static between camera/player/fog updates.

H3. **Canvas state churn**: frequent `fillStyle`/`strokeStyle`/path changes and many small draw calls create high driver overhead.

H4. **Input/render coupling**: movement/zoom handlers trigger immediate expensive work and increase interaction latency.

H5. **Allocation pressure**: per-frame object/array/string allocation causes GC spikes that manifest as micro-stutter.

---

## 2) Success criteria (quantitative)

Set explicit thresholds before optimization to avoid placebo improvements.

### Primary KPIs

- **P95 frame time** on world map:
  - target: `<= 16.7 ms` (60 FPS budget) on representative laptop scene,
  - minimum acceptable: `<= 22 ms` (feels significantly smoother than current baseline).
- **Input-to-visual latency** (key press to visible camera/player update):
  - target: `<= 50 ms` median.
- **Long-task frequency** (`>50 ms` main-thread tasks):
  - target: reduce by at least `60%` vs baseline.

### Secondary KPIs

- CPU package power / thermal trend during 3-minute pan+zoom scenario:
  - target: clearly lower plateau than baseline (same ambient conditions).
- Garbage collection interruptions:
  - target: fewer/shorter spikes in Performance recordings.

---

## 3) Measurement protocol (before touching code)

We treat performance as an experiment with reproducible conditions.

### Test scenarios (fixed)

1. **Idle map**: no movement for 30s in each zoom mode.
2. **Constant pan**: hold movement key for 60s in each zoom mode.
3. **Zoom stress**: alternate zoom in/out every 0.5s for 60s.
4. **Mixed gameplay**: move + zoom + open/close map UI elements for 120s.

### Environment control

- Same machine, same power profile, same browser, same tab count.
- Disable background heavy apps.
- Run each scenario at least 3 times and use median + P95.

### Tooling

- Browser Performance panel (main-thread flamechart + FPS lane).
- `performance.mark`/`performance.measure` instrumentation in world-map pipeline.
- Optional JS counters in dev HUD:
  - draw calls per frame,
  - visible cells,
  - cache hit ratios,
  - fog/terrain revision counts.

### Report template (mandatory)

For each run: commit hash, scenario name, zoom mode, average FPS, P95 frame, long tasks, notes.

---

## 4) Optimization workstreams (ordered by expected ROI)

### Workstream A — Observability first

Add low-overhead profiling hooks around:

- `WorldMap.draw(...)`
- terrain layer render
- fog overlay render
- village/location overlays
- selection/marker drawing

Expected result: precise time breakdown that shows dominant cost center per zoom mode.

### Workstream B — Redraw minimization

Introduce/extend dirty-region and layer caching policy:

- Keep static layers (terrain base, low-detail background, labels where possible) in offscreen canvases.
- Re-render cached layers only on explicit invalidation:
  - zoom (`cellSize`) change,
  - map generation revision change,
  - fog revision change,
  - viewport crossing chunk boundary (if chunked caching used).

Expected result: large drop in per-frame draw calls during panning.

### Workstream C — Draw-call batching and state reduction

- Group cells by style in medium/high detail passes to reduce state switches.
- Replace repeated tiny paths with batched rectangles where feasible.
- Minimize save/restore pairs; keep predictable render order.

Expected result: lower canvas command overhead and better CPU efficiency.

### Workstream D — Data-path and allocation hygiene

- Ensure hot loops avoid object creation.
- Reuse temporary structures.
- Prefer numeric arrays/indexing in per-frame paths.
- Verify no hidden string key construction in draw/update loops.

Expected result: fewer GC-triggered stutters.

### Workstream E — Input responsiveness protections

- Queue map updates to frame boundary (`requestAnimationFrame` cadence).
- Ensure input processing is decoupled from expensive synchronous redraw branches.
- Add adaptive quality fallback if frame budget exceeded for N consecutive frames.

Expected result: better subjective smoothness even under stress.

---

## 5) Experimental design: one variable at a time

To prove causality, change only one major factor per experiment.

For each experiment:

1. Record baseline metrics on `main`/control commit.
2. Implement one optimization.
3. Re-run identical scenario suite.
4. Compare deltas with confidence notes (median + P95).
5. Keep optimization only if:
   - performance improves,
   - no correctness regressions,
   - maintenance complexity is acceptable.

If multiple changes are needed for effect, still test them incrementally first, then as a combined patch.

---

## 6) Correctness guardrails (must not regress)

After every optimization batch, verify:

- movement, pan, zoom semantics unchanged,
- fog-of-war correctness preserved,
- village markers and named locations render correctly,
- selected-cell panel data matches actual cell,
- save/load still restores world map state exactly.

Automated checks to keep running:

- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/worldMap.test.js`
- `node --test rgfn_game/test/systems/worldMapRenderer.test.js`
- optionally full `npm test` before final merge.

---

## 7) Concrete milestone plan

### Milestone 0 — Baseline capture (no behavior change)

- Add instrumentation and docs for reproducible benchmark scenarios.
- Capture baseline tables + flamecharts.

Deliverable: `docs` report with baseline metrics and top-3 bottlenecks.

### Milestone 1 — Biggest bottleneck fix

- Implement highest-ROI optimization from baseline evidence.
- Re-measure and confirm KPI movement.

Deliverable: PR with before/after metrics and rollback notes.

### Milestone 2 — Second bottleneck + input polish

- Address next hotspot.
- Improve keypress responsiveness under load.

Deliverable: PR with latency and frame-time comparison.

### Milestone 3 — Thermal validation

- Run 3–5 minute endurance scenario.
- Validate reduced heating trend and stable frame pacing.

Deliverable: final performance dossier + recommended defaults.

---

## 8) Risk register and mitigations

- **Risk:** visual artifacts from stale caches.  
  **Mitigation:** strict invalidation keys + debug toggle to visualize cache age.

- **Risk:** optimization helps one zoom level but hurts another.  
  **Mitigation:** all three zoom modes are mandatory in each benchmark run.

- **Risk:** over-optimization harms readability.  
  **Mitigation:** isolate hot-path helpers, keep comments on invariants, document why each micro-optimization exists.

- **Risk:** thermal improvements not reproducible.  
  **Mitigation:** fix test protocol and capture ambient/system details in report.

---

## 9) Definition of done

Optimization cycle is complete when:

1. KPI targets are met or best-achievable limits are documented,
2. no gameplay/render regressions are observed,
3. benchmark protocol and findings are committed to docs,
4. future contributors can reproduce measurements without tribal knowledge.

This keeps map optimization evidence-driven and cumulative rather than anecdotal.
