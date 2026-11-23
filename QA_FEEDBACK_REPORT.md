# QA feedback triage — KEEP IT UP

Source: paid QA review `a8082033-…_feedback_1795387698.pdf` (review date 22 Nov 2026).
The review is evidence-grounded: it was written from supplied gameplay captures and
the published feature description, **not** from independent device execution — it
says so itself. Triaged 23 Nov 2026 against the current build (harness: 539
assertions, 44 sections, `tools/verify.ps1`).

Status legend: **Addressed** = implemented and covered by regression assertions;
**Partial** = partly covered, a concrete gap remains; **Open** = not implemented.
Effort to close the gap: **S** < 1 h (CSS/copy/small logic + assertion),
**M** ~ half a day (new optional subsystem + tests), **L** multi-day.

## Summary

| Item | Review class | Relevance | Status | Effort to close |
|---|---|---|---|---|
| KU-01 first-time control comprehension | Usability, Medium | High (steering is unconventional) | Open (attract demo + text only) | M |
| KU-02 in-run feedback hierarchy | Usability, Medium | Medium | Partial (phone meter moved; bar still thin) | S |
| KU-03 scoring & combo explanation | Validation, High | High, but already verified | Addressed | – |
| KU-04 daily repeatability | Validation, High | High | Addressed (incl. 11-19 per-day best fix) | – |
| KU-05 game-over & replay flow | Positive, Low–Med | Medium | Partial (no cause-of-death label) | S |
| KU-06 sound, pause, accessibility | Validation, Medium | Medium | Addressed | – |
| KU-07 hazard telegraph fairness | Validation, High | High | Addressed | – |
| KU-08 pickups & temporary effects | Validation, Medium | Medium | Addressed | – |
| KU-09 progression & local persistence | Validation, Medium | Medium | Addressed | – |
| KU-10 compact screens & overlays | Usability, Medium | Medium | Partial (no safe-area insets) | S–M |

## Item-by-item

### KU-01 — First-time control comprehension (Open, M)
They ask for a short optional interactive first-bounce cue (touch point, push
direction, power buildup), skippable. Today the menu teaches the rule in words
and the attract-mode autopilot ball (§21) shows bouncing live, but nothing teaches
*steering* (ball flies away from the tap) or *charge* (let it fall for a full
boing) visually. This is the most relevant open item: the core verb is
unconventional and first-run misreads look like broken input.
Gap: optional first-run overlay (arrow from tap point + charge hint), shown once,
persisted skip, casual number-free copy. M: new overlay + storage flag + harness
assertions; must not interrupt returning players.

### KU-02 — In-run feedback hierarchy (Partial, S)
They want a louder combo-expiry cue and Daily identifier on compact screens.
Already done since their captures: phone combo meter moved under the score
(11-10, camera-notch fix), combo bar is a permanent HUD element (§25), Daily tag
is a coloured bordered chip. Remaining gap: the expiry bar is 5 px thin and the
combo digits could scale up on small screens; contrast vs bright/dark skies is
untested. S: media-query scale/contrast bump + a HUD geometry assertion.

### KU-03 — Scoring & combo explanation (Addressed)
They ask to verify base points, window entry/expiry, missed taps, caps and
displayed totals against deterministic cases. That is exactly harness §5
(charge/minimum lift), §6 (miss breaks combo, rate limit), §8 (window + cap),
§13 (near-miss), §24 (over-panel stats), §25 (HUD totals). Note: their "up to
×10" is stale — the cap has been ×25 with a shrinking window since 11-10, and the
assertions track it (55/125-point cases, ×25 MAX).

### KU-04 — Daily Run repeatability (Addressed)
Same-date reproducibility, different-date divergence, best-only-if-higher and
per-day rollover are asserted in §35, including the 11-19 fix that daily bests
live under `keepup.daily.<date>` (a stale best from an older day can no longer
leak into today, and daily runs never write the classic best). Force-close
persistence is localStorage by construction (§27 covers blocked storage).
Clock/timezone changes intentionally change the local date key — same rule for
everyone, documented behaviour, not a defect. Optional S: explicit
`dailyKey(fakeDate)` midnight-rollover assertion.

### KU-05 — Game-over & replay flow (Partial, S)
Bounce Again is already the dominant action and Copy Score secondary (§16/§24,
§41 retry keeps mode). Gap: no cause-of-death label — the eyebrow is mode-based
("GRAVITY WINS" / "THE LAVA WINS"), so a saw death and a floor death read the
same. S: thread a cause through `die()` (floor / saw / spike / drone / lava) into
`fillGameOver`, casual one-liner, one assertion per cause.

### KU-06 — Sound, pause, accessibility (Addressed)
Pause freezes physics and all hazard timers (§17, `update()` early-returns before
spawners); tab-hide auto-pauses (`input.js` visibilitychange) so interruptions
never kill a run; mute persists (§22, `loadPersisted`); reduced motion strips
decoration and parks the menu ball without touching game timing (§18).

### KU-07 — Hazard telegraph fairness (Addressed)
Warning visibility, reaction windows, collision bounds, safe spawns and Climb
corridors are deterministic assertions: §9 (spawn margin, off-screen entry,
`hazardMinVisible`), §10 (1 s spike telegraph), §11 (drone turn cap, wall death),
§37 (every band has a reachable corridor, 5 runs), §42/§43 (sealed rows, band on
screen). What remains is purely visual on-device confirmation, not code.

### KU-08 — Pickups & temporary effects (Addressed)
§12 (shield eats exactly one hit, classic and climb), §14 (caps, despawn blink),
§15 (slow-mo = true 45 % time dilation measured by fall-distance ratio, magnet
targeting, heavy-star gravity duration, stacking caps). Matches their checklist
line for line.

### KU-09 — Progression & local persistence (Addressed)
Records update only when surpassed (`newBest` logic), Classic/Climb/Daily keys
separate (§35/§41), achievement thresholds and toasts (§33), skin unlock
persistence (§34), restart recovery (`loadPersisted`), blocked-storage degradation
(§27). The stale daily best they could have observed was fixed 11-19.

### KU-10 — Compact screens & overlays (Partial, S–M)
Scrolling (accordion + `panelBody` overflow), short-screen media queries,
rotation (wrapper `configChanges`), mid-run resize (§28) and return-after-
interruption (auto-pause) are covered; the Android share/edit overlay in their
capture is correctly classified as platform, not game. Gap: no
`env(safe-area-inset-*)` padding — on cutout phones the top HUD can sit under the
camera in fullscreen WebView. S–M: `viewport-fit=cover` + inset padding on
`#scoreBox`/`#sysBtns`, then a real-device check (headless can't emulate cutouts).

## Their checklist vs our regression suite

1. Control physics → §5–7. 2. Score integrity → §8, 13, 24, 25. 3. Daily integrity
→ §35. 4. Hazard fairness → §9–11, 37, 42, 43. 5. State persistence → §27, 33–35.
6. Performance/a11y → §18, 19, 22, 25, 44 (density clamps). 7. Interruption →
visibilitychange auto-pause + §17. 8. Sharing → §36 (clipboard-only, no network).

The 12-device matrix (A06/A90/A3x/X5b/A36) is on-device QA planning, not code
work; this machine verifies headlessly plus real captures and the owner's
on-device playtests. Treat it as the remaining Phase-6 activity; nothing in the
review blocks production that the suite doesn't already guard.

## Stale facts in the review (captures predate recent rounds)

- "multiplier up to ×10" → ×25 with shrinking window since 11-10.
- Daily best carry-over risk → fixed 11-19 (per-day key, zero on a new day).
- Technical menu copy → rewritten casual 11-16; daily remix now shows its three
  biggest twists (11-19), which also answers their "mode-specific fairness"
  visibility concern.

## Recommended next steps (if any)

1. KU-05 cause-of-death label (S) — cheap clarity win on the most-seen screen.
2. KU-02 combo cue scale/contrast on phones (S).
3. KU-10 safe-area insets (S–M, needs one real-device check).
4. KU-01 optional first-bounce cue (M) — the only genuinely new subsystem; do it
   if new-player retention matters more than shipping speed.

Everything else is already implemented and regression-guarded; no action needed.