/* daily.js — Phase 4 daily challenge: the date seeds a modifier mix, and today's
 * result is remembered. Every multiplier is bounded in CFG (pillar 4).
 */

import { CFG, KEYS } from './config.js';
import { LS } from './storage.js';
import { hashSeed, mulberry32, seededRange } from './rng.js';

export function dailyKey(d){
  const dt = d || new Date();
  const m = dt.getMonth() + 1;
  const day = dt.getDate();
  return dt.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

/* A lever pushed away from classic: random side, magnitude inside the band,
 * so no day lands on "normal" and every day reads differently. */
function spread(rnd, devMin, devMax){
  const dev = seededRange(rnd, devMin, devMax);
  return rnd() < 0.5 ? 1 - dev : 1 + dev;
}

export function dailyMods(key){
  const rnd = mulberry32(hashSeed('keepup:' + key));
  const graceDev = seededRange(rnd, CFG.dailyGraceDevMin, CFG.dailyGraceDevMax);
  return {
    key: key,
    gravityMul: spread(rnd, CFG.dailyGravityDevMin, CFG.dailyGravityDevMax),
    bounceMul: spread(rnd, CFG.dailyBounceDevMin, CFG.dailyBounceDevMax),
    sizeMul: spread(rnd, CFG.dailySizeDevMin, CFG.dailySizeDevMax),
    intervalMul: spread(rnd, CFG.dailyIntervalDevMin, CFG.dailyIntervalDevMax),
    sawSpeedMul: spread(rnd, CFG.dailySawSpeedDevMin, CFG.dailySawSpeedDevMax),
    grace: Math.round(CFG.hazardDelay + (rnd() < 0.5 ? -graceDev : graceDev)),
    starMul: spread(rnd, CFG.dailyStarDevMin, CFG.dailyStarDevMax),
  };
}

/* The three most pronounced twists in plain words; extreme days upgrade to
 * stronger words. Ranked by deviation relative to each band's midpoint so
 * levers with different scales compete fairly for the three slots. */
export function dailyLabel(m){
  const chips = [];
  const add = (dev, lo, hi, mildLow, strongLow, mildHigh, strongHigh) => {
    const a = Math.abs(dev);
    const strong = a >= (lo + hi) / 2;
    chips.push({ rank: a / ((lo + hi) / 2),
                 text: dev < 0 ? (strong ? strongLow : mildLow) : (strong ? strongHigh : mildHigh) });
  };
  add(m.gravityMul - 1, CFG.dailyGravityDevMin, CFG.dailyGravityDevMax,
      'light gravity', 'feather gravity', 'heavy gravity', 'crushing gravity');
  add(m.bounceMul - 1, CFG.dailyBounceDevMin, CFG.dailyBounceDevMax,
      'soft boing', 'weak boing', 'big boing', 'rocket boing');
  add(m.sizeMul - 1, CFG.dailySizeDevMin, CFG.dailySizeDevMax,
      'small ball', 'tiny ball', 'big ball', 'huge ball');
  add(m.intervalMul - 1, CFG.dailyIntervalDevMin, CFG.dailyIntervalDevMax,
      'relentless saws', 'saw storm', 'sparse saws', 'quiet sky');
  add(m.sawSpeedMul - 1, CFG.dailySawSpeedDevMin, CFG.dailySawSpeedDevMax,
      'slow saws', 'sleepy saws', 'fast saws', 'blazing saws');
  add((m.grace - CFG.hazardDelay) / CFG.hazardDelay,
      CFG.dailyGraceDevMin / CFG.hazardDelay, CFG.dailyGraceDevMax / CFG.hazardDelay,
      'short warm-up', 'no warm-up', 'long warm-up', 'lazy start');
  add(m.starMul - 1, CFG.dailyStarDevMin, CFG.dailyStarDevMax,
      'star drought', 'star famine', 'star rain', 'star flood');
  chips.sort((a, b) => b.rank - a.rank);
  return chips.slice(0, 3).map(c => c.text).join(' · ');
}

export function dailyBestGet(key){
  return Math.max(0, Math.floor(LS.num(KEYS.daily + key, 0)));
}

export function dailyBestSet(key, score){
  if (score <= dailyBestGet(key)) return false;
  LS.set(KEYS.daily + key, String(score));
  return true;
}

/* The interval floor still exists so a brutal seed stays playable (pillar 4). */
export function dailyIntervalFloor(){
  return 0.9;
}
