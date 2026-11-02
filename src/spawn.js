/* spawn.js — every spawner obeys the three rules from guide §6:
 *   (a) re-roll positions that are too close to the ball,
 *   (b) count live entities against their cap,
 *   (c) hazards enter from off-screen edges, with a telegraph.
 * Fairness (pillar 3): a hazard must be reachable no sooner than hazardMinVisible
 * seconds after it spawns. Rather than slowing the hazard down (which feels wrong)
 * we push its spawn point further off-screen, and the edge flash covers the wait.
 */

import { CFG } from './config.js';
import { Snd } from './audio.js';
import { dailyIntervalFloor } from './daily.js';
import { addEdgeWarn } from './fx.js';
import { clamp, rand, TAU } from './math.js';
import { countKind, densityMul, pickupCapNow } from './state.js';

/* HAZ-02: at least spawnMargin of vertical separation, up to spawnRerolls attempts.
 * If the re-rolls run out (which happens whenever the ball sits mid-screen, where
 * most of the spawn band is forbidden) fall back to a height that IS safe, so the
 * 130px rule holds in practice rather than on a best-effort basis. */
function rollSafeY(g, yMin, yMax){
  let y = rand(yMin, yMax);
  let tries = 0;
  while (Math.abs(y - g.ball.y) < CFG.spawnMargin && tries++ < CFG.spawnRerolls){
    y = rand(yMin, yMax);
  }
  if (Math.abs(y - g.ball.y) >= CFG.spawnMargin) return y;

  const below = g.ball.y - CFG.spawnMargin;      // higher on screen than the ball
  const above = g.ball.y + CFG.spawnMargin;      // lower on screen than the ball
  if (below >= yMin) return rand(yMin, below);
  if (above <= yMax) return rand(above, yMax);
  return y;                                      // band covers the whole screen: unavoidable
}

/* Distance the spawn point must be pushed off-screen so travel time >= hazardMinVisible. */
function offscreenStart(g, edgeX, speed){
  const travel = Math.abs(g.ball.x - edgeX);
  return Math.max(0, speed * CFG.hazardMinVisible - travel);
}

function roomFor(g){
  return g.hazards.length < CFG.hazardCap;      // HAZ-04
}

/* ------------------------------------------------------------------ saw (HAZ-01) */
export function spawnSaw(g){
  if (!roomFor(g)) return null;
  const fromLeft = Math.random() < 0.5;
  const y = rollSafeY(g, g.H * CFG.sawSpawnYMinFrac, g.H * CFG.sawSpawnYMaxFrac);
  let speed = rand(CFG.sawSpeedMin, CFG.sawSpeedMax)
            + Math.min(CFG.sawSpeedRampCap, g.elapsed * CFG.sawSpeedRamp);   // DIFF-04
  /* the daily seed scales speed, but the product stays capped (pillar 4) */
  if (g.daily){
    speed = Math.min(speed * g.daily.sawSpeedMul,
                     (CFG.sawSpeedMax + CFG.sawSpeedRampCap) * CFG.dailySawSpeedMax);
  }
  const edgeX = fromLeft ? -CFG.spawnOffscreen : g.W + CFG.spawnOffscreen;
  const extra = offscreenStart(g, edgeX, speed);
  const side = fromLeft ? 'left' : 'right';

  const h = {
    kind: 'saw', side: side,
    x: fromLeft ? edgeX - extra : edgeX + extra,
    y: y, cy: y,
    vx: (fromLeft ? 1 : -1) * speed,
    r: rand(CFG.sawRadiusMin, CFG.sawRadiusMax),
    rot: rand(0, TAU),
    rotV: rand(CFG.sawSpinMin, CFG.sawSpinMax) * (fromLeft ? 1 : -1),
    bobP: rand(0, TAU),
    bobAmp: rand(CFG.sawBobAmpMin, CFG.sawBobAmpMax),
    warn: CFG.hazardWarnTime, t: 0, life: Infinity,
    prevGap: Infinity, nearAwarded: false, entered: false,
  };
  g.hazards.push(h);
  addEdgeWarn(g, side, y, 'rgba(255,93,115,0.9)', 'rgba(255,93,115,0)');
  return h;
}

/* ------------------------------------------------- falling spike (HAZ-06, Phase 3) */
export function spawnSpike(g){
  if (!roomFor(g) || countKind(g, 'spike') >= CFG.spikeCap) return null;
  /* Targets where the ball WAS when the telegraph started, never where it is now:
   * the 1s warning is the dodge window. */
  const x = clamp(g.ball.x, CFG.spikeEdgePad, Math.max(CFG.spikeEdgePad, g.W - CFG.spikeEdgePad));
  const h = {
    kind: 'spike', side: 'top',
    x: x, y: -CFG.spikeR * 2, cy: -CFG.spikeR * 2,
    vx: 0, vy: 0,
    r: CFG.spikeR, rot: 0, rotV: 0, bobP: 0, bobAmp: 0,
    warn: CFG.spikeWarnTime, t: 0, life: Infinity,
    prevGap: Infinity, nearAwarded: false, entered: false,
  };
  g.hazards.push(h);
  addEdgeWarn(g, 'top', x, 'rgba(255,93,115,0.95)', 'rgba(255,93,115,0)');
  Snd.spikeWarn();
  return h;
}

/* -------------------------------------------------- seeker drone (HAZ-06, Phase 3) */
export function spawnSeeker(g){
  if (!roomFor(g) || countKind(g, 'seeker') >= CFG.seekerCap) return null;
  const fromLeft = Math.random() < 0.5;
  const y = rollSafeY(g, g.H * CFG.sawSpawnYMinFrac, g.H * CFG.sawSpawnYMaxFrac);
  const edgeX = fromLeft ? -CFG.spawnOffscreen : g.W + CFG.spawnOffscreen;
  const extra = offscreenStart(g, edgeX, CFG.seekerSpeed);
  const side = fromLeft ? 'left' : 'right';

  const h = {
    kind: 'seeker', side: side,
    x: fromLeft ? edgeX - extra : edgeX + extra,
    y: y, cy: y,
    vx: 0, vy: 0,
    ang: fromLeft ? 0 : Math.PI,
    r: CFG.seekerR, rot: 0, rotV: CFG.seekerRotRate, bobP: 0, bobAmp: 0,
    warn: CFG.seekerWarnTime, t: 0, life: CFG.seekerLife,
    prevGap: Infinity, nearAwarded: false, entered: false,
  };
  g.hazards.push(h);
  addEdgeWarn(g, side, y, 'rgba(195,155,255,0.95)', 'rgba(195,155,255,0)');
  Snd.seekerWarn();
  return h;
}

/* ------------------------------------------------------------------- pickups (PICK) */
function pickupRadius(type){
  if (type === 'star') return CFG.starR;
  if (type === 'shield') return CFG.shieldR;
  if (type === 'slowmo') return CFG.slowmoR;
  if (type === 'magnet') return CFG.magnetR;
  return CFG.heavyR;                     // 'heavy'
}

function pickupLife(type){
  return type === 'star' ? CFG.starLife : CFG.pickupLife;
}

/* PICK-03: prefer the horizontal band that is already far enough from the ball,
 * then verify; a bounded re-roll plus a corner fallback makes it a hard guarantee. */
function rollPickupPos(g){
  const xMin = CFG.pickupXPad;
  const xMax = Math.max(xMin + 1, g.W - CFG.pickupXPad);
  const yMin = CFG.pickupYMin;
  const yMax = Math.max(yMin + 1, g.H * CFG.pickupYMaxFrac);
  const b = g.ball, m = CFG.spawnMargin;

  const leftSpan = Math.min(xMax, b.x - m) - xMin;
  const rightSpan = xMax - Math.max(xMin, b.x + m);
  let x = 0, y = 0;

  for (let tries = 0; tries < CFG.spawnRerolls; tries++){
    if (leftSpan > 0 && (rightSpan <= 0 || Math.random() < leftSpan / (leftSpan + rightSpan))){
      x = rand(xMin, xMin + leftSpan);
    } else if (rightSpan > 0){
      x = rand(Math.max(xMin, b.x + m), xMax);
    } else {
      x = rand(xMin, xMax);            // very narrow screen: the y test carries it
    }
    y = rand(yMin, yMax);
    if (Math.hypot(x - b.x, y - b.y) >= m) return { x: x, y: y };
  }

  x = b.x < g.W / 2 ? xMax : xMin;
  y = Math.hypot(x - b.x, yMin - b.y) >= m ? yMin : yMax;
  return { x: x, y: y };
}

export function spawnPickup(g, type){
  if (g.pickups.length >= pickupCapNow(g)) return null;   // PICK-04, scaled by play area
  if (type === 'shield' && g.shield) return null;             // PICK-02
  const pos = rollPickupPos(g);
  const p = {
    type: type, x: pos.x, y: pos.y,
    r: pickupRadius(type), life: pickupLife(type),
    t: 0, ph: rand(0, TAU), pulled: false,
  };
  g.pickups.push(p);
  return p;
}

/* ------------------------------------------------------------------ pacing (DIFF-03) */
export function sawInterval(g){
  let t = Math.max(CFG.hazardIntervalMin, CFG.hazardIntervalStart - g.elapsed * CFG.hazardIntervalRamp);
  if (g.daily) t = Math.max(dailyIntervalFloor(), t * g.daily.intervalMul);
  return t;
}

export function spikeInterval(g){
  return Math.max(CFG.spikeIntervalMin, CFG.spikeIntervalStart - g.elapsed * CFG.spikeIntervalRamp);
}

export function updateSpawners(g, dt){
  if (g.state !== 'play') return;
  const mul = densityMul(g);          // per-area item density: phone pace on every screen

  /* saws: DIFF-02 grace period is already baked into sawTimer by resetRun */
  g.sawTimer -= dt;
  if (g.sawTimer <= 0){
    spawnSaw(g);
    g.sawTimer = sawInterval(g);
  }

  if (g.elapsed >= CFG.spikeGate){
    g.spikeTimer -= dt;
    if (g.spikeTimer <= 0){
      spawnSpike(g);
      g.spikeTimer = spikeInterval(g);
    }
  }

  if (g.elapsed >= CFG.seekerGate){
    g.seekerTimer -= dt;
    if (g.seekerTimer <= 0){
      spawnSeeker(g);
      g.seekerTimer = rand(CFG.seekerIntervalMin, CFG.seekerIntervalMax);
    }
  }

  g.starTimer -= dt;
  if (g.starTimer <= 0){
    g.starTimer = spawnPickup(g, 'star')
      ? rand(CFG.starIntervalMin, CFG.starIntervalMax) / ((g.daily ? g.daily.starMul : 1) * mul)
      : CFG.pickupRetry;
  }

  g.shieldTimer -= dt;
  if (g.shieldTimer <= 0){
    spawnPickup(g, 'shield');                                  // PICK-02: skipped while held
    g.shieldTimer = rand(CFG.shieldIntervalMin, CFG.shieldIntervalMax) / mul;
  }

  g.slowmoTimer -= dt;
  if (g.slowmoTimer <= 0){
    g.slowmoTimer = spawnPickup(g, 'slowmo')
      ? rand(CFG.slowmoIntervalMin, CFG.slowmoIntervalMax) / mul : CFG.pickupRetry;
  }

  g.magnetTimer -= dt;
  if (g.magnetTimer <= 0){
    g.magnetTimer = spawnPickup(g, 'magnet')
      ? rand(CFG.magnetIntervalMin, CFG.magnetIntervalMax) / mul : CFG.pickupRetry;
  }

  if (g.elapsed >= CFG.heavyGate){
    g.heavyTimer -= dt;
    if (g.heavyTimer <= 0){
      g.heavyTimer = spawnPickup(g, 'heavy')
        ? rand(CFG.heavyIntervalMin, CFG.heavyIntervalMax) / mul : CFG.pickupRetry;
    }
  }
}
