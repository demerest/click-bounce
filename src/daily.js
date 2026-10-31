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

export function dailyMods(key){
  const rnd = mulberry32(hashSeed('keepup:' + key));
  return {
    key: key,
    gravityMul: seededRange(rnd, CFG.dailyGravityMin, CFG.dailyGravityMax),
    intervalMul: seededRange(rnd, CFG.dailyIntervalMin, CFG.dailyIntervalMax),
    sawSpeedMul: seededRange(rnd, CFG.dailySawSpeedMin, CFG.dailySawSpeedMax),
    grace: seededRange(rnd, CFG.dailyGraceMin, CFG.dailyGraceMax),
    starMul: seededRange(rnd, CFG.dailyStarMin, CFG.dailyStarMax),
  };
}

/* Two or three human-readable chips for the menu strip. */
export function dailyLabel(m){
  const bits = [];
  bits.push(m.gravityMul > 1.03 ? 'heavy gravity' : m.gravityMul < 0.97 ? 'light gravity' : 'normal gravity');
  bits.push(m.intervalMul < 0.95 ? 'relentless saws' : m.intervalMul > 1.08 ? 'sparse saws' : 'steady saws');
  bits.push(m.sawSpeedMul > 1.08 ? 'fast saws' : m.sawSpeedMul < 0.92 ? 'slow saws' : 'usual saw speed');
  if (m.starMul > 1.1) bits.push('star rain');
  else if (m.starMul < 0.9) bits.push('star drought');
  return bits.slice(0, 3).join(' · ');
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
