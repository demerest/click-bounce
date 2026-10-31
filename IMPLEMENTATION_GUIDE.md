# KEEP IT UP — Implementation Guide

Companion to `REQUIREMENTS.md`. IDs like CORE-01 refer to that document.
Baseline: `prototype.html` (Phase 0). **Do not edit `prototype.html`** — it is the frozen reference build you regression-test against.

## 1. Ground rules

1. One `CFG` object is the single source of truth for every tunable number. No magic numbers in logic.
2. Fairness before fun: any new spawner must pass the spawn-safety rules (HAZ-02, PICK-03).
3. Every new mechanic needs: feedback (visual), a sound, and a one-line entry in the menu/help text.
4. Cap everything (pillar 4). If you add a ramp, add its cap in the same commit.
5. No assets, no dependencies, no network (PORT-01).

## 2. Current state (Phase 0 — done)

Implemented in `prototype.html`, satisfying all P0 requirements marked ✅ in REQUIREMENTS §6:

- Directional bounce with generous hitbox, charge mechanic, anti-spam cooldown (CORE-02…08)
- Combo ×10 cap, drain bar, floating score text (SCORE-01…05)
- Gravity ramp, hazard grace period, capped spawn pacing (DIFF-01…05)
- Star + shield pickups with fair spawning (PICK-01…05)
- Saw hazard with spawn safety (HAZ-01…05)
- Squash/stretch/wobble deformation, upright face, blink (PHYS-01…05)
- Synthesized pentatonic audio, gesture unlock, mute (AUD-01…05)
- Menu attract mode, game-over stats, localStorage best, keyboard shortcuts (UI-01…04)

## 3. Target architecture

The prototype is intentionally one file. Split it when you start Phase 1, not before.
