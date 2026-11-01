/* render.js — all canvas drawing (UI-05: gameplay in canvas, menus/HUD in DOM).
 * PERF-01: no expensive blur filters anywhere, gradients are per-frame but few,
 * particles are fillRect. HAZ-05: every hazard is a dark fill with a bright
 * outline so it stays legible against the shifting background hue.
 *
 * Shape ratios below are drawing geometry, not tunables; the gameplay numbers all
 * live in CFG.
 */

import { CFG } from './config.js';
import { clamp, TAU } from './math.js';
import { SKINS } from './skins.js';

const EYE_X = 0.32, EYE_Y = -0.12, EYE_RX = 0.2, EYE_RY = 0.26, PUPIL_R = 0.09;
const MOUTH_Y = 0.22, MOUTH_R = 0.22;
const SHEEN_X = -0.3, SHEEN_Y = -0.48, SHEEN_RX = 0.28, SHEEN_RY = 0.13, SHEEN_ROT = -0.5;
const SAW_INNER = 0.7, SAW_HUB = 0.32, SAW_AXLE = 0.13;
const STAR_INNER = 0.45, STAR_CORE = 5.5, HEAVY_CORE = 0.34;
const SHIELD_RING_INSET = 2, SHIELD_DOT_R = 3.5, SHIELD_DOT_RATE = 3;
const SLOWMO_HAND_RATE = 1.5, SLOWMO_PULSE_RATE = 3;
const MAGNET_SWAY = 0.25, MAGNET_TIP = 0.95, MAGNET_SWAY_RATE = 2;
const SPIKE_TAIL = 1.5, SPIKE_BODY = 0.85, SPIKE_CORE_W = 0.3, SPIKE_CORE_TAIL = 1.1;
const SEEKER_W = 0.9, SEEKER_H = 0.8, SEEKER_ROTOR_Y = -0.55, SEEKER_EYE_R = 0.26, SEEKER_EYE_OFF = 3;
const SEEKER_TILT_SWAY = 0.2, SEEKER_ROTOR_TILT = 0.5, SEEKER_BLINK_DIM = 0.35;
const TRAIL_R = 0.75, HEAVY_AURA_PAD = 4, MAGNET_AURA_PAD = 7;
const SLOWMO_BUBBLE = 1.75, SLOWMO_BUBBLE_PULSE = 4, SLOWMO_BUBBLE_ALPHA = 0.28;
const SLOWMO_TINT_ALPHA = 0.09, HEAVY_TINT_ALPHA = 0.08;
const CEIL_MARK_Y = 10, EDGE_ARROW_INSET = 6, MAGNET_TETHER_ALPHA = 0.35;
const STAR_PULSE = 0.12;

/* ---- entity shapes, shared by the game renderer and the menu legend icons,
 * so the legend always shows exactly what the entity looks like in play ---- */
function shapeStarPath(ctx, R){
  ctx.beginPath();
  for (let i = 0; i < 10; i++){
    const rr = i % 2 ? R * STAR_INNER : R;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

function shapeStar(ctx, R, fill, core){
  ctx.fillStyle = fill;
  shapeStarPath(ctx, R);
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,12,20,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (core > 0){
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    shapeStarPath(ctx, core);
    ctx.fill();
  }
}

function shapeHeavy(ctx, r, t){
  ctx.rotate(-t * CFG.starSpin * 0.6);
  shapeStar(ctx, r, '#c98b3c', 0);
  ctx.rotate(t * CFG.starSpin * 0.6);
  /* heavier: a dark core and a downward chevron saying "this drags you down" */
  ctx.fillStyle = 'rgba(20,14,6,0.75)';
  ctx.beginPath(); ctx.arc(0, 0, r * HEAVY_CORE, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-7, r + 4); ctx.lineTo(0, r + 10); ctx.lineTo(7, r + 4);
  ctx.stroke();
}

function shapeShield(ctx, r, t){
  ctx.strokeStyle = '#4ecdc4';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r - SHIELD_RING_INSET, 0, TAU); ctx.stroke();
  const a = t * SHIELD_DOT_RATE;
  ctx.fillStyle = '#4ecdc4';
  ctx.beginPath();
  ctx.arc(Math.cos(a) * (r - SHIELD_RING_INSET), Math.sin(a) * (r - SHIELD_RING_INSET), SHIELD_DOT_R, 0, TAU);
  ctx.fill();
}

function shapeSlowmo(ctx, r, t){
  const pulse = 1 + Math.sin(t * SLOWMO_PULSE_RATE) * 0.08;
  ctx.globalAlpha *= SLOWMO_BUBBLE_ALPHA;
  ctx.fillStyle = '#7fb2ff';
  ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, TAU); ctx.fill();
  ctx.globalAlpha /= SLOWMO_BUBBLE_ALPHA;
  ctx.strokeStyle = '#7fb2ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, TAU); ctx.stroke();
  /* clock hands: reads as "time" at a glance */
  ctx.strokeStyle = '#eaf2ff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.55); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(t * SLOWMO_HAND_RATE) * r * 0.45, Math.sin(t * SLOWMO_HAND_RATE) * r * 0.45);
  ctx.stroke();
}

function shapeMagnet(ctx, r){
  ctx.strokeStyle = '#c39bff';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 1, r * 0.62, Math.PI, TAU); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, 1); ctx.lineTo(-r * 0.62, r * 0.7);
  ctx.moveTo(r * 0.62, 1); ctx.lineTo(r * 0.62, r * 0.7);
  ctx.stroke();
  ctx.strokeStyle = '#ff5d73';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, r * 0.7); ctx.lineTo(-r * 0.62, r * MAGNET_TIP);
  ctx.moveTo(r * 0.62, r * 0.7); ctx.lineTo(r * 0.62, r * MAGNET_TIP);
  ctx.stroke();
}

function shapeSaw(ctx, r){
  ctx.beginPath();
  const teeth = CFG.sawTeeth;
  for (let i = 0; i < teeth * 2; i++){
    const rr = i % 2 ? r * SAW_INNER : r;
    const a = i / (teeth * 2) * TAU;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#39415a'; ctx.fill();                 // HAZ-05 contrast pair
  ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * SAW_HUB, 0, TAU); ctx.fillStyle = '#ff5d73'; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r * SAW_AXLE, 0, TAU); ctx.fillStyle = '#1a1e2b'; ctx.fill();
}

function shapeSpike(ctx, r){
  ctx.beginPath();
  ctx.moveTo(0, r * SPIKE_TAIL);
  ctx.lineTo(-r * SPIKE_BODY, -r);
  ctx.lineTo(r * SPIKE_BODY, -r);
  ctx.closePath();
  ctx.fillStyle = '#39415a'; ctx.fill();
  ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, r * SPIKE_CORE_TAIL);
  ctx.lineTo(-r * SPIKE_CORE_W, -r * 0.7);
  ctx.lineTo(r * SPIKE_CORE_W, -r * 0.7);
  ctx.closePath();
  ctx.fillStyle = '#ff5d73'; ctx.fill();
}

function shapeSeeker(ctx, r, rot, eyeAng){
  /* body */
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * SEEKER_W, 0);
  ctx.lineTo(0, r * SEEKER_H);
  ctx.lineTo(-r * SEEKER_W, 0);
  ctx.closePath();
  ctx.fillStyle = '#2a2140'; ctx.fill();               // HAZ-05: dark fill...
  ctx.strokeStyle = '#c39bff'; ctx.lineWidth = 2; ctx.stroke();   // ...bright outline
  /* rotors */
  ctx.strokeStyle = 'rgba(195,155,255,0.7)';
  ctx.lineWidth = 2;
  const rr = r * 0.5, ra = rot * 3;
  for (let i = 0; i < 2; i++){
    const sx = i ? r * SEEKER_W : -r * SEEKER_W;
    ctx.beginPath();
    ctx.ellipse(sx, r * SEEKER_ROTOR_Y, rr, rr * 0.28, ra, 0, TAU);
    ctx.stroke();
  }
  /* eye */
  ctx.fillStyle = '#ff5d73';
  ctx.beginPath();
  ctx.arc(Math.cos(eyeAng) * SEEKER_EYE_OFF, Math.sin(eyeAng) * SEEKER_EYE_OFF, r * SEEKER_EYE_R, 0, TAU);
  ctx.fill();
}

function shapeLava(ctx, w, h){
  const glow = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.1);
  glow.addColorStop(0, 'rgba(255,93,115,0)');
  glow.addColorStop(1, 'rgba(255,93,115,0.5)');
  ctx.fillStyle = glow;
  ctx.fillRect(-w / 2, -h * 0.5, w, h * 0.6);
  const body = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.5);
  body.addColorStop(0, '#ff5d73');
  body.addColorStop(1, '#701a28');
  ctx.fillStyle = body;
  ctx.fillRect(-w / 2, h * 0.1, w, h * 0.4);
}

/* Menu legend icons: same shapes, same palette, no images (UI-05). */
export function paintIcon(canvas, kind){
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, CFG.dprCap);
  const w = canvas.clientWidth || 44, h = canvas.clientHeight || 44;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const R = Math.min(w, h) * 0.36;
  const t = 0.8;                       // fixed animation phase: lively but stable
  if (kind === 'saw'){ ctx.rotate(0.35); shapeSaw(ctx, R * 1.15); }
  else if (kind === 'spike') shapeSpike(ctx, R * 0.95);
  else if (kind === 'seeker') shapeSeeker(ctx, R, 0.6, 0.9);
  else if (kind === 'star'){ ctx.rotate(0.2); shapeStar(ctx, R, '#ffd166', STAR_CORE); }
  else if (kind === 'shield') shapeShield(ctx, R * 1.05, t);
  else if (kind === 'slowmo') shapeSlowmo(ctx, R * 1.05, t);
  else if (kind === 'magnet') shapeMagnet(ctx, R * 1.05);
  else if (kind === 'heavy') shapeHeavy(ctx, R, t);
  else if (kind === 'lava') shapeLava(ctx, w, h);
  ctx.restore();
}

export function createRenderer(canvas){
  const ctx = canvas.getContext('2d');

  function resize(g){
    const dpr = Math.min(window.devicePixelRatio || 1, CFG.dprCap);   // PERF-02
    const W = window.innerWidth, H = window.innerHeight;
    g.W = W; g.H = H; g.dpr = dpr;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* QA: resize/rotate mid-run must leave the ball inside the new bounds,
     * otherwise a shrinking window would kill the player for nothing. */
    const b = g.ball;
    b.x = clamp(b.x, b.r, Math.max(b.r, W - b.r));
    b.y = clamp(b.y, -b.r * CFG.ceilingPad, Math.min(H - b.r - 1, H * 0.98));
    for (let i = 0; i < g.hazards.length; i++){
      if (g.hazards[i].kind === 'spike') g.hazards[i].x = clamp(g.hazards[i].x, CFG.spikeEdgePad, Math.max(CFG.spikeEdgePad, W - CFG.spikeEdgePad));
    }
  }

  /* ------------------------------------------------------------ background */
  function drawBackground(g){
    const hue = g.hue;
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, 'hsl(' + hue + ',48%,10%)');
    bg.addColorStop(1, 'hsl(' + ((hue + CFG.bgHueSpread) % 360) + ',52%,17%)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, g.W, g.H);
  }

  function drawDots(g){
    ctx.fillStyle = 'hsl(' + ((g.hue + CFG.bgDotHueOffset) % 360) + ',70%,72%)';
    for (let i = 0; i < g.bgDots.length; i++){
      const d = g.bgDots[i];
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.arc(d.x % g.W, d.y, d.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* Phase 2: a hazard is about to enter from this edge. */
  function drawEdgeWarns(g){
    const w = CFG.edgeWarnWidth;
    const L = CFG.edgeWarnArrowLen;
    for (let i = 0; i < g.edgeWarns.length; i++){
      const e = g.edgeWarns[i];
      const a = clamp(e.life / e.max, 0, 1);
      const pulse = 0.55 + 0.45 * Math.sin((1 - a) * CFG.edgeWarnPulseRate);
      ctx.save();
      ctx.globalAlpha = a * pulse;
      let grad;
      if (e.side === 'left' || e.side === 'right'){
        const x0 = e.side === 'left' ? 0 : g.W;
        const x1 = e.side === 'left' ? w : g.W - w;
        grad = ctx.createLinearGradient(x0, 0, x1, 0);
        grad.addColorStop(0, e.color);
        grad.addColorStop(1, e.fade);
        ctx.fillStyle = grad;
        ctx.fillRect(Math.min(x0, x1), 0, w, g.H);
        /* arrow at the entry height */
        ctx.fillStyle = e.color;
        ctx.beginPath();
        const dir = e.side === 'left' ? 1 : -1;
        const ax = e.side === 'left' ? EDGE_ARROW_INSET : g.W - EDGE_ARROW_INSET;
        ctx.moveTo(ax, e.pos);
        ctx.lineTo(ax - dir * L, e.pos - L * 0.55);
        ctx.lineTo(ax - dir * L, e.pos + L * 0.55);
        ctx.closePath();
        ctx.fill();
      } else {
        grad = ctx.createLinearGradient(0, 0, 0, w * 0.5);
        grad.addColorStop(0, e.color);
        grad.addColorStop(1, e.fade);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, g.W, w * 0.5);
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(e.pos, CEIL_MARK_Y - 2);
        ctx.lineTo(e.pos - L * 0.55, CEIL_MARK_Y - 2 + L);
        ctx.lineTo(e.pos + L * 0.55, CEIL_MARK_Y - 2 + L);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawFloor(g){
    if (g.state === 'play' && !g.ball.dead){
      const danger = clamp(1 - (g.H - (g.ball.y + g.ball.r)) / (g.H * CFG.dangerFrac), 0, 1);
      if (danger > 0){
        const dg = ctx.createLinearGradient(0, g.H - CFG.dangerHeight, 0, g.H);
        dg.addColorStop(0, 'rgba(255,93,115,0)');
        dg.addColorStop(1, 'rgba(255,93,115,' + (CFG.dangerAlphaBase + CFG.dangerAlphaAdd * danger) + ')');
        ctx.fillStyle = dg;
        ctx.fillRect(0, g.H - CFG.dangerHeight, g.W, CFG.dangerHeight);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, g.H - CFG.floorLineH, g.W, CFG.floorLineH);
  }

  /* ------------------------------------------------------------------- fx */
  function drawRings(g){
    ctx.lineWidth = CFG.ringWidth;
    for (let i = 0; i < g.rings.length; i++){
      const r = g.rings[i];
      ctx.globalAlpha = clamp(r.life / r.max, 0, 1);
      ctx.strokeStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(g){
    for (let i = 0; i < g.particles.length; i++){
      const p = g.particles[i];
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts(g){
    ctx.textAlign = 'center';
    ctx.font = '700 ' + CFG.textFontPx + 'px ui-monospace, Menlo, Consolas, monospace';
    for (let i = 0; i < g.texts.length; i++){
      const t = g.texts[i];
      ctx.globalAlpha = clamp(t.life / CFG.textFadeIn, 0, 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  /* -------------------------------------------------------------- pickups */
  function drawPickup(g, p){
    const blinkWindow = p.type === 'star' ? CFG.starBlink : CFG.pickupBlink;
    /* PICK-01: blink warning during the final seconds before despawn */
    const alpha = p.life < blinkWindow
      ? 0.35 + 0.65 * Math.abs(Math.sin(p.life * CFG.pickupBlinkRate))
      : 1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = alpha;

    if (p.type === 'star'){
      ctx.rotate(p.t * CFG.starSpin);
      const s = 1 + Math.sin(p.t * CFG.starPulse) * STAR_PULSE;
      ctx.scale(s, s);
      shapeStar(ctx, p.r, '#ffd166', STAR_CORE);
    } else if (p.type === 'heavy'){
      shapeHeavy(ctx, p.r, p.t);
    } else if (p.type === 'shield'){
      shapeShield(ctx, p.r, p.t);
    } else if (p.type === 'slowmo'){
      shapeSlowmo(ctx, p.r, p.t);
    } else {                                   // magnet
      ctx.rotate(Math.sin(p.t * MAGNET_SWAY_RATE) * MAGNET_SWAY);
      shapeMagnet(ctx, p.r);
    }

    /* magnet tether: shows which stars are being pulled */
    if (p.pulled){
      ctx.globalAlpha = MAGNET_TETHER_ALPHA;
      ctx.strokeStyle = '#c39bff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(g.ball.x - p.x, g.ball.y - p.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /* --------------------------------------------------------------- hazards */
  function drawSawBody(r){
    shapeSaw(ctx, r);
  }

  function drawSaw(h){
    ctx.save();
    ctx.translate(h.x, h.cy);
    ctx.rotate(h.rot);
    drawSawBody(h.r);
    ctx.restore();
  }

  function drawSpike(g, h){
    if (h.warn > 0){
      /* ceiling telegraph: marker + a drop line so the landing spot is obvious */
      const k = 1 - h.warn / CFG.spikeWarnTime;
      const pulse = 0.45 + 0.55 * Math.abs(Math.sin(k * CFG.spikePulseRate));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = 'rgba(255,93,115,0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(h.x, CEIL_MARK_Y);
      ctx.lineTo(h.x, g.H - CFG.floorLineH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff5d73';
      ctx.beginPath();
      ctx.moveTo(h.x, CEIL_MARK_Y + CFG.spikeMarkDrop * k);
      ctx.lineTo(h.x - h.r * CFG.spikeMarkWidth, CFG.spikeMarkTop);
      ctx.lineTo(h.x + h.r * CFG.spikeMarkWidth, CFG.spikeMarkTop);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(h.x, h.cy);
    shapeSpike(ctx, h.r);
    ctx.restore();
  }

  function drawSeeker(g, h){
    if (h.warn > 0) return;             // the edge flash is the telegraph
    const blink = h.life < CFG.seekerBlinkLife
      ? (Math.sin(h.t * CFG.seekerBlinkRate) > 0 ? 1 : SEEKER_BLINK_DIM)
      : 1;
    ctx.save();
    ctx.translate(h.x, h.cy);
    ctx.globalAlpha = blink;
    ctx.rotate(Math.sin(h.rot * SEEKER_ROTOR_TILT) * SEEKER_TILT_SWAY);
    const ea = Math.atan2(g.ball.y - h.cy, g.ball.x - h.x);
    shapeSeeker(ctx, h.r, h.rot, ea);
    ctx.restore();
  }

  function drawHazards(g){
    for (let i = 0; i < g.hazards.length; i++){
      const h = g.hazards[i];
      if (h.kind === 'saw'){
        if (h.warn > 0) continue;        // still off-screen; the edge flash speaks for it
        drawSaw(h);
      } else if (h.kind === 'spike'){
        drawSpike(g, h);
      } else {
        drawSeeker(g, h);
      }
    }
  }

  /* ------------------------------------------------------------------ ball */
  function drawTrail(g){
    const b = g.ball;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < CFG.trailSpeedMin || g.reducedMotion) return;
    const k = Math.min(1, (sp - CFG.trailSpeedMin) / CFG.trailSpeedRange);
    for (let i = 0; i < b.trail.length; i++){
      const t = b.trail[i], f = i / b.trail.length;
      ctx.globalAlpha = f * CFG.trailAlpha * k;
      ctx.fillStyle = (g.skin || SKINS[0]).trail;
      ctx.beginPath();
      ctx.arc(t.x, t.y, b.r * f * TRAIL_R, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBall(g){
    const b = g.ball;
    /* PHYS-02/03: velocity-aligned stretch, capped, plus the decaying jelly wobble */
    const sp = Math.hypot(b.vx, b.vy);
    const stretch = Math.min(sp / CFG.stretchDivisor, CFG.stretchMax);
    const wob = b.wAmp * Math.cos(b.wPhase);
    const along = Math.max(CFG.scaleMin, 1 + stretch - wob);
    const across = Math.max(CFG.scaleMin, 1 - stretch * 0.55 + wob * 0.8);

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.dispAng);
    ctx.scale(along, across);
    ctx.rotate(-b.dispAng);                 // PHYS-04: the face stays upright

    const grad = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, b.r * 0.15, 0, 0, b.r * 1.05);
    const sk = g.skin || SKINS[0];
    grad.addColorStop(0, sk.hi);
    grad.addColorStop(0.45, sk.mid);
    grad.addColorStop(1, sk.lo);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,20,0.35)';
    ctx.lineWidth = g.heavyT > 0 ? 4 : 2;
    ctx.stroke();

    /* CORE-09: surface flecks rotate with `ang`, which is what makes spin legible */
    ctx.save();
    ctx.rotate(b.ang);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < CFG.flecks; i++){
      const a = i / CFG.flecks * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * b.r * 0.68, Math.sin(a) * b.r * 0.68, b.r * 0.09, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    /* sheen */
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(b.r * SHEEN_X, b.r * SHEEN_Y, b.r * SHEEN_RX, b.r * SHEEN_RY, SHEEN_ROT, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    /* face (PHYS-05: blink + pupils tracking velocity) */
    const eyeH = b.blink > 0 ? 0.12 : 1;
    const px = clamp(b.vx * CFG.pupilXGain, -CFG.pupilXMax, CFG.pupilXMax);
    const py = clamp(b.vy * CFG.pupilYGain, -CFG.pupilYMax, CFG.pupilYMax);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-b.r * EYE_X, b.r * EYE_Y, b.r * EYE_RX, b.r * EYE_RY * eyeH, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.r * EYE_X, b.r * EYE_Y, b.r * EYE_RX, b.r * EYE_RY * eyeH, 0, 0, TAU); ctx.fill();
    if (eyeH > 0.5){
      ctx.fillStyle = '#252a3a';
      ctx.beginPath(); ctx.arc(-b.r * EYE_X + px, b.r * EYE_Y + py, b.r * PUPIL_R, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(b.r * EYE_X + px, b.r * EYE_Y + py, b.r * PUPIL_R, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#252a3a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, b.r * MOUTH_Y, b.r * MOUTH_R, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();

    drawAuras(g);
  }

  /* one distinct visual per live effect (guide rule 3) */
  function drawAuras(g){
    const b = g.ball;
    if (g.shield){
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(g.totalT * CFG.shieldAuraSpin);
      ctx.strokeStyle = 'rgba(78,205,196,0.9)';
      ctx.lineWidth = CFG.shieldAuraWidth;
      ctx.setLineDash([CFG.shieldAuraDash, CFG.shieldAuraGap]);
      ctx.beginPath(); ctx.arc(0, 0, b.r + CFG.shieldAuraPad, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    if (g.slowmoT > 0){
      const pulse = 1 + Math.sin(g.totalT * SLOWMO_BUBBLE_PULSE) * 0.05;
      ctx.save();
      ctx.globalAlpha = SLOWMO_BUBBLE_ALPHA;
      ctx.fillStyle = '#7fb2ff';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * SLOWMO_BUBBLE * pulse, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#7fb2ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * SLOWMO_BUBBLE * pulse, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    if (g.magnetT > 0){
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(-g.totalT * 2);
      ctx.strokeStyle = 'rgba(195,155,255,0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 10]);
      ctx.beginPath(); ctx.arc(0, 0, b.r + CFG.shieldAuraPad + MAGNET_AURA_PAD, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = '#c39bff';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, CFG.magnetRadius, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    if (g.heavyT > 0){
      ctx.save();
      ctx.strokeStyle = 'rgba(201,139,60,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + HEAVY_AURA_PAD, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#c98b3c';
      for (let i = 0; i < 2; i++){
        const yy = b.r + 12 + i * 7 + ((g.totalT * 26) % 7);
        ctx.beginPath();
        ctx.moveTo(b.x - 7, yy - 4); ctx.lineTo(b.x, yy + 2); ctx.lineTo(b.x + 7, yy - 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ------------------------------------------------- mode identity (Phase 4/5) */
  function drawDailyStripes(g){
    ctx.save();
    ctx.globalAlpha = CFG.dailyStripeAlpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 18;
    ctx.beginPath();
    for (let x = -g.H; x < g.W; x += CFG.dailyStripeStep){
      ctx.moveTo(x, 0);
      ctx.lineTo(x + g.H, g.H);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* altitude ticks scroll with the world: instant "I am climbing" read */
  function drawAltitude(g){
    const c = g.climb;
    const every = CFG.altitudeEvery;
    const y0 = Math.floor(c.camY / every) * every;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.font = '700 10px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'left';
    for (let y = y0; y < c.camY + g.H + every; y += every){
      const metres = Math.round((c.baseY - y) / every);
      const labelled = metres % CFG.altitudeLabelEvery === 0;
      ctx.globalAlpha = labelled ? CFG.altitudeAlpha * 2 : CFG.altitudeAlpha;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.W, y); ctx.stroke();
      if (labelled){
        ctx.globalAlpha = CFG.altitudeLabelAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(Math.round((c.baseY - y) / CFG.climbPixelsPerMeter) + 'm', 8, y - 4);
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------- climb (Phase 5) */
  function drawBands(g){
    const c = g.climb;
    const halfSpan = CFG.climbBandSpacing * 0.42;
    const top = c.camY - CFG.climbBandSpacing;
    const bottom = c.camY + g.H + CFG.climbBandSpacing;
    for (let i = 0; i < c.bands.length; i++){
      const band = c.bands[i];
      if (band.y < top || band.y > bottom) continue;   // only draw what can be seen

      /* corridor hint: the guaranteed gap, drawn as a faint channel */
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(band.gapX - band.gapW / 2, band.y - halfSpan);
      ctx.lineTo(band.gapX - band.gapW / 2, band.y + halfSpan);
      ctx.moveTo(band.gapX + band.gapW / 2, band.y - halfSpan);
      ctx.lineTo(band.gapX + band.gapW / 2, band.y + halfSpan);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      for (let s = 0; s < band.saws.length; s++){
        const saw = band.saws[s];
        ctx.save();
        ctx.translate(saw.x, saw.y);
        ctx.rotate(saw.rot);
        drawSawBody(saw.r);
        ctx.restore();
      }
      for (let it = 0; it < band.items.length; it++){
        const p = band.items[it];
        if (!p.alive) continue;
        drawPickup(g, {
          type: p.type, x: p.x, y: p.y, t: p.t, life: 99, pulled: false,
          r: p.type === 'star' ? CFG.starR : CFG.shieldR,
        });
      }
    }
  }

  function drawLava(g){
    const c = g.climb;
    const y = c.lavaY;
    const bottom = c.camY + g.H + CFG.climbLavaWarn;
    if (y - CFG.climbLavaWarn > bottom) return;

    const warn = ctx.createLinearGradient(0, y - CFG.climbLavaWarn, 0, y);
    warn.addColorStop(0, 'rgba(255,93,115,0)');
    warn.addColorStop(1, 'rgba(255,93,115,0.4)');
    ctx.fillStyle = warn;
    ctx.fillRect(0, y - CFG.climbLavaWarn, g.W, CFG.climbLavaWarn);

    const body = ctx.createLinearGradient(0, y, 0, y + CFG.climbLavaWarn * 2);
    body.addColorStop(0, '#ff5d73');
    body.addColorStop(1, '#701a28');
    ctx.fillStyle = body;
    ctx.fillRect(0, y, g.W, bottom - y + CFG.climbLavaWarn);

    ctx.fillStyle = 'rgba(255,209,102,0.5)';
    for (let i = 0; i < 6; i++){
      const bx = ((i * 137.5 + g.totalT * 24) % (g.W + 40)) - 20;
      const by = y + 4 + Math.sin(g.totalT * 3 + i) * 3;
      ctx.beginPath(); ctx.arc(bx, by, 3 + (i % 3), 0, TAU); ctx.fill();
    }
  }

  /* ----------------------------------------------------------------- frame */
  function draw(g){
    drawBackground(g);

    ctx.save();
    if (g.shake > CFG.shakeMin && !g.reducedMotion){
      ctx.translate((Math.random() * 2 - 1) * g.shake, (Math.random() * 2 - 1) * g.shake);
    }

    drawDots(g);
    if (g.daily) drawDailyStripes(g);

    const climb = g.mode === 'climb' && g.climb;
    /* Phase 5 camera: the world scrolls under a fixed HUD and background */
    ctx.translate(0, climb ? -g.climb.camY : 0);

    if (climb){
      drawAltitude(g);
      drawBands(g);
      drawLava(g);
    } else {
      drawEdgeWarns(g);
      drawFloor(g);
    }
    drawRings(g);
    if (!climb){
      for (let i = 0; i < g.pickups.length; i++) drawPickup(g, g.pickups[i]);
      drawHazards(g);
    }
    if (!g.ball.dead){ drawTrail(g); drawBall(g); }
    drawParticles(g);
    drawTexts(g);

    ctx.restore();

    /* vignette + effect tints */
    const vg = ctx.createRadialGradient(g.W / 2, g.H * 0.42, Math.min(g.W, g.H) * 0.38,
                                        g.W / 2, g.H * 0.5, Math.max(g.W, g.H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, g.W, g.H);

    if (g.slowmoT > 0){
      ctx.fillStyle = 'rgba(90,150,255,' + SLOWMO_TINT_ALPHA + ')';
      ctx.fillRect(0, 0, g.W, g.H);
    }
    if (g.heavyT > 0){
      ctx.fillStyle = 'rgba(190,120,40,' + HEAVY_TINT_ALPHA + ')';
      ctx.fillRect(0, 0, g.W, g.H);
    }
  }

  return { ctx: ctx, resize: resize, draw: draw };
}
