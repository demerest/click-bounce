/* rng.js — deterministic RNG for the daily challenge (Phase 4).
 * The seed is a date string, so everyone gets the same modifiers that day.
 * Gameplay itself still uses Math.random; only the daily *mix* is seeded.
 */

/* FNV-1a: short, stable, good enough for seeding */
export function hashSeed(str){
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/* mulberry32: tiny, fast, deterministic */
export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRange(rnd, a, b){ return a + rnd() * (b - a); }

export function seededInt(rnd, a, b){ return Math.floor(seededRange(rnd, a, b + 1)); }

export function seededPick(rnd, arr){ return arr[Math.floor(rnd() * arr.length) % arr.length]; }
