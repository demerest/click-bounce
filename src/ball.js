/* ball.js — the core verb (CORE-02..09) and the ball's own integration.
 * PHYS-01: semi-implicit Euler. The dt clamp itself lives in the loop, nowhere else.
 */

import { CFG } from './config.js';
import { addRing, addScore, addText, burst, shakeBy } from './fx.js';
import { clamp, decay, lerpAngle } from './math.js';
import { Snd } from './audio.js';

/* One pointer press. `auto` = attract-mode autopilot (no score, no combo, no miss). */
export function attemptBounce(g, cx, cy, auto){
  const b = g.ball;
  if (b.dead) return false;

  const dx = b.x - cx, dy = b.y - cy;
  const d = Math.hypot(dx, dy) || 1;

  if (d > b.r * CFG.hitRadiusMul){
    /* CORE-07: a miss breaks the combo and does nothing else. */
    if (!auto && g.state === 'play'){
      addRing(g, cx, cy, CFG.missRingR, CFG.missRingVr, CFG.missRingLife, 'rgba(255,255,255,0.5)');
      if (g.combo >= 2) addText(g, cx, cy - CFG.missTextDy, 'combo lost', '#98a1b3');
      g.combo = 0; g.comboTimer = 0;
      Snd.miss();
    }
    return false;
  }

  /* CORE-08: rate limit. Also what keeps two simultaneous touches from double-applying. */
  if (g.state === 'play' && g.totalT - g.lastBounceAt < CFG.bounceCooldown) return false;

  /* push away from the pointer, with a guaranteed upward component (CORE-02/03) */
  let nx = dx / d, ny = dy / d;
  if (ny > CFG.bounceMinNy){
    ny = CFG.bounceMinNy;
    const m = Math.hypot(nx, ny);
    nx /= m; ny /= m;
  }

  /* CORE-05: charge — quick taps are weak, letting it fall is full power */
  const charge = clamp((g.totalT - g.lastBounceAt) / CFG.bounceChargeTime, 0, 1);
  const factor = CFG.bounceMinFactor + (1 - CFG.bounceMinFactor) * charge;
  const power = CFG.bouncePower * factor;

  b.vx = nx * power * CFG.bounceLateralMul;
  b.vy = -power * Math.max(CFG.bounceMinUpward, -ny);

  /* CORE-09: off-centre contact imparts spin; a dead-centre hit barely does */
  const off = clamp(d / (b.r * CFG.hitRadiusMul), 0, 1);
  b.spin = -nx * CFG.spinFromPush * (1 - CFG.spinFromOffsetGain + CFG.spinFromOffsetGain * off);

  /* PHYS-03: jelly squash impulse */
  b.wAmp = CFG.bounceWobbleBase + CFG.bounceWobbleAdd * factor;
  b.wPhase = 0;

  addRing(g, b.x, b.y + b.r * CFG.bounceRingYMul, b.r * CFG.bounceRingRMul,
          CFG.bounceRingVr, CFG.bounceRingLife, 'rgba(255,209,102,0.55)');
  g.dotKick = CFG.dotKickOnBounce;
  g.hitStop = CFG.hitStopTime;               // Phase 2: 3-frame freeze, wobble keeps running
  g.lastBounceAt = g.totalT;

  if (g.state === 'play'){
    g.combo = g.comboTimer > 0 ? g.combo + 1 : 1;
    g.comboTimer = CFG.comboWindow;
    g.maxCombo = Math.max(g.maxCombo, g.combo);
    g.bounces++;
    /* SCORE-01/03 — climb mode scores metres only (Phase 5) */
    if (g.mode !== 'climb'){
      addScore(g, CFG.bouncePoints * Math.min(g.combo, CFG.comboCap),
               b.x, b.y - b.r - CFG.scoreTextDy, '#ffd166');
    }
    Snd.bounce(g.combo);
  } else if (!auto){
    Snd.bounce(1);
  }
  return true;
}

/* Ball integration + static bounds. Returns nothing; floor death is decided in game.js
 * so that the menu's attract mode can save the ball instead. */
export function updateBall(g, dt, gravity){
  const b = g.ball;

  b.vy += gravity * dt;                                  // semi-implicit Euler
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  b.ang += b.spin * dt;
  b.spin = decay(b.spin, CFG.spinDecay, dt);

  /* CORE-06: side walls reflect with damping */
  if (b.x < b.r){
    b.x = b.r; b.vx = Math.abs(b.vx) * CFG.wallRest;
    b.wAmp = Math.max(b.wAmp, CFG.wallWobble); Snd.wall();
  } else if (b.x > g.W - b.r){
    b.x = g.W - b.r; b.vx = -Math.abs(b.vx) * CFG.wallRest;
    b.wAmp = Math.max(b.wAmp, CFG.wallWobble); Snd.wall();
  }
  /* soft ceiling: the ball may leave the top but is pushed back.
   * Climb mode has open sky instead. */
  if (g.mode !== 'climb'){
    const ceil = -b.r * CFG.ceilingPad;
    if (b.y < ceil){ b.y = ceil; b.vy = Math.abs(b.vy) * CFG.ceilingRest; }
  }

  /* PHYS-04: stretch follows the velocity vector; the face counter-rotates */
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > CFG.dispSpeedMin) b.dispAng = lerpAngle(b.dispAng, Math.atan2(b.vy, b.vx), Math.min(1, CFG.dispLerp * dt));

  if (!g.reducedMotion){
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > CFG.trailLen) b.trail.shift();
  }
}

/* CORE-04: floor contact ends the run. Kept separate so attract mode can bypass it. */
export function ballHitFloor(g){
  const b = g.ball;
  return b.y + b.r >= g.H;
}

export function deathBurst(g){
  const b = g.ball;
  burst(g, b.x, b.y, '#ff6b6b', CFG.deathParticles, CFG.deathBurstSpeed);
  burst(g, b.x, b.y, '#ffd166', CFG.deathParticles2, CFG.deathBurst2Speed);
  addRing(g, b.x, b.y, b.r, CFG.deathRingVr, CFG.deathRingLife, 'rgba(255,93,115,0.7)');
  shakeBy(g, CFG.deathShake);
}
