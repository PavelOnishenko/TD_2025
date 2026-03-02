# Eva Game Animation Replacement Guide (No Professional Animator Needed)

This guide describes a practical workflow for improving Eva game animations when the team has no dedicated animator.

## 1) Pick a low-barrier animation tool

For a beginner-friendly pipeline, use one of these:

- **LibreSprite** (free, simple frame-by-frame pixel animation).
- **Piskel** (free web tool, easiest onboarding).
- **Krita** (free; good if you need more painting controls).

If you need quick skeletal animation for non-pixel art, try **Rive (free tier)** or **Spine alternatives** with trial/community plans.

## 2) Keep a small style spec before creating assets

Define these constraints in one page and follow them for every animation:

- Sprite size (example: `64x64` or `96x96`).
- Frame count ranges per action.
- FPS target (example: 10–12 FPS for readability and low effort).
- Silhouette clarity rule (pose should be readable in 1 frame).
- Color count / shading rule.

This avoids rework and keeps all beginner-made animations coherent.

## 3) Prioritize the highest-impact animation set

Start from actions players see most often:

1. `idle`
2. `walk`
3. `attack`
4. `hit`
5. `death`

Do **not** animate everything at once. Replace one unit/enemy type fully, then reuse the workflow.

## 4) Use a simple “pose-to-pose” production workflow

For each action:

1. Draw key poses first (2–4 frames).
2. Duplicate and adjust between poses for in-betweens.
3. Add timing: hold strong poses longer, transitions shorter.
4. Export to sprite sheet or numbered frames.

Beginner rule: good timing + clear silhouettes beat high detail.

## 5) Technical integration recommendations for Eva game

Keep game-facing data explicit so artists can iterate safely:

- Store per-animation metadata near code or in JSON:
  - `frameWidth`, `frameHeight`
  - `frameCount`
  - `fps`
  - `loop` flag
- Use a consistent naming convention:
  - `unit_<name>_<action>.png` (example: `unit_guard_attack.png`)
- Keep old animation assets until replacement is validated.

## 6) Quality checklist (fast review loop)

Before accepting a new animation:

- Readable at actual game zoom.
- Action intent is clear in under 1 second.
- No frame “teleporting” (position pops).
- Hit/attack key frame aligns with gameplay event timing.
- Animation loops cleanly where expected.

## 7) Suggested 2-week rollout plan

- **Day 1–2:** style spec + references + first idle/walk test.
- **Day 3–5:** complete one enemy (`idle/walk/attack/hit/death`).
- **Day 6–7:** integrate + tune timing in-game.
- **Week 2:** apply the same template to next 2–3 units.

This gives visible improvement quickly without requiring expert animation skills.

## 8) Optional acceleration with AI-assisted ideation

Even without an animator, you can speed up ideation:

- Generate pose references (not final assets) using AI image tools.
- Convert references into clean game-ready sprites manually.
- Keep final output style-consistent using your style spec.

Use AI for drafts/reference, then finalize by hand to maintain legal/style control.
