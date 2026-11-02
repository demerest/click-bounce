# KEEP IT UP — itch.io store page copy

Upload checklist (all files live in this folder or are produced by `tools/`):

- **Zip archive:** `itch/keep-it-up.zip` — regenerate with `powershell -File tools\package.ps1`.
  Contains `index.html` at the root and nothing else: the build is a single
  self-contained file (inline CSS + JS, zero assets, zero dependencies, zero
  network requests), so it runs offline straight from itch's HTML player.
- **Cover screenshot:** `itch/cover-630x500.png` — regenerate with
  `powershell -File tools\cover.ps1` (captures the real build at exactly
  630x500; no generated imagery).
- **Kind:** HTML. **Session:** no saves needed (bests live in localStorage).
- **Player:** single player. **Input:** mouse / touch / one key.

Suggested tags: `one-button`, `arcade`, `high-score`, `physics`, `minimalist`,
`juicy`, `singleplayer`, `browser`, `html5`, `score-attack`.

---

## Tagline (short slot, header)

One click. One jelly ball. Never touch the floor.

## Short description (summary field)

KEEP IT UP is a one-click arcade game: bounce a jelly ball away from your finger, chain combos, dodge saws, spikes and drones, and grab stars, shields and slow-mo bubbles. Three modes, a daily seed, four unlockable skins — no install, plays in any browser.

## Long description (description field, markdown)

**The jelly ball knows only one word: boing.** Click or tap near it and it flies
*away* from your finger — so where you click is how you steer. Keep it off the
floor for as long as you can. That is the whole game, and it will ruin your
evening.

### The one rule

- **Click / tap near the ball** to bounce it away from your pointer.
- Quick taps are weak. Let it fall a beat for a full-power *boing*, and chain
  bounces inside the combo window to multiply your score (caps at ×10).
- A miss only breaks your combo. The floor does not forgive.

### Three modes

- **Classic** — the pure loop. Hazards start after a grace period and never
  spawn on top of you; skim one without touching it for a near-miss bonus.
- **Climb (the hard one)** — score is metres climbed and the camera only moves
  up. Every wall of saws leaves one dashed corridor: that is your way through,
  while lava rises forever below.
- **Daily run** — today's date seeds a remix of gravity, saw pace, saw speed and
  star rate. Everyone gets the same mix; only your best for the day is kept.

### What kills you

- **Saw** — crosses the screen; a red edge flash warns you before it arrives.
- **Spike** — a ceiling marker telegraphs for a second, then drops where you
  *were*. Keep moving.
- **Drone** — slow homing, capped turn rate, dies on walls. Out-fly it.
- **Lava** (Climb) — rises forever after its grace period. It is your floor now.

### What helps you

- **Star** — points in Classic, metres in Climb.
- **Shield** — eats exactly one hazard hit, then pops.
- **Slow-mo** — the whole simulation dilates to 45% for a few seconds. Saws included.
- **Magnet** — stars fly to you from across the screen.
- **Heavy star** — a fat pile of points, but gravity +15% for eight seconds.
  Greed is a choice.

### Keep coming back

Four achievements, four ball skins unlocked by best score, a share-card copy of
every run, and per-mode bests remembered locally. Mute, pause and reduced-motion
are one key or click away.

### Built different

One HTML file. No assets, no dependencies, no network requests, no ads, no
tracking — it plays offline and loads instantly. Fairness first: every hazard
telegraphs and is reachable, every ramp has a cap, and the item density is
normalised per play area so a phone and a monitor feel the same.

**Controls:** click / tap / space to bounce · P or Esc pauses · M mutes.
That's it. Go keep it up.
