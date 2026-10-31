/* achievements.js — Phase 4 badges: earned in-run, remembered forever, announced
 * with a pure-CSS toast (hud.js only toggles classes).
 * Guide rule 3: each badge has feedback (toast), a sound, and a menu line.
 */

import { CFG, KEYS } from './config.js';
import { LS } from './storage.js';
import { Snd } from './audio.js';

export const ACH = [
  { id: 'combo10', name: 'MAXIMUM JELLY', desc: 'reach a x10 combo' },
  { id: 'stars3', name: 'STAR VACUUM', desc: 'grab 3 stars in one run' },
  { id: 'live120', name: 'TWO MINUTES', desc: 'survive 120 seconds' },
  { id: 'save1', name: 'BODYGUARD', desc: 'let a shield eat a hazard' },
];

let unlocked = null;
const queue = [];
let showing = null;
let gapT = 0;

export function achLoad(){
  if (unlocked) return unlocked;
  unlocked = {};
  const raw = LS.get(KEYS.ach);
  if (raw){
    const parts = raw.split(',');
    for (let i = 0; i < parts.length; i++){
      if (parts[i]) unlocked[parts[i]] = 1;
    }
  }
  return unlocked;
}

export function achHas(id){ return !!achLoad()[id]; }

export function achCount(){
  const u = achLoad();
  let n = 0;
  for (let i = 0; i < ACH.length; i++) if (u[ACH[i].id]) n++;
  return n;
}

export function achDef(id){
  for (let i = 0; i < ACH.length; i++) if (ACH[i].id === id) return ACH[i];
  return null;
}

export function achUnlock(g, id){
  const u = achLoad();
  if (u[id]) return false;
  u[id] = 1;
  const ids = [];
  for (let i = 0; i < ACH.length; i++) if (u[ACH[i].id]) ids.push(ACH[i].id);
  LS.set(KEYS.ach, ids.join(','));          // guarded; silently skipped if blocked
  if (queue.length < CFG.achToastCap) queue.push(id);
  Snd.achievement();
  return true;
}

/* Conditions are checked here so triggers stay in one auditable place. */
function checkConditions(g){
  if (g.state !== 'play') return;
  if (g.combo >= CFG.comboCap) achUnlock(g, 'combo10');
  if (g.starsRun >= CFG.achStars) achUnlock(g, 'stars3');
  if (g.elapsed >= CFG.achSurvive) achUnlock(g, 'live120');
  if (g.shieldSaves >= 1) achUnlock(g, 'save1');
}

/* Advances the toast clock; returns the toast currently on screen (or null). */
export function achTick(g, dt){
  checkConditions(g);
  if (showing){
    showing.t -= dt;
    if (showing.t <= 0){ showing = null; gapT = CFG.achToastGap; }
  } else if (gapT > 0){
    gapT -= dt;
  } else if (queue.length){
    showing = { id: queue.shift(), t: CFG.achToastTime };
  }
  return showing;
}

export function achCurrentToast(){ return showing; }

/* Test seam: forget everything and drop pending toasts. */
export function achReset(){
  unlocked = null;
  queue.length = 0;
  showing = null;
  gapT = 0;
}
