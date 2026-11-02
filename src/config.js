/* config.js — CFG is the single source of truth for every tunable number.
 * Ground rule 1 (IMPLEMENTATION_GUIDE §1): no magic numbers in logic.
 * Ground rule 4 / pillar 4: every ramp has its cap declared right next to it.
 * Requirement IDs in comments refer to REQUIREMENTS.md.
 */

export const CFG = {
  /* ---------------- world & rendering ---------------- */
  ballRadius: 26,
  dprCap: 2,                    // PERF-02
  ceilingPad: 2.5,              // ball.y floor at -r * ceilingPad
  ceilingRest: 0.35,
  fpsFloorDt: 1 / 30,           // PHYS-01: dt clamp lives in the loop only

  /* ---------------- gravity & difficulty pacing (DIFF-01..05) ---------------- */
  gravityBase: 950,             // DIFF-01
  gravityRamp: 9,               // px/s^2 per second
  gravityMax: 1650,             // DIFF-01 cap
  gravityHardCap: 1900,         // DIFF-05: absolute ceiling AFTER pickup multipliers

  /* ---------------- bounce & input (CORE-02..10) ---------------- */
  bouncePower: 880,
  bounceChargeTime: 0.45,       // CORE-05: 0 -> full power over this many seconds
  bounceMinFactor: 0.55,        // CORE-05: spam-tap floor
  bounceMinUpward: 0.55,        // CORE-03: guaranteed upward component (x power)
  bounceMinNy: -0.35,           // push direction is tilted up to at least this
  bounceLateralMul: 0.95,
  hitRadiusMul: 2.3,            // CORE-02
  bounceCooldown: 0.1,          // CORE-08 anti-spam (also covers multi-touch)
  wallRest: 0.75,               // CORE-06
  wallWobble: 0.2,
  spinFromPush: 7,              // CORE-09
  spinFromOffsetGain: 0.65,     // CORE-09: glancing (off-centre) hits spin harder
  spinDecay: 1.2,
  bounceWobbleBase: 0.38,
  bounceWobbleAdd: 0.22,
  bounceRingRMul: 0.6,
  bounceRingYMul: 0.5,
  bounceRingVr: 260,
  bounceRingLife: 0.3,
  dotKickOnBounce: 180,

  /* ---------------- hit-stop & death drama (Phase 2) ---------------- */
  hitStopTime: 0.05,            // ~3 frames at 60fps: freeze physics, keep wobble
  deathSlowmo: 0.25,            // real seconds of slow-motion before the panel
  deathTimeScale: 0.25,
  deathTimeScaleRate: 18,       // fast enough to reach the slow scale inside the 250ms beat
  overPanelDelay: 0.3,          // after slow-mo ends, before the panel appears
  restartLock: 0.7,             // UI-04: no accidental restart

  /* ---------------- combo & scoring (SCORE-01..05) ---------------- */
  comboWindow: 2.2,
  comboCap: 10,                 // SCORE-03
  bouncePoints: 5,              // SCORE-01
  starPoints: 40,               // PICK-01
  heavyPoints: 200,             // Phase 3 heavy star
  nearMissPoints: 15,           // Phase 2 near-miss
  nearMissMargin: 20,           // px of surface gap that still counts as a skim
  nearMissTextGap: 16,
  scoreTextDy: 10,              // floating text anchors (SCORE-05)
  missTextDy: 12,
  saveTextDy: 20,
  nearMissTextDy: 26,

  /* ---------------- saw hazard (HAZ-01..05, DIFF-02..04) ---------------- */
  hazardDelay: 9,               // DIFF-02 grace period
  hazardIntervalStart: 3.4,     // DIFF-03
  hazardIntervalMin: 1.15,      // DIFF-03 floor
  hazardIntervalRamp: 0.03,     // seconds shaved per second of elapsed time
  hazardCap: 5,                 // HAZ-04
  sawSpeedMin: 70,
  sawSpeedMax: 130,
  sawSpeedRamp: 1.6,            // DIFF-04
  sawSpeedRampCap: 150,         // DIFF-04 cap
  sawRadiusMin: 15,
  sawRadiusMax: 24,
  sawTeeth: 9,
  sawSpinMin: 2,
  sawSpinMax: 4,
  sawBobRate: 2.2,
  sawBobAmpMin: 6,
  sawBobAmpMax: 18,
  sawExitPad: 80,
  hazardKillPad: 0.9,           // collision radius = h.r + ball.r * pad

  /* ---------------- spawn fairness (pillar 3, HAZ-02, PICK-03) ---------------- */
  spawnMargin: 130,             // min distance from the ball, both axes rules
  spawnRerolls: 8,              // HAZ-02 max attempts
  spawnOffscreen: 60,           // hazards enter from off-screen (guide §6)
  sawSpawnYMinFrac: 0.12,
  sawSpawnYMaxFrac: 0.7,
  hazardWarnTime: 0.45,         // saw waits off-screen while its edge flash shows
  hazardMinVisible: 1.5,        // pillar 3: speed capped so travel time >= this
  edgeWarnTime: 0.9,
  edgeWarnWidth: 130,
  edgeWarnCap: 4,
  edgeWarnPulseRate: 22,
  edgeWarnArrowLen: 26,

  /* ---------------- falling spike (HAZ-06, Phase 3) ---------------- */
  spikeGate: 16,                // elapsed seconds before spikes may spawn
  spikeFirstAfterGate: 1.5,
  spikeIntervalStart: 7.5,
  spikeIntervalMin: 3.6,
  spikeIntervalRamp: 0.05,
  spikeCap: 2,
  spikeWarnTime: 1.0,           // ceiling telegraph (pillar 3)
  spikeGravity: 900,
  spikeSpeedMax: 780,           // pillar 4 cap
  spikeR: 15,
  spikeEdgePad: 44,
  spikeExitPad: 90,
  spikeMarkDrop: 34,            // ceiling telegraph geometry
  spikeMarkTop: 6,
  spikeMarkWidth: 0.8,
  spikePulseRate: 18,

  /* ---------------- seeker drone (HAZ-06, Phase 3, late game) ---------------- */
  seekerGate: 60,               // "after 60 s" per ROADMAP Phase 3
  seekerFirstAfterGate: 4,
  seekerIntervalMin: 14,
  seekerIntervalMax: 20,
  seekerCap: 1,
  seekerWarnTime: 1.0,          // edge telegraph before it may connect (pillar 3)
  seekerSpeed: 132,             // slow homing
  seekerTurnRate: 1.5,          // radians/second cap (pillar 4)
  seekerR: 15,
  seekerLife: 12,               // pillar 4: it cannot chase forever
  seekerBounds: 200,            // off-screen slack before a drone is culled
  seekerRotRate: 6,
  seekerWallShake: 6,
  seekerCrashBurst: 14,
  seekerCrashSpeed: 200,
  seekerCrashRingRMul: 0.5,
  seekerCrashRingVr: 240,
  seekerCrashRingLife: 0.3,
  seekerBlinkLife: 2,           // drone flashes during its final seconds
  seekerBlinkRate: 20,

  /* ---------------- pickups (PICK-01..05) ---------------- */
  pickupCap: 4,                 // PICK-04, at the reference phone density
  pickupCapMax: 24,             // pillar 4: ceiling for the density-scaled cap
  pickupRetry: 0.6,             // re-roll delay when the cap is full
  densityRefW: 390,             // reference phone viewport: item density is per-area,
  densityRefH: 720,             // so every screen size feels like the phone field
  densityMulMin: 0.6,           // tiny windows keep a playable trickle
  densityMulMax: 6,             // pillar 4: full phone parity up to ~1080p, bounded beyond
  pickupXPad: 50,
  pickupYMin: 70,
  pickupYMaxFrac: 0.55,
  pickupContactPad: 4,
  pickupDriftRate: 2,
  pickupDriftAmp: 8,
  pickupBlinkRate: 9,
  pickupLife: 8,                // utility pickups; stars use starLife (PICK-01)
  pickupBlink: 1.6,

  starFirst: 3,
  starIntervalMin: 3.5,         // PICK-01
  starIntervalMax: 5.5,
  starLife: 7,                  // PICK-01
  starBlink: 1.6,               // PICK-01 warning window
  starR: 13,
  starSpin: 0.8,
  starPulse: 6,
  collectBurst: 16,
  collectBurstSpeed: 220,
  collectRingRMul: 0.6,
  collectRingVr: 190,
  collectRingLife: 0.28,

  shieldFirst: 10,
  shieldIntervalMin: 12,        // PICK-02
  shieldIntervalMax: 18,
  shieldR: 15,
  shieldPopVy: 150,             // PICK-05 little upward thank-you
  shieldPopShake: 7,
  shieldPopBurst: 26,
  shieldPopBurstSpeed: 260,
  shieldPopRingR: 10,
  shieldPopRingVr: 340,
  shieldPopRingLife: 0.4,
  pickupTextDy: 22,

  slowmoFirst: 7,               // a taste of the cool ability inside the grace period
  slowmoIntervalMin: 8,
  slowmoIntervalMax: 12,
  slowmoTime: 4,
  slowmoStackCap: 6,            // pillar 4
  slowmoTimeScale: 0.45,        // true time dilation: the whole sim runs at 45%
  slowmoR: 15,

  magnetFirst: 9,
  magnetIntervalMin: 10,
  magnetIntervalMax: 15,
  magnetTime: 6,
  magnetStackCap: 9,            // pillar 4
  magnetRadius: 150,
  magnetSpeed: 210,
  magnetR: 14,

  heavyFirst: 30,
  heavyGate: 25,                // elapsed seconds before heavy stars may spawn
  heavyIntervalMin: 18,
  heavyIntervalMax: 28,
  heavyTime: 8,
  heavyStackCap: 12,            // pillar 4
  heavyGravityMul: 1.15,
  heavyR: 15,

  /* ---------------- fx budget (guide §6) ---------------- */
  particleCap: 120,
  ringCap: 6,
  textCap: 8,
  particleGravity: 600,
  particleLifeMin: 0.35,
  particleLifeMax: 0.8,
  particleSizeMin: 2,
  particleSizeMax: 5,
  textLife: 0.9,
  textRise: 34,
  textFadeIn: 0.4,
  textFontPx: 15,
  ringWidth: 3,
  shakeDecay: 6,
  shakeMin: 0.3,
  dotKickDecay: 3,
  missRingR: 4,
  missRingVr: 140,
  missRingLife: 0.35,
  deathShake: 12,
  deathParticles: 40,
  deathParticles2: 18,
  deathBurstSpeed: 380,
  deathBurst2Speed: 260,
  deathRingVr: 420,
  deathRingLife: 0.5,
  floorLineH: 3,
  shieldAuraPad: 9,
  shieldAuraDash: 10,
  shieldAuraGap: 8,
  shieldAuraWidth: 2.5,
  shieldAuraSpin: 1.5,

  /* ---------------- background & ball look ---------------- */
  bgDots: 46,
  bgDotRMin: 1, bgDotRMax: 2.6,
  bgDotSpeedMin: 10, bgDotSpeedMax: 32,
  bgDotAlphaMin: 0.08, bgDotAlphaMax: 0.3,
  bgDotKickMin: 0.4, bgDotKickMax: 1,
  bgHueBase: 222,
  bgHueRate: 1.7,
  bgHueSpread: 46,
  bgDotHueOffset: 60,
  dangerFrac: 0.3,
  dangerHeight: 130,
  dangerAlphaBase: 0.12,
  dangerAlphaAdd: 0.3,

  stretchDivisor: 1500,
  stretchMax: 0.36,             // PHYS-02 cap
  scaleMin: 0.55,
  wobbleRate: 19,               // PHYS-03
  wobbleDecay: 5.2,
  dispLerp: 10,                 // PHYS-04
  dispSpeedMin: 60,
  trailLen: 12,
  trailSpeedMin: 350,
  trailSpeedRange: 500,
  trailAlpha: 0.14,
  flecks: 3,                    // CORE-09: surface flecks make spin legible
  blinkMin: 2.4, blinkMax: 5,   // PHYS-05
  blinkTime: 0.13,
  pupilXGain: 0.01, pupilXMax: 2.5,
  pupilYGain: 0.01, pupilYMax: 2,

  /* ---------------- attract mode (UI-02) ---------------- */
  autoTriggerFrac: 0.6,
  autoPushGain: 0.004,
  autoPushMax: 0.7,
  autoPushOffset: 90,
  autoFloorPowerMul: 0.9,
  autoFloorWobble: 0.45,

  /* ---------------- audio (AUD-01..06) ---------------- */
  masterGain: 0.18,             // AUD-04: must stay <= 0.2
  rootFreq: 240,
  pentatonic: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22],   // AUD-03
  toneAttack: 0.008,
  toneTail: 0.05,
  noiseCutoff: 900,
  throttleWall: 0.06,           // AUD-06 throttled sounds
  throttleNearMiss: 0.3,
  throttleWarn: 0.25,
  throttleSeeker: 0.4,

  /* ---------------- achievements (Phase 4) ---------------- */
  achToastTime: 3.2,            // seconds a badge toast stays up
  achToastIn: 0.35,
  achToastGap: 0.3,             // pause between queued toasts
  achToastCap: 4,               // pillar 4: the queue is bounded
  achStars: 3,                  // "3 stars in one run"
  achSurvive: 120,              // "survive 120 s"

  /* ---------------- skins (Phase 4): unlock by best-score threshold ---------------- */
  skinUnlock: [0, 600, 1800, 4000],

  /* ---------------- daily challenge (Phase 4) ---------------- */
  dailyGravityMin: 0.85,        // seeded multipliers, all bounded (pillar 4)
  dailyGravityMax: 1.2,
  dailyIntervalMin: 0.8,
  dailyIntervalMax: 1.25,
  dailySawSpeedMin: 0.85,
  dailySawSpeedMax: 1.3,
  dailyGraceMin: 6,
  dailyGraceMax: 12,
  dailyStarMin: 0.7,
  dailyStarMax: 1.4,

  /* ---------------- climb mode (Phase 5) ---------------- */
  climbBandSpacing: 300,        // one procedural band per this many px of height
  climbCorridorMin: 150,        // guaranteed passable gap width (pillar 3)
  climbMaxLateral: 260,         // max corridor shift between consecutive bands
  climbEdgePad: 40,
  climbSawR: 22,
  climbSealGap: 46,             // max hole between saws: below the ball diameter, so sealed
  climbSawsPerBandMax: 24,      // pillar 4: enough to seal a ~2500px-wide row
  climbBandAhead: 1.5,          // screens of bands generated above the viewport
  climbBandCap: 12,             // pillar 4: covers a 1080p-tall view plus the ahead window
  climbHazardCap: 288,          // pillar 4: bandCap * sawsPerBandMax, the hard ceiling
  climbStarDrop: 46,            // star sits this far above its band line
  climbStarMeters: 5,           // a climb star is worth this many metres
  climbShieldEvery: 3,          // every Nth band also hides a shield in its corridor
  climbPixelsPerMeter: 40,
  climbCamLead: 0.45,           // max height rests at this fraction of the view
  climbLavaStart: 520,          // lava begins this far below the start
  climbLavaGrace: 3,            // seconds before the lava starts rising
  climbLavaSpeedBase: 26,
  climbLavaSpeedRamp: 0.35,
  climbLavaSpeedMax: 70,        // pillar 4 cap
  climbLavaWarn: 140,           // glow height above the lava line
  altitudeEvery: 100,           // climb background: an altitude tick per this many px
  altitudeLabelEvery: 5,        // label every Nth tick
  altitudeAlpha: 0.06,
  altitudeLabelAlpha: 0.3,

  /* ---------------- per-mode background identity ---------------- */
  bgHueClimb: 160,              // teal-green sky for climb
  bgHueDaily: 320,              // magenta for the daily remix
  dailyStripeStep: 90,          // daily background: diagonal hatch spacing
  dailyStripeAlpha: 0.05,
};

export const KEYS = {
  best: 'keepup.best',
  bestClimb: 'keepup.best.climb',
  mute: 'keepup.muted',
  ach: 'keepup.ach',
  skin: 'keepup.skin',
  daily: 'keepup.daily.',       // + YYYY-MM-DD
};
