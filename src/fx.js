/* fx.js — particles, rings, floating text, screen shake, background drift.
 * Budget is hard-capped here (guide §6): <=120 particles, <=6 rings, <=8 texts.
 * Reverse-iteration splice, as in the prototype.
 */

import { CFG } from './config.js';
import { bgBaseHue } from './state.js';
import { clamp, decay, rand, TAU } from './math.js';

export function burst(g, x, y, color, n, speed){
  for (let i = 0; i < n; i++){
    if (g.particles.length >= CFG.particleCap) return;
    const a = Math.random() * TAU, s = rand(0.25, 1) * speed;
    const life = rand(CFG.particleLifeMin, CFG.particleLifeMax);
    g.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
      life: life, max: life,
      s: rand(CFG.particleSizeMin, CFG.particleSizeMax),
      color: color,
    });
  }
}

export function addRing(g, x, y, r, vr, life, color){
  if (g.rings.length >= CFG.ringCap) g.rings.shift();
  g.rings.push({ x: x, y: y, r: r, vr: vr, life: life, max: life, color: color });
}

export function addText(g, x, y, txt, color){
  if (g.texts.length >= CFG.textCap) g.texts.shift();
  g.texts.push({ x: x, y: y, txt: txt, life: CFG.textLife, color: color });
}

export function addScore(g, n, x, y, color){
  g.score += n;
  addText(g, x, y, '+' + n, color);
}

export function shakeBy(g, amount){
  if (g.reducedMotion) return;                 // A11Y-01
  g.shake = Math.max(g.shake, amount);
}

/* Screen-edge telegraph: a hazard is about to enter from this side (Phase 2).
 * `color` is the strong edge, `fade` the same hue at alpha 0 for the gradient. */
export function addEdgeWarn(g, side, pos, color, fade){
  if (g.reducedMotion) return;
  if (g.edgeWarns.length >= CFG.edgeWarnCap) g.edgeWarns.shift();
  g.edgeWarns.push({
    side: side, pos: pos, color: color, fade: fade,
    life: CFG.edgeWarnTime, max: CFG.edgeWarnTime,
  });
}

export function updateFx(g, dt){
  g.shake = decay(g.shake, CFG.shakeDecay, dt);
  if (g.shake < CFG.shakeMin) g.shake = 0;
  g.dotKick = decay(g.dotKick, CFG.dotKickDecay, dt);

  for (let i = g.particles.length - 1; i >= 0; i--){
    const p = g.particles[i];
    p.life -= dt;
    if (p.life <= 0){ g.particles.splice(i, 1); continue; }
    p.vy += CFG.particleGravity * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }

  for (let i = g.rings.length - 1; i >= 0; i--){
    const r = g.rings[i];
    r.life -= dt;
    if (r.life <= 0){ g.rings.splice(i, 1); continue; }
    r.r += r.vr * dt;
  }

  for (let i = g.texts.length - 1; i >= 0; i--){
    const t = g.texts[i];
    t.life -= dt; t.y -= CFG.textRise * dt;
    if (t.life <= 0) g.texts.splice(i, 1);
  }

  for (let i = g.edgeWarns.length - 1; i >= 0; i--){
    const w = g.edgeWarns[i];
    w.life -= dt;
    if (w.life <= 0) g.edgeWarns.splice(i, 1);
  }

  if (!g.reducedMotion){
    for (let i = 0; i < g.bgDots.length; i++){
      const d = g.bgDots[i];
      d.y += (d.s + g.dotKick * d.k) * dt;
      if (d.y > g.H + 10){ d.y = -10; d.x = Math.random() * g.W; }
      if (d.x > g.W) d.x -= g.W;
    }
    g.hue = (bgBaseHue(g) + g.totalT * CFG.bgHueRate) % 360;
  } else {
    g.hue = bgBaseHue(g);
  }

  /* ambient ball life (PHYS-05) */
  const b = g.ball;
  b.blinkT -= dt;
  if (b.blinkT <= 0){ b.blink = CFG.blinkTime; b.blinkT = rand(CFG.blinkMin, CFG.blinkMax); }
  if (b.blink > 0) b.blink -= dt;

  /* jelly wobble keeps oscillating even during hit-stop (Phase 2) */
  b.wPhase += dt * CFG.wobbleRate;
  b.wAmp = decay(b.wAmp, CFG.wobbleDecay, dt);
}
