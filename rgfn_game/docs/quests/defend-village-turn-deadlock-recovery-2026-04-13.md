# Defend Village: Turn Deadlock Recovery (2026-04-13)

## Problem summary

During **village-defense battles** (`player + defenders` vs `Hired Blade` attackers), rare runtime errors in a non-player combatant turn could stop turn progression while battle controls remained disabled. 

Observed player-facing symptom:

- No usable combat actions.
- Battle appears frozen or unclear whose turn it is.
- Most visible in ally-heavy encounters because there are more AI turns per round.

## Root cause

`BattleTurnController.executeAiTurn()` assumed every AI-turn step would succeed. If any AI call threw (for example: status-effect processing, targeting edge cases, or future AI extension regressions), the asynchronous turn callback exited early and never advanced to the next turn.

Because player controls are disabled during non-player turns, this resulted in a deadlock-like state.

## Fix implemented

### 1) AI turn fail-safe recovery

Added guarded execution around AI turn logic in `BattleTurnController`:

- On AI turn exception, we now:
  - log a system line (`"<name> hesitates, and the turn advances."`),
  - force `turnManager.nextTurn()`,
  - schedule `processTurn()` again.

This guarantees progression even if one AI actor fails for one frame.

### 2) Player-turn button reset hardening

On player-turn entry, controls are explicitly toggled off then on in the same flow before returning. This prevents stale disabled-button state from prior transitions from persisting.

## Regression tests

Added a new scenario test:

- `BattleTurnController recovers from AI turn errors and still returns control to the player`

Test setup:

- turn order: `Player -> Ally Defender -> Hired Blade`.
- ally throws from `consumeTurnEffects()`.

Assertions:

- recovery log is emitted,
- control returns to player turn,
- `waitingForPlayer === true`,
- battle buttons are re-enabled,
- player-ready callback is fired exactly once.

## Why this is safe

- Normal AI behavior is unchanged.
- Recovery path runs only on thrown AI-turn errors.
- Turn sequencing remains deterministic: failure consumes exactly one actor turn and continues.

## Follow-up recommendation

If new ally/enemy actor types are added, keep AI-turn operations exception-safe (or validate required methods upfront) to preserve battle loop liveness.
