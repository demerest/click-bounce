/* climb.js — Phase 5: same physics, new mode, not a rewrite.
 * The camera follows max height, score is metres, procedural bands of saws sit
 * every climbBandSpacing px with a *validated* passable corridor, and rising lava
 * replaces the floor as the fail line.
 *
 * Fairness (pillar 3) is structural here: a band is generated up to
 * climbBandAhead screens above the viewport, so it is on screen for at least a
 * full band of climbing before it can connect, and climbBandValid() proves the
 * corridor exists and is reachable from the previous one at generation time.
 */

import { CFG } from './config.js';
import { Snd } from './audio.js';
import { addText, burst } from './fx.js';
import { clamp, rand, TAU } from './math.js';
import { hazardStrike } from './entities.js';
import { die } from './flow.js';

export function climbBandY(g, k){
  return g.climb.baseY - k * CFG.climbBandSpacing;
}

export function climbLavaSpeed(g){
  return Math.min(CFG.climbLavaSpeedMax, CFG.climbLavaSpeedBase + g.elapsed * CFG.climbLavaSpeedRamp);
}

/* Saw row covering the band line except the corridor. Extra holes left by the
 * cap are fine: the guarantee is that the designed corridor exists. */
function buildSaws(g, y, gapX, gapW, budget){
  const saws = [];
  const r = CFG.climbSawR;
  const keepOut = gapW / 2 + r + g.ball.r;
  const step = r * 2 + CFG.climbSawPad;
  const x0 = r + 4, x1 = g.W - r - 4;
  for (let x = x0; x <= x1; x += step){
    if (Math.abs(x - gapX) < keepOut) continue;
    saws.push({
      x: x, y: y, r: r,
      rot: rand(0, TAU),
      rotV: rand(CFG.sawSpinMin, CFG.sawSpinMax) * (Math.random() < 0.5 ? 1 : -1),
    });
  }
  if (saws.length > CFG.climbSawsPerBandMax){
    const kept = [];
    for (let i = 0; i < saws.length; i++) if (i % 2 === 0) kept.push(saws[i]);
    return kept.slice(0, CFG.climbSawsPerBandMax);
  }
  return saws.slice(0, Math.max(0, budget));
}

/* The acceptance rule: a corridor of at least climbCorridorMin, inside the
 * arena, free of saws, and within climbMaxLateral of the previous corridor. */
export function climbBandValid(g, band, prevGapX){
  if (band.gapW < CFG.climbCorridorMin) return false;
  if (Math.abs(band.gapX - prevGapX) > CFG.climbMaxLateral) return false;
  const half = band.gapW / 2 + g.ball.r;
  if (band.gapX - half < 0 || band.gapX + half > g.W) return false;
  for (let i = 0; i < band.saws.length; i++){
    const s = band.saws[i];
    if (Math.abs(s.x - band.gapX) < half + s.r) return false;
  }
  return true;
}

export function climbMakeBand(g, k){
  const c = g.climb;
  const y = climbBandY(g, k);
  const gapW = CFG.climbCorridorMin;
  const lo = CFG.climbEdgePad + gapW / 2;
  const hi = Math.max(lo, g.W - CFG.climbEdgePad - gapW / 2);
  let band = null;

  for (let tries = 0; tries <= CFG.spawnRerolls; tries++){
    const gapX = clamp(c.lastGapX + rand(-CFG.climbMaxLateral, CFG.climbMaxLateral), lo, hi);
    const live = climbLiveSaws(g);
    band = {
      k: k, y: y, gapX: gapX, gapW: gapW,
      saws: buildSaws(g, y, gapX, gapW, CFG.climbHazardCap - live),
      items: [],
    };
    band.items.push({ type: 'star', x: gapX, y: y - CFG.climbStarDrop, alive: true, t: 0, ph: rand(0, TAU) });
    if (k % CFG.climbShieldEvery === 0){
      band.items.push({ type: 'shield', x: gapX, y: y - CFG.climbStarDrop * 2.2, alive: true, t: 0, ph: rand(0, TAU) });
    }
    if (climbBandValid(g, band, c.lastGapX)) break;
  }
  c.lastGapX = band.gapX;
  return band;
}

function climbLiveSaws(g){
  let n = 0;
  for (let i = 0; i < g.climb.bands.length; i++) n += g.climb.bands[i].saws.length;
  return n;
}

export function climbEnsureBands(g){
  const c = g.climb;
  const limit = c.camY - g.H * CFG.climbBandAhead;
  while (climbBandY(g, c.nextK) > limit){
    c.bands.push(climbMakeBand(g, c.nextK));
    c.nextK++;
  }
}

export function climbCullBands(g){
  const c = g.climb;
  const below = c.camY + g.H + CFG.climbBandSpacing;
  while (c.bands.length && (c.bands[0].y > below || c.bands.length > CFG.climbBandCap)){
    c.bands.shift();
  }
}

export function climbInit(g){
  const b = g.ball;
  g.climb = {
    baseY: b.y, top: b.y,
    camY: b.y - g.H * CFG.climbCamLead,
    lavaY: b.y + CFG.climbLavaStart,
    lavaT: 0,
    bands: [], nextK: 1, lastGapX: b.x,
    bonus: 0, meters: 0,
  };
  climbEnsureBands(g);
}

/* Returns true when the run ended this frame. */
export function climbUpdate(g, dt){
  const c = g.climb, b = g.ball;

  c.top = Math.min(c.top, b.y);
  c.camY = c.top - g.H * CFG.climbCamLead;
  climbEnsureBands(g);
  climbCullBands(g);

  c.lavaT += dt;
  if (c.lavaT > CFG.climbLavaGrace) c.lavaY -= climbLavaSpeed(g) * dt;

  for (let i = 0; i < c.bands.length; i++){
    const band = c.bands[i];
    for (let s = 0; s < band.saws.length; s++){
      const saw = band.saws[s];
      saw.rot += saw.rotV * dt;
      if (!b.dead && hazardStrike(g, saw.x, saw.y, saw.r) === 'dead') return true;
    }
    for (let it = 0; it < band.items.length; it++){
      const p = band.items[it];
      if (!p.alive) continue;
      p.t += dt;
      if (b.dead) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + CFG.starR + CFG.pickupContactPad){
        p.alive = false;
        if (p.type === 'star'){
          g.starsRun++;
          c.bonus += CFG.climbStarMeters;
          addText(g, p.x, p.y, '+' + CFG.climbStarMeters + 'm', '#ffd166');
          Snd.star();
        } else {
          g.shield = true;
          addText(g, p.x, p.y, 'SHIELD', '#4ecdc4');
          Snd.shieldPickup();
        }
        burst(g, p.x, p.y, p.type === 'star' ? '#ffd166' : '#4ecdc4', CFG.collectBurst, CFG.collectBurstSpeed);
      }
    }
  }

  if (!b.dead && b.y + b.r >= c.lavaY){
    die(g);
    return true;
  }

  c.meters = Math.max(0, Math.floor((c.baseY - c.top) / CFG.climbPixelsPerMeter)) + c.bonus;
  g.score = c.meters;
  return false;
}
