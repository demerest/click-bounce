/* skins.js — Phase 4 palette swaps. No images, ever: a skin is four colours.
 * Unlocks are best-score thresholds (CFG.skinUnlock); the choice is remembered.
 */

import { CFG, KEYS } from './config.js';
import { LS } from './storage.js';

export const SKINS = [
  { id: 'jelly', name: 'JELLY', hi: '#ffd9d0', mid: '#ff6b6b', lo: '#c9375c', trail: '#ff8f8f' },
  { id: 'lime', name: 'LIME', hi: '#eaffd0', mid: '#7ed957', lo: '#2f9e44', trail: '#a8e063' },
  { id: 'grape', name: 'GRAPE', hi: '#f0d9ff', mid: '#b06bff', lo: '#6a2fa0', trail: '#c99aff' },
  { id: 'solar', name: 'SOLAR', hi: '#fff3c4', mid: '#ffb703', lo: '#b45309', trail: '#ffd166' },
];

let selected = null;

export function skinIndex(id){
  for (let i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return i;
  return -1;
}

export function skinIsUnlocked(i, best){
  return i >= 0 && i < CFG.skinUnlock.length && best >= CFG.skinUnlock[i];
}

export function skinUnlockedCount(best){
  let n = 0;
  for (let i = 0; i < SKINS.length; i++) if (skinIsUnlocked(i, best)) n++;
  return n;
}

export function skinLoad(){
  if (selected) return selected;
  const i = skinIndex(LS.get(KEYS.skin));
  selected = i >= 0 ? SKINS[i] : SKINS[0];
  return selected;
}

/* Refuses locked skins; a stored id that is somehow locked falls back to default. */
export function skinChoose(id, best){
  const i = skinIndex(id);
  if (!skinIsUnlocked(i, best)) return null;
  selected = SKINS[i];
  LS.set(KEYS.skin, selected.id);
  return selected;
}

export function skinThreshold(i){
  return i >= 0 && i < CFG.skinUnlock.length ? CFG.skinUnlock[i] : 0;
}
