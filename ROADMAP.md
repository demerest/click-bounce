
Practical notes:

- Use ES modules (`<script type="module">`). Modules do **not** load over `file://` — run a local server: `python -m http.server` or `npx serve`.
- Keep the `dt` clamp in exactly one place (the loop).
- Pass state down; avoid a second global mutable mess. A small `game` object handed to modules is enough — no framework.

## 4. Roadmap

### Phase 1 — Restructure (no gameplay change)

- [ ] Split prototype into the module layout above
- [ ] Move all tunables into `config.js`; audit for leftover magic numbers
- [ ] Guard localStorage and AudioContext absence explicitly
- [ ] **Acceptance:** plays and feels *identically* to `prototype.html` (A/B side by side); zero globals beyond module exports

### Phase 2 — Feel & juice

- [ ] 2–4 frame hit-stop on bounce (freeze physics, keep wobble) — biggest cheap win
- [ ] Stronger death moment: slow-motion ~250 ms before the game-over panel
- [ ] Auto-pause on `visibilitychange` + pause overlay (UI-06)
- [ ] Near-miss bonus: passing within ~20 px of a saw unscathed → +15, "close!" text
- [ ] Screen-edge warning flash when a hazard is about to enter
- [ ] **Acceptance:** 10 recorded deaths, 0 felt "cheap"; pause/resume leaves state intact

### Phase 3 — Content drop

Add in this order, one per playtest cycle:

- [ ] **Falling spike**: telegraphs with a warning marker on the "ceiling" line for 1 s, then drops. Never targets the ball's current x directly — targets where it *was* (dodgeable by moving).
- [ ] **Slow-mo bubble**: gravity ×0.5 for 4 s; distinct audio (detuned pad); rare.
- [ ] **Magnet**: stars within 150 px drift toward the ball for 6 s.
- [ ] **Heavy star** (risk/reward): +200 points but gravity +15% for 8 s; visually darker/heavier.
- [ ] Optional late-game (after 60 s) **seeker drone**: slow homing, capped turn rate, dies on walls — must obey the 1.5 s visibility rule.
- [ ] **Acceptance:** each addition has feedback+sound+help text; no requirement ID regresses; difficulty caps still hold

### Phase 4 — Meta & retention

- [ ] Achievements (pure CSS badge toasts): first ×10 combo, 3 stars in one run, survive 120 s, shield-save a saw
- [ ] Unlockable ball skins (palette swaps only — still no images): unlocked by best-score thresholds
- [ ] Daily challenge: seeded RNG (date string → seed) varies gravity/hazard mix; localStorage remembers today's result
- [ ] Share score: copy plain text to clipboard ("KEEP IT UP — 1,240 pts, ×10 combo")
- [ ] **Acceptance:** none of this touches the core loop's frame budget

### Phase 5 — Climb mode (optional, P2)

Same physics; new mode, not a rewrite:

- [ ] Camera follows max height; score = meters
- [ ] Procedural "bands" every ~300 px with pre-placed saws/stars; guarantee a passable corridor (validate at generation, not by luck)
- [ ] Rising lava as the soft timer; floor rule replaced by lava rule
- [ ] **Acceptance:** 5 consecutive test runs with no unavoidable band

### Phase 6 — Ship

- [ ] QA checklist (§7) green
- [ ] Performance pass on a real mid-range phone (target: no frame > 20 ms)
- [ ] Deploy to static hosting (GitHub Pages / itch.io); verify zero network requests in DevTools
- [ ] If itch.io: package as zip of the static folder; if a store icon is required, generate it as an SVG/canvas export — still no authored bitmaps

## 5. Tuning guide

All knobs live in `CFG`. Change one at a time; record results.

| Knob | Current | Meaning | Too hard → | Too easy → |
|---|---|---|---|---|
| `gravityBase / gravityRamp / gravityMax` | 950 / 9 / 1650 | Global pace | lower ramp (6), lower cap | raise ramp (12) |
| `bouncePower` | 880 | Max impulse | raise to 950 | lower to 800 |
| `bounceChargeTime` | 0.45 | Risk/reward steepness | 0.3 | 0.6 |
| `bounceMinFactor` | 0.55 | Spam-tap floor | raise to 0.7 | lower to 0.45 |
| `hitRadiusMul` | 2.3 | Input forgiveness | 2.6 | 2.0 |
| `comboWindow` | 2.2 | Combo generosity | 2.6 | 1.8 |
| `hazardDelay` | 9 | Grace period | 12 | 6 |
| `hazardIntervalMin` | 1.15 | Endgame pressure | 1.4 | 0.9 |

**Playtest targets:** first-time run 20–40 s · decent run 90–180 s · expert ceiling not reached below ~4 min.
**Playtest protocol:** watch, don't coach. Log every death as *fair / unfair / unclear why*. Any "unfair" is a P0 bug; any "unclear" is a feedback (juice) bug.

## 6. Technical guidelines

- **Loop:** one `requestAnimationFrame`; `dt = min(dt, 1/30)`; update → HUD → render. Never run logic in event handlers except recording intents.
- **Physics:** semi-implicit Euler only. No collision needed for walls/floor beyond clamping (the ball is the only body vs. static bounds). Hazard/pickup tests are circle-circle — keep them that way.
- **Spawners:** always (a) re-roll positions near the ball, (b) count live entities against caps, (c) enter hazards from off-screen edges.
- **FX budget:** ≤ ~120 live particles, ≤ 6 rings, ≤ 8 texts. Reuse arrays with reverse-iteration splice (as in prototype) or pool if you add more.
- **Audio:** every sound = short envelope, master ≤ 0.2, never more than ~6 simultaneous tones; the bounce ladder is the identity — don't re-tune it casually.
- **Rendering:** no `shadowBlur` in hot paths; gradients per frame are fine at this scale, cache them only if profiling says so; keep the background hue-shifting (it's cheap and it's the game's visual signature).
- **Commit style:** `[phase-N] short description (REQ-IDs)` — e.g. `[phase-3] add falling spike with telegraph (HAZ-06, pillar 3)`.

## 7. QA checklist (run before every release)

- [ ] First click of the session produces sound (audio unlock in gesture)
- [ ] Tab away for 30 s mid-run, return: no teleporting ball, no instant death (dt clamp)
- [ ] Resize/rotate mid-run: playfield correct, ball still inside bounds
- [ ] Rapid tap (10/s) for 5 s: no runaway score, ball stays controllable (charge + cooldown)
- [ ] Miss a click on purpose: combo resets, ball unaffected
- [ ] Shield: absorbs exactly one saw, then gone; second saw kills
- [ ] Private-browsing mode: game runs, best score silently not persisted
- [ ] Multi-touch: two simultaneous taps don't double-apply a bounce
- [ ] `prefers-reduced-motion`: menu demo animation disabled
- [ ] Keyboard-only: reach Start and Retry with Tab/Space
- [ ] DevTools: zero network requests, zero console errors

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Spam-click degenerates the loop | Medium | Charge mechanic + 100 ms cooldown (already in); watch for tap-and-hold exploits in playtests |
| Difficulty wall around 90 s feels unfair | Medium | Caps already defined; tune `hazardIntervalMin` first |
| Audio autoplay blocked on iOS/Safari | High if careless | Context created only inside `pointerdown`/click (AUD-02) — never on load |
| Scope creep into soft-body / climb mode early | High | PHYS-06 + phase order; prototype is the vertical slice — polish before expanding |
| Perf drop on low-end phones from particles | Low | FX budget (§6); particles are `fillRect`, keep it that way |
| Modules break for users opening `index.html` via `file://` | Medium | Document local-server step in README; or ship a built single file (concatenation script) for distribution |

## 9. Definition of done — v1.0

- [ ] All P0 requirements pass in a fresh review against this document
- [ ] QA checklist (§7) fully green
- [ ] 60 fps on a mid-range phone, no frame spikes > 20 ms
- [ ] Three outside playtesters complete a run without verbal help
- [ ] Zero asset files, zero network requests, zero dependencies
- [ ] Deployed and reachable; `prototype.html` archived untouched