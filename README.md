# KEEP IT UP

One-click arcade: a jelly ball falls forever; you bounce it back up.
Zero asset files, zero dependencies, zero network requests.

**Play it live:** <https://demerest.github.io/click-bounce/> (GitHub Pages)
**Repository:** <https://github.com/demerest/click-bounce>

`prototype.html` is the frozen Phase-0 reference build. **Do not edit it.**
Everything below is the Phase 1–3 implementation.

---

## Play it

Double-click **`index.html`**. That is the whole game — one self-contained file
(PORT-01). It works from `file://`, from a USB stick, from static hosting.

| Input | Action |
|---|---|
| Click / tap near the ball | bounce it *away* from the pointer |
| Space / Enter | start, retry |
| P / Esc | pause / resume (auto-pauses when the tab is hidden) |
| M | mute (remembered) |

Quick taps are weak; letting the ball fall a beat gives a full-power boing.
Chain bounces inside the 2.2 s window for combo (scoring caps at ×10).
Miss and the combo breaks — nothing worse. The floor and hazards end the run.

Pickups: **★ star** +40 · **teal ring** one-hit shield · **blue bubble** half
gravity 4 s · **violet loop** star magnet 6 s · **bronze star** +200 but +15 %
gravity for 8 s. Hazards: **saws** cross the screen, **spikes** telegraph on the
ceiling for 1 s then drop where you *were*, and after 60 s a **drone** hunts you
with a capped turn rate and dies on walls. Skim a hazard for a +15 near-miss.

### Modes and meta

- **Climb mode** (`C` from the menu): race upward for metres while lava rises.
  Each 300 px band is a wall of saws with a *validated* passable corridor (dashed
  teal channel); stars in a corridor pay +5 m, every third band hides a shield.
- **Daily run** (`D`): today's date seeds bounded multipliers for gravity, saw
  pace/speed, grace and star rate. Today's best is remembered.
- **Badges**: ×10 combo · 3 stars in a run · survive 120 s · a shield save.
  Earned badges persist and announce themselves with a CSS toast.
- **Skins**: four palette swaps (no images), unlocked at best-score thresholds
  0 / 600 / 1800 / 4000; pick one from the menu swatches.
- **Copy score** on the game-over panel puts a plain-text result on the
  clipboard — no network involved.

## Develop it

There is no node, deno, bun or python on this machine, and ES modules will not
load over `file://`, so the source is real ES modules in `src/` and the shipped
file is produced by a **concatenation bundler written in PowerShell**:

```
powershell -ExecutionPolicy Bypass -File build.ps1      # -> index.html, dev.html, build/game.js
powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8123   # http server for dev.html
powershell -ExecutionPolicy Bypass -File tools\verify.ps1             # build + tests + rAF proof
```

`dev.html` loads `src/game.js` as a module (needs the server). `index.html` is
the inlined bundle. Both are generated; edit `src/`, never the outputs. They are
nonetheless **committed** so GitHub Pages can serve the game straight from the
repository root with no build step in CI; after editing `src/`, run `build.ps1`
and commit the regenerated outputs together with the source change.

### Bundler authoring rules (enforced by build.ps1)

1. imports are single-line and named: `import { a, b } from './x.js';`
2. exports are inline declarations only (`export const|let|function|class`);
   no `export { }`, no default exports, no re-exports
3. top-level names are unique across modules — the bundle puts every module in
   one IIFE scope

`build.ps1` also fails the build when any `CFG.<key>` referenced by the code is
missing from `config.js` (a typo there would silently become NaN physics), warns
about unused knobs, and asserts `index.html` contains no `src=`, `href=`, `url(`,
`@import` or `://` anywhere (PORT-01 / DATA-01).

## Test it

```
powershell -ExecutionPolicy Bypass -File tools\verify.ps1
```

`verify.ps1` runs three gates and exits non-zero if any fails:

1. **build** — the checks above;
2. **integration harness** (`tests/harness.html`) — headless Chrome loads
   `index.html?debug` (deterministic stepping), the shipped `index.html` and
   `dev.html` side by side and runs ~290 assertions covering every P0/P1
   requirement: bounce/charge/minimum-lift, anti-spam and multi-touch, miss
   semantics, walls, the dt clamp, combo window and cap, gravity ramp and hard
   cap, spawn fairness (130 px, off-screen entry, ≥1.5 s visibility), hazard and
   pickup caps, spike telegraph, drone gate/turn-cap/wall-death, shield
   absorption, near-miss, pickup effects and their stacking caps, death
   slow-motion and the restart lock, pause/resume state integrity, reduced
   motion, fx budgets, hit-stop, attract mode, audio guards and mute, real
   pointer/keyboard plumbing, HUD and game-over stats, zero leaked globals,
   zero assets, blocked-localStorage degradation, and resize safety;
3. **rAF proof** — screenshots of the shipped build at two virtual times must
   differ, proving the loop animates without any test hook.

`index.html?debug` exposes one namespaced handle (`window.__KEEPUP__`) and does
not auto-start the loop, so the harness can drive fixed-dt steps. The shipped
page defines no globals at all (asserted).

`tools/fails.ps1 -Path <dumped-dom.html>` prints just the failures from a dump.

## Layout

```
index.html          built single-file game (the deliverable)
dev.html            built ES-module loader (development)
build/game.js       built raw bundle (inspection)
build.ps1           concatenation bundler + static checks
prototype.html      frozen Phase-0 reference (untouched)
REQUIREMENTS.md     requirement IDs (CORE/SCORE/DIFF/PICK/HAZ/PHYS/AUD/UI/…)
ROADMAP.md          phases, tuning table, QA checklist
IMPLEMENTATION_GUIDE.md  ground rules
src/
  config.js   CFG — every tunable number, single source of truth
  math.js     clamp/rand/lerpAngle/turnToward/decay/approach
  rng.js      seeded RNG (FNV-1a hash + mulberry32) for the daily
  storage.js  localStorage, fully guarded
  dom.js      one element lookup each; fatal banner; live region
  audio.js    Web Audio synth only (AUD-01..06)
  state.js    the one mutable game object; gravity ramp + caps
  fx.js       particles/rings/texts/edge-warns, all budget-capped
  ball.js     the core verb, integration, death burst
  spawn.js    spawners + pacing; fairness rules
  entities.js hazard stepping, contact (shield/kill/near-miss), pickups
  flow.js     state machine: menu/play/paused/dying/over; modes; share text
  achievements.js  Phase 4 badges + toast queue
  skins.js    Phase 4 palette swaps and unlock thresholds
  daily.js    Phase 4 seeded daily modifiers and per-day best
  climb.js    Phase 5 bands, corridor validation, camera, lava
  render.js   all canvas drawing (no blur filters, particles are fillRect)
  hud.js      DOM HUD, overlays, effect pills, toasts, meta rows, focus management
  input.js    the only place that touches DOM events
  game.js     loop (the single dt clamp), boot, debug seam
tools/        serve.ps1 (static server), verify.ps1, fails.ps1
tests/        harness.html
```

## Deviations from the (truncated) guide

`IMPLEMENTATION_GUIDE.md` on disk stops mid-§3 and `ROADMAP.md` starts at
"Practical notes", so §4.4/§4.5 of the guide and §1–3 of the roadmap (including
the target module layout) are missing. The layout above is inferred from
`REQUIREMENTS.md` §6 and the roadmap's phase bullets. Consequences:

- **Bundler**: the roadmap suggests `python -m http.server`/`npx serve`, neither
  of which exists here; `tools/serve.ps1` (raw `TcpListener`, no URL ACL needed)
  replaces them, and `build.ps1` replaces a real bundler.
- **Pillar 3 enforcement**: rather than slowing hazards (which feels wrong),
  `spawn.js` pushes a hazard's spawn point further off-screen so its travel time
  to the ball's column is always ≥ `hazardMinVisible` (1.5 s); the edge flash
  covers the wait. Saws also hold off-screen for `hazardWarnTime` (0.45 s).
- **HAZ-02 hard guarantee**: `rollSafeY` falls back to a provably safe height
  when its 8 re-rolls run out (which happens whenever the ball sits mid-screen),
  instead of spawning an unfair saw.
- **CFG scope**: gameplay/timing/spawn/fx numbers live in `CFG`; pure drawing
  geometry (eye offsets, tooth ratios, chevron sizes) lives in named constants at
  the top of `render.js`. The build verifies CFG is complete and fully used.
- **Debug seam**: `?debug` adds exactly one namespaced global for tests; the
  shipped page has none.

## Status

- Phase 1 (restructure, identical feel): done — module split, CFG audit, guarded
  storage/audio, zero globals.
- Phase 2 (feel & juice): done — hit-stop, death slow-motion, pause + auto-pause,
  near-miss bonus, edge warnings.
- Phase 3 (content): done — falling spike, slow-mo bubble, magnet, heavy star,
  seeker drone; each with feedback, a sound and a menu line.
- Phase 4 (meta & retention): done — four achievements with CSS toasts, four
  unlockable palette skins, seeded daily challenge with per-day best, clipboard
  share. None of it touches the core loop's frame budget (conditions are a few
  comparisons per frame; toasts and meta rows are DOM-only).
- Phase 5 (climb mode): done — camera follows max height, score in metres,
  procedurally generated saw bands with a corridor validated at generation time
  (width, arena bounds, saw-free, lateral reachability), rising lava with a
  capped speed as the soft timer.
- All P0 and P1 requirement IDs implemented and covered by the harness.
- Phase 6 (ship/QA-on-device) remains: QA checklist on a real mid-range phone
  and a performance pass.

Tuning lives entirely in `CFG` (`src/config.js`); the ROADMAP §5 table still
applies, with the new knobs documented inline.
