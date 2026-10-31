# KEEP IT UP — Requirements

> One-click arcade: a jelly ball falls forever; you bounce it back up.
> Reference build: `s:\home\dev\click-bounce\prototype.html` (Phase 0 baseline)

## 1. Overview

| | |
|---|---|
| **Genre** | One-input arcade / physics toy |
| **Core verb** | Click/tap near the ball → it is pushed away from the pointer |
| **Fail states** | Ball touches the floor · ball touches a hazard (unshielded) |
| **Score** | Bounce points × combo multiplier + pickups |
| **Session length** | First run ~20–40 s · skilled run 2–3 min |
| **Hard constraint** | **Zero asset files.** All graphics are Canvas/CSS; all audio is synthesized via Web Audio. |

## 2. Design pillars

Every feature is judged against these. If a feature conflicts with a pillar, the pillar wins.

1. **One input, infinite depth.** Only click/tap. Depth comes from *where* and *when* you click.
2. **Risk is reward.** Letting the ball fall lower gives a stronger bounce. Steering toward pickups exposes you to hazards.
3. **Deaths are always fair.** Every kill must be visible ≥ 1.5 s before it could connect. No spawns on top of the player.
4. **Everything is capped.** No difficulty knob may grow without bound — "impossible" reads as a bug.
5. **Juice over fidelity.** Squash, stretch, shake, particles, pitch-ladder audio — not realistic simulation.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Bounce** | Successful pointer input within hit radius of the ball |
| **Miss** | Pointer input outside hit radius; breaks combo, never kills |
| **Charge** | Bounce power scales with time since last bounce (0.55× → 1.0× over 0.45 s) |
| **Combo window** | 2.2 s after a bounce during which the next bounce increments the combo |
| **Grace period** | First ~9 s of a run: no hazards |

## 4. Functional requirements

Priority: **P0** = required for v1.0 · **P1** = required for v1.x · **P2** = nice to have.

### 4.1 Core loop & input

| ID | Requirement | Pri |
|---|---|---|
| CORE-01 | The ball MUST be under constant downward gravity at all times during play. | P0 |
| CORE-02 | A pointer press within `hitRadius` (≈ 2.3 × ball radius) of the ball MUST apply an impulse directed **away from the click point**. | P0 |
| CORE-03 | The bounce impulse MUST guarantee a minimum upward component (≥ 0.55 × power). | P0 |
| CORE-04 | Floor contact MUST end the run. | P0 |
| CORE-05 | Bounce power MUST scale with time since the last bounce (charge mechanic). Quick taps MUST be weaker. | P0 |
| CORE-06 | Side walls MUST reflect horizontal velocity with damping (~0.75). | P0 |
| CORE-07 | A miss MUST reset the combo and MUST NOT damage or kill the player. | P0 |
| CORE-08 | Successful bounces MUST be rate-limited (~100 ms) to prevent click spamming. | P0 |
| CORE-09 | Off-center bounces SHOULD impart visual spin. | P1 |
| CORE-10 | Input MUST use Pointer Events and work identically for mouse, touch, and pen. | P0 |

### 4.2 Scoring & combo

| ID | Requirement | Pri |
|---|---|---|
| SCORE-01 | Each bounce MUST award `5 × min(combo, 10)` points. | P0 |
| SCORE-02 | Combo MUST increment on bounces within the combo window (2.2 s) and reset on expiry or miss. | P0 |
| SCORE-03 | The combo multiplier MUST cap at ×10 for scoring (display MAY show "MAX"). | P0 |
| SCORE-04 | Remaining combo-window time MUST be visible in the HUD. | P0 |
| SCORE-05 | Point gains MUST produce floating feedback text at the source. | P0 |
| SCORE-06 | Best score MUST persist across sessions (localStorage, guarded with try/catch). | P0 |
| SCORE-07 | Game-over screen MUST show score, bounce count, max combo, best, and a NEW BEST flag. | P0 |

### 4.3 Difficulty pacing

| ID | Requirement | Pri |
|---|---|---|
| DIFF-01 | Gravity MUST ramp from ~950 to a cap of ~1650 px/s² over ~70 s (≈ +9/s). | P0 |
| DIFF-02 | Hazards MUST NOT spawn during the first ~9 s of a run. | P0 |
| DIFF-03 | Hazard spawn interval MUST shrink from ~3.4 s toward a floor of ~1.15 s, then hold. | P0 |
| DIFF-04 | Hazard speed MUST ramp with elapsed time, capped. | P0 |
| DIFF-05 | Every pacing knob MUST have an explicit cap (pillar 4). | P0 |
| DIFF-06 | Difficulty MAY additionally scale with score (rubber-banding) in a later version. | P2 |

### 4.4 Pickups (helpers)

| ID | Requirement | Pri |
|---|---|---|
| PICK-01 | **Star**: awards +40 points; spawns every ~3.5–5.5 s; despawns after ~7 s with a blink warning in the final ~1.6 s. | P0 |
| PICK-02 | **Shield**: absorbs exactly one hazard hit; only spawns while no shield is held; respawn timer ~12–18 s. | P0 |
| PICK-03 | Pickups MUST NOT spawn within ~130 px of the ball. | P0 |
| PICK-04 | At most 4 pickups SHOULD exist simultaneously. | P1 |
| PICK-05 | Shield consumption MUST produce distinct feedback (burst, ring, sound, message). | P0 |

### 4.5 Hazards

| ID | Requirement | Pri |
|---|---|---|
| HAZ-01 | **Saw**: crosses the screen horizontally from an off-screen edge with a sine bob and rotation. | P0 |
| HAZ-02 | Saw spawn height MUST be ≥ 130 px from the ball's height (re-roll, max 8 attempts). | P0 |
| HAZ-03 | Hazard contact MUST kill unless a shield is held (shield consumed instead). | P0 |
| HAZ-04 | At most 5 hazards SHOULD exist simultaneously. | P1 |
| HAZ-05 | Hazards MUST remain legible against any background hue (outline + fill contrast). | P0 |
| HAZ-06 | Additional hazard types (see guide §4.4) MAY be added if they obey pillars 3–4. | P1 |

### 4.6 Ball physics & deformation

| ID | Requirement | Pri |
|---|---|---|
| PHYS-01 | Integration MUST be semi-implicit Euler with `dt` clamped to ≤ 1/30 s. | P0 |
| PHYS-02 | The ball MUST stretch along its velocity vector proportional to speed (capped ≈ 0.36). | P0 |
| PHYS-03 | Impacts (bounce, wall) MUST trigger a damped wobble oscillation on the ball's scales. | P0 |
| PHYS-04 | Stretch orientation MUST follow `atan2(vy, vx)`; the face MUST remain upright (counter-rotate). | P0 |
| PHYS-05 | The ball SHOULD have ambient life (blinking, pupils tracking velocity). | P1 |
| PHYS-06 | A true soft-body (spring–mass) simulation is explicitly **out of scope** before v2. | — |

### 4.7 Audio

| ID | Requirement | Pri |
|---|---|---|
| AUD-01 | All sound MUST be synthesized via Web Audio API. No audio files, ever. | P0 |
| AUD-02 | The AudioContext MUST be created/resumed inside a user gesture. | P0 |
| AUD-03 | Bounce pitch MUST climb a pentatonic ladder with combo (always consonant). | P0 |
| AUD-04 | Master gain MUST stay ≤ 0.2; all tones MUST use short envelopes. | P0 |
| AUD-05 | A mute toggle MUST exist (button + `M` key) and persist visually. | P0 |
| AUD-06 | Every discrete event (bounce, miss, wall, pickup, shield pop, death, UI start) SHOULD have a distinct, throttled sound. | P1 |

### 4.8 States & UI

| ID | Requirement | Pri |
|---|---|---|
| UI-01 | Game states: `menu`, `play`, `over`. Pause is P1. | P0 / P1 |
| UI-02 | The menu MUST show a live attract-mode ball (autopilot, no sound, no score). | P1 |
| UI-03 | HUD MUST show score, best, and combo (with drain bar). | P0 |
| UI-04 | Space/Enter MUST start/restart; interaction MUST be locked for ~0.7 s after death to prevent accidental restart. | P0 |
| UI-05 | No bitmap images anywhere; menus/HUD in DOM/CSS, gameplay in Canvas. | P0 |
| UI-06 | Pause (`P` or Esc, auto-pause on tab hide) SHOULD exist. | P1 |

## 5. Non-functional requirements

| ID | Requirement | Pri |
|---|---|---|
| PERF-01 | MUST hold 60 fps on a mid-range phone; `shadowBlur` and per-frame gradient-heavy overdraw are discouraged. | P0 |
| PERF-02 | Rendering MUST be `devicePixelRatio`-aware (capped at 2). | P0 |
| INPUT-01 | `touch-action: none` on the play surface; no double-tap zoom, no text selection, no pull-to-refresh during play. | P0 |
| COMPAT-01 | MUST work in current evergreen desktop and mobile browsers; graceful degradation if Web Audio or localStorage is unavailable. | P0 |
| A11Y-01 | MUST respect `prefers-reduced-motion` (disable decorative animation). | P0 |
| A11Y-02 | All menus MUST be keyboard-operable; interactive elements MUST have focus styles. | P1 |
| PORT-01 | The game MUST run from a single file or plain static hosting with **zero dependencies and zero network requests**. | P0 |
| DATA-01 | No analytics, no accounts, no cookies. localStorage only. | P0 |

## 6. Content inventory (v1.0)

| Element | Behavior | Points | Status |
|---|---|---|---|
| Jelly ball | Player-actuated physics object with face | — | ✅ prototype |
| Saw | Horizontal crosser, sine bob | death | ✅ prototype |
| Star | Static drift, timed despawn | +40 | ✅ prototype |
| Shield ring | One-hit protection aura | — | ✅ prototype |
| *(Planned: falling spike, seeker, slow-mo, magnet, heavy star)* | see guide §4.4 | | roadmap |

## 7. Open questions

1. Should a miss cost anything beyond combo? (Current: no — revisit only if playtests show spam-miss strategies.)
2. Climb mode as separate game mode vs. sequel scope? (Guide §4.5.)
3. Is ×10 the right multiplier cap, or should MAX combos grant a small passive bonus?