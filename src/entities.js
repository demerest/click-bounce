/* entities.js — hazard movement, contact resolution, pickup effects.
 * HAZ-03: contact kills unless a shield is held, in which case the shield is
 * consumed instead (PICK-05) and the hazard is destroyed with it.
 * Phase 2: skimming a hazard without touching it pays a near-miss bonus.
 */

import { CFG } from './config.js';
import { Snd } from './audio.js';
import { addRing, addScore, addText, burst, shakeBy } from './fx.js';
import { clamp, turnToward } from './math.js';
import { die } from './flow.js';

function pickupColor(type){
  if (type === 'star') return '#ffd166';
  if (type === 'shield') return '#4ecdc4';
  if (type === 'slowmo') return '#7fb2ff';
  if (type === 'magnet') return '#c39bff';
  return '#c98b3c';                    // heavy
}

/* ------------------------------------------------------------------ hazards */

function activate(g, h){
  if (h.kind === 'spike'){
    h.y = -h.r * 2; h.cy = h.y; h.vy = 0;
    Snd.spikeDrop();
  }
}

function stepHazard(g, h, dt){
  if (h.kind === 'saw'){
    h.x += h.vx * dt;
    h.rot += h.rotV * dt;
    h.bobP += dt * CFG.sawBobRate;
    h.cy = h.y + Math.sin(h.bobP) * h.bobAmp;
    return;
  }
  if (h.kind === 'spike'){
    h.vy = Math.min(CFG.spikeSpeedMax, h.vy + CFG.spikeGravity * dt);   // pillar 4 cap
    h.y += h.vy * dt;
    h.cy = h.y;
    return;
  }
  /* seeker: slow homing with a hard turn-rate cap (pillar 4) */
  h.life -= dt;
  if (h.life <= 0){ crash(g, h, '#c39bff'); return; }
  const b = g.ball;
  const desired = Math.atan2(b.y - h.cy, b.x - h.x);
  h.ang = turnToward(h.ang, desired, CFG.seekerTurnRate * dt);
  h.x += Math.cos(h.ang) * CFG.seekerSpeed * dt;
  h.cy += Math.sin(h.ang) * CFG.seekerSpeed * dt;
  h.y = h.cy;
  h.rot += h.rotV * dt;

  if (!h.entered && h.x > h.r && h.x < g.W - h.r) h.entered = true;
  /* dies on walls — but not the floor, which is already the player's problem */
  if (h.entered && (h.x < h.r || h.x > g.W - h.r || h.cy < h.r)){
    crash(g, h, '#c39bff');
  }
}

function crash(g, h, color){
  h.gone = true;
  const x = clamp(h.x, 0, g.W), y = clamp(h.cy, 0, g.H);
  burst(g, x, y, color, CFG.seekerCrashBurst, CFG.seekerCrashSpeed);
  addRing(g, x, y, h.r * CFG.seekerCrashRingRMul, CFG.seekerCrashRingVr, CFG.seekerCrashRingLife, 'rgba(195,155,255,0.7)');
  shakeBy(g, CFG.seekerWallShake);
  Snd.seekerDie();
}

function outOfPlay(g, h){
  if (h.kind === 'saw'){
    return (h.vx > 0 && h.x > g.W + CFG.sawExitPad) || (h.vx < 0 && h.x < -CFG.sawExitPad);
  }
  if (h.kind === 'spike') return h.y - h.r > g.H + CFG.spikeExitPad;
  const s = CFG.seekerBounds;
  return h.x < -s || h.x > g.W + s || h.cy < -s || h.cy > g.H + s;
}

function consumeShield(g, h){
  g.shield = false;
  h.gone = true;
  burst(g, h.x, h.cy, '#4ecdc4', CFG.shieldPopBurst, CFG.shieldPopBurstSpeed);
  addRing(g, h.x, h.cy, CFG.shieldPopRingR, CFG.shieldPopRingVr, CFG.shieldPopRingLife, 'rgba(78,205,196,0.8)');
  g.ball.vy -= CFG.shieldPopVy;
  shakeBy(g, CFG.shieldPopShake);
  addText(g, h.x, h.cy - CFG.saveTextDy, 'shield saved you!', '#4ecdc4');
  Snd.shieldPop();                                  // PICK-05 distinct feedback
}

function nearMiss(g, h){
  addScore(g, CFG.nearMissPoints, h.x, h.cy - CFG.nearMissTextDy, '#9fe8ff');
  addText(g, h.x, h.cy - CFG.nearMissTextDy - CFG.nearMissTextGap, 'close!', '#9fe8ff');
  Snd.nearMiss();
}

function resolveContact(g, h){
  const b = g.ball;
  const gap = Math.hypot(h.x - b.x, h.cy - b.y) - (h.r + b.r * CFG.hazardKillPad);

  if (gap < 0){
    if (g.shield) consumeShield(g, h);
    else die(g);
    return;
  }
  /* Phase 2 near-miss: gap was inside the margin last frame and is now widening */
  if (!h.nearAwarded && h.prevGap < CFG.nearMissMargin && gap > h.prevGap){
    h.nearAwarded = true;
    nearMiss(g, h);
  }
  h.prevGap = gap;
}

export function updateHazards(g, dt){
  const playing = g.state === 'play';
  for (let i = g.hazards.length - 1; i >= 0; i--){
    const h = g.hazards[i];
    h.t += dt;
    if (h.warn > 0){                       // telegraph phase: not yet a threat
      h.warn -= dt;
      if (h.warn <= 0) activate(g, h);
      continue;
    }
    stepHazard(g, h, dt);
    if (h.gone || outOfPlay(g, h)){ g.hazards.splice(i, 1); continue; }
    if (playing && !g.ball.dead) resolveContact(g, h);
    /* a shield save destroys the hazard in the same frame it is absorbed */
    if (h.gone) g.hazards.splice(i, 1);
  }
}

/* ------------------------------------------------------------------ pickups */

export function collectPickup(g, p){
  const color = pickupColor(p.type);
  if (p.type === 'star'){
    addScore(g, CFG.starPoints, p.x, p.y, color);          // PICK-01
    Snd.star();
  } else if (p.type === 'heavy'){
    addScore(g, CFG.heavyPoints, p.x, p.y, color);         // risk/reward
    g.heavyT = Math.min(g.heavyT + CFG.heavyTime, CFG.heavyStackCap);
    addText(g, p.x, p.y - CFG.pickupTextDy, 'HEAVY!', color);
    Snd.heavy();
  } else if (p.type === 'shield'){
    g.shield = true;                                       // PICK-02
    addText(g, p.x, p.y - CFG.pickupTextDy, 'SHIELD', color);
    Snd.shieldPickup();
  } else if (p.type === 'slowmo'){
    g.slowmoT = Math.min(g.slowmoT + CFG.slowmoTime, CFG.slowmoStackCap);
    addText(g, p.x, p.y - CFG.pickupTextDy, 'SLOW-MO', color);
    Snd.slowmo();
  } else {                                                 // magnet
    g.magnetT = Math.min(g.magnetT + CFG.magnetTime, CFG.magnetStackCap);
    addText(g, p.x, p.y - CFG.pickupTextDy, 'MAGNET', color);
    Snd.magnet();
  }
  burst(g, p.x, p.y, color, CFG.collectBurst, CFG.collectBurstSpeed);
  addRing(g, p.x, p.y, p.r * CFG.collectRingRMul, CFG.collectRingVr, CFG.collectRingLife, color);
}

export function updatePickups(g, dt){
  const b = g.ball;
  const playing = g.state === 'play';
  for (let i = g.pickups.length - 1; i >= 0; i--){
    const p = g.pickups[i];
    p.t += dt;
    p.life -= dt;
    p.y += Math.sin(p.t * CFG.pickupDriftRate + p.ph) * CFG.pickupDriftAmp * dt;
    p.pulled = false;

    /* Phase 3 magnet: plain stars only — the heavy star stays a deliberate choice */
    if (g.magnetT > 0 && p.type === 'star'){
      const dx = b.x - p.x, dy = b.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 1 && d < CFG.magnetRadius){
        const s = Math.min(d, CFG.magnetSpeed * dt);
        p.x += dx / d * s; p.y += dy / d * s;
        p.pulled = true;
      }
    }

    if (p.life <= 0){ g.pickups.splice(i, 1); continue; }

    if (playing && !b.dead && Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.r + CFG.pickupContactPad){
      collectPickup(g, p);
      g.pickups.splice(i, 1);
    }
  }
}
