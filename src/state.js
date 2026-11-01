/* state.js — the one mutable game object, handed to every system.
 * ROADMAP §3: "Pass state down; avoid a second global mutable mess."
 */

import { CFG, KEYS } from './config.js';
import { rand } from './math.js';

export function makeBall(){
  return {
    x: 0, y: 0, vx: 0, vy: 0,
    r: CFG.ballRadius,
    spin: 0,        // angular velocity (visual, CORE-09)
    ang: 0,         // integrated angle, drawn as surface flecks
    dispAng: -Math.PI / 2,   // stretch orientation (PHYS-04)
    wAmp: 0, wPhase: 0,      // damped jelly wobble (PHYS-03)
    blinkT: 2.5, blink: 0,   // PHYS-05
    dead: false,
    trail: [],
  };
}

export function createGame(){
  const g = {
    /* lifecycle: menu | play | paused | dying | over (UI-01, UI-06) */
    state: 'menu',
    pausedBy: null,        // 'user' | 'tab'
    reducedMotion: false,  // A11Y-01

    /* mode (Phase 5): 'classic' | 'climb'; daily holds seeded mods or null */
    mode: 'classic',
    daily: null,
    bestKey: KEYS.best,
    skin: null,
    climb: null,

    /* view */
    W: 0, H: 0, dpr: 1,

    /* clocks */
    totalT: 0,        // never reset: charge + animation reference
    elapsed: 0,       // run time; drives every difficulty ramp
    lastBounceAt: -9,
    timeScale: 1,     // death slow-motion
    deathT: 0,
    overAt: 0,        // UI-04 restart lock reference
    panelShown: false,
    hitStop: 0,       // Phase 2 hit-stop

    /* scoring (SCORE-*) */
    score: 0, best: 0, newBest: false,
    combo: 0, comboTimer: 0, maxCombo: 0, bounces: 0,
    starsRun: 0, shieldSaves: 0,      // Phase 4 achievement counters

    /* active effects */
    shield: false,    // PICK-02
    slowmoT: 0,       // Phase 3
    magnetT: 0,       // Phase 3
    heavyT: 0,        // Phase 3

    /* entities */
    ball: makeBall(),
    hazards: [], pickups: [],
    particles: [], rings: [], texts: [], edgeWarns: [],
    bgDots: [],

    /* spawn timers */
    sawTimer: 0, spikeTimer: 0, seekerTimer: 0,
    starTimer: 0, shieldTimer: 0, slowmoTimer: 0, magnetTimer: 0, heavyTimer: 0,

    /* fx */
    shake: 0, dotKick: 0, hue: CFG.bgHueBase,
  };

  for (let i = 0; i < CFG.bgDots; i++){
    g.bgDots.push({
      x: Math.random() * 2000, y: Math.random() * 1200,
      r: rand(CFG.bgDotRMin, CFG.bgDotRMax),
      s: rand(CFG.bgDotSpeedMin, CFG.bgDotSpeedMax),
      a: rand(CFG.bgDotAlphaMin, CFG.bgDotAlphaMax),
      k: rand(CFG.bgDotKickMin, CFG.bgDotKickMax),
    });
  }
  return g;
}

export function resetBall(g){
  const b = g.ball;
  b.x = g.W / 2; b.y = g.H * 0.4;
  b.vx = rand(-30, 30); b.vy = -250;
  b.spin = 0; b.ang = 0; b.dispAng = -Math.PI / 2;
  b.wAmp = 0; b.wPhase = 0;
  b.dead = false;
  b.blinkT = 2.5; b.blink = 0;
  b.trail.length = 0;
}

export function resetRun(g){
  g.score = 0; g.combo = 0; g.comboTimer = 0; g.maxCombo = 0; g.bounces = 0;
  g.starsRun = 0; g.shieldSaves = 0;
  g.newBest = false;
  g.elapsed = 0;
  g.lastBounceAt = g.totalT - 9;      // first bounce of a run is always full charge
  g.timeScale = 1; g.deathT = 0; g.panelShown = false; g.hitStop = 0;
  g.shake = 0; g.dotKick = 0;
  g.shield = false; g.slowmoT = 0; g.magnetT = 0; g.heavyT = 0;
  g.climb = null;

  g.hazards.length = 0; g.pickups.length = 0;
  g.particles.length = 0; g.rings.length = 0; g.texts.length = 0; g.edgeWarns.length = 0;

  /* the daily seed, when present, replaces the classic pacing constants */
  const d = g.daily;
  g.sawTimer = d ? d.grace : CFG.hazardDelay;          // DIFF-02 grace period
  g.spikeTimer = CFG.spikeFirstAfterGate;
  g.seekerTimer = CFG.seekerFirstAfterGate;
  g.starTimer = CFG.starFirst;
  g.shieldTimer = CFG.shieldFirst;
  g.slowmoTimer = CFG.slowmoFirst;
  g.magnetTimer = CFG.magnetFirst;
  g.heavyTimer = CFG.heavyFirst;

  resetBall(g);
}

/* DIFF-01 ramp, then daily + pickup multipliers, then the hard cap (DIFF-05).
 * Slow-mo is deliberately NOT here: it dilates time (timeScaleNow), not gravity. */
export function gravityNow(g){
  let gr = Math.min(CFG.gravityMax, CFG.gravityBase + g.elapsed * CFG.gravityRamp);
  if (g.daily) gr *= g.daily.gravityMul;
  if (g.heavyT > 0) gr *= CFG.heavyGravityMul;
  return Math.min(gr, CFG.gravityHardCap);
}

/* Death slow-motion and the slow-mo bubble both scale simulated time. */
export function timeScaleNow(g){
  return g.timeScale * (g.slowmoT > 0 ? CFG.slowmoTimeScale : 1);
}

export function countKind(g, kind){
  let n = 0;
  for (let i = 0; i < g.hazards.length; i++) if (g.hazards[i].kind === kind) n++;
  return n;
}

/* Each mode gets its own sky so you always know what you are playing. */
export function bgBaseHue(g){
  if (g.mode === 'climb') return CFG.bgHueClimb;
  if (g.daily) return CFG.bgHueDaily;
  return CFG.bgHueBase;
}
