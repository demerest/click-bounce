/* hud.js — everything drawn in DOM/CSS rather than canvas (UI-03, UI-05).
 * DOM writes are cached: we only touch the document when a value actually changed.
 */

import { CFG, KEYS } from './config.js';
import { DOM } from './dom.js';
import { LS } from './storage.js';
import { Snd } from './audio.js';
import { ACH, achCurrentToast, achDef, achHas } from './achievements.js';
import { SKINS, skinIsUnlocked, skinThreshold } from './skins.js';
import { dailyBestGet, dailyKey, dailyLabel, dailyMods } from './daily.js';

let hudScore = -1;
let hudBest = -1;
let hudCombo = -1;
let hudComboWidth = -1;
let hudFxKey = '';
let hudPauseState = '';
let hudToastId = '';
let hudUnitState = '';

function focusEl(el){
  if (el && typeof el.focus === 'function'){
    try { el.focus({ preventScroll: true }); } catch (e){ el.focus(); }
  }
}

export function hideOverlays(){
  DOM.menu.classList.add('hidden');
  DOM.pauseEl.classList.add('hidden');
  DOM.over.classList.add('hidden');
}

export function showMenu(g){
  hideOverlays();
  DOM.menu.classList.remove('hidden');
  if (g) renderMeta(g);
  focusEl(DOM.startBtn);
}

export function showPause(g){
  hideOverlays();
  DOM.pauseReason.textContent = g.pausedBy === 'tab'
    ? 'You switched away, so the ball is waiting for you.'
    : 'The jelly ball is holding its breath.';
  DOM.pauseEl.classList.remove('hidden');
  focusEl(DOM.resumeBtn);
}

export function fillGameOver(g){
  DOM.overEyebrow.textContent = g.mode === 'climb' ? 'THE LAVA WINS'
    : g.daily ? 'DAILY ' + g.daily.key : 'GRAVITY WINS';
  DOM.finalScoreVal.textContent = g.score;
  DOM.newBest.style.display = g.newBest ? 'inline-block' : 'none';
  DOM.finalBounces.textContent = g.bounces;
  DOM.finalCombo.textContent = '\u00d7' + Math.min(g.maxCombo, CFG.comboCap);
  DOM.finalTime.textContent = Math.floor(g.elapsed) + 's';
  DOM.finalBest.textContent = g.best;
  DOM.shareBtn.textContent = 'COPY SCORE';
}

export function showGameOver(g){
  fillGameOver(g);
  hideOverlays();
  DOM.over.classList.remove('hidden');
  focusEl(DOM.retryBtn);
}

export function syncMuteButton(){
  const muted = Snd.muted;
  DOM.muteBtn.classList.toggle('muted', muted);
  DOM.muteBtn.innerHTML = muted ? '&#9834; OFF' : '&#9834; ON';
  DOM.muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
}

export function syncPauseButton(g){
  const key = g.state;
  if (key === hudPauseState) return;
  hudPauseState = key;
  const active = key === 'play' || key === 'paused';
  DOM.pauseBtn.classList.toggle('hidden', !active);
  DOM.pauseBtn.innerHTML = key === 'paused' ? '&#9654;' : '&#10074;&#10074;';
  DOM.pauseBtn.setAttribute('aria-label', key === 'paused' ? 'Resume' : 'Pause');
}

/* Effect pills: one line of visible feedback per live mechanic (guide rule 3). */
function effectsMarkup(g){
  let html = '';
  if (g.shield) html += '<span class="pill pill-shield">SHIELD</span>';
  if (g.slowmoT > 0) html += '<span class="pill pill-slowmo">SLOW<i>' + Math.ceil(g.slowmoT) + 's</i></span>';
  if (g.magnetT > 0) html += '<span class="pill pill-magnet">MAGNET<i>' + Math.ceil(g.magnetT) + 's</i></span>';
  if (g.heavyT > 0) html += '<span class="pill pill-heavy">HEAVY<i>' + Math.ceil(g.heavyT) + 's</i></span>';
  return html;
}

export function updateHud(g){
  if (g.score !== hudScore){
    hudScore = g.score;
    DOM.score.textContent = g.score;
    DOM.score.classList.remove('pop');
    void DOM.score.offsetWidth;
    DOM.score.classList.add('pop');
  }
  if (g.best !== hudBest){
    hudBest = g.best;
    DOM.best.textContent = 'BEST ' + g.best;
  }

  /* SCORE-04: remaining combo window must be visible */
  const showCombo = g.combo >= 2 && g.state === 'play';
  DOM.comboBox.style.opacity = showCombo ? 1 : 0;
  if (showCombo){
    const capped = Math.min(g.combo, CFG.comboCap);
    if (capped !== hudCombo){
      hudCombo = capped;
      DOM.combo.innerHTML = '&times;' + capped + (g.combo >= CFG.comboCap ? ' MAX' : '');
    }
    const pct = Math.round(g.comboTimer / CFG.comboWindow * 100);
    if (pct !== hudComboWidth){
      hudComboWidth = pct;
      DOM.comboBar.style.width = pct + '%';
    }
  } else if (hudCombo !== -1){
    hudCombo = -1; hudComboWidth = -1;
  }

  const fx = effectsMarkup(g);
  if (fx !== hudFxKey){
    hudFxKey = fx;
    DOM.effects.innerHTML = fx;
  }

  const unit = g.mode === 'climb' ? 'm' : '';
  if (unit !== hudUnitState){
    hudUnitState = unit;
    DOM.scoreUnit.textContent = unit;
    DOM.scoreUnit.classList.toggle('hidden', !unit);
  }

  updateToast();
  syncPauseButton(g);
}

/* Phase 4 badge toast: pure CSS animation, JS only swaps content and the class. */
function updateToast(){
  const t = achCurrentToast();
  const id = t ? t.id : '';
  if (id === hudToastId) return;
  hudToastId = id;
  if (!t){
    DOM.toast.classList.remove('show');
    return;
  }
  const def = achDef(id);
  DOM.toastName.textContent = def ? def.name : id;
  DOM.toastDesc.textContent = def ? def.desc : '';
  DOM.toast.classList.remove('show');
  void DOM.toast.offsetWidth;
  DOM.toast.classList.add('show');
}

/* Menu furniture: earned badges, skin swatches, today's daily mix. */
export function renderMeta(g){
  const best = Math.max(0, Math.floor(LS.num(KEYS.best, 0)));

  let bhtml = '';
  for (let i = 0; i < ACH.length; i++){
    const a = ACH[i];
    const on = achHas(a.id);
    bhtml += '<span class="badge' + (on ? ' on' : '') + '" title="' + a.desc + '"'
          +  ' aria-label="Badge ' + a.name + ': ' + a.desc + (on ? ', unlocked' : ', locked') + '">'
          +  (on ? '\u2605' : '\u00b7') + '</span>';
  }
  DOM.badges.innerHTML = bhtml;

  let shtml = '';
  for (let i = 0; i < SKINS.length; i++){
    const s = SKINS[i];
    const un = skinIsUnlocked(i, best);
    const sel = !!(g.skin && g.skin.id === s.id);
    shtml += '<button type="button" class="swatch' + (un ? '' : ' locked') + '" data-skin="' + s.id + '"'
          +  ' style="--hi:' + s.hi + ';--mid:' + s.mid + ';--lo:' + s.lo + '"'
          +  ' aria-pressed="' + (sel ? 'true' : 'false') + '"'
          +  ' title="' + s.name + (un ? '' : ' \u2014 unlocks at ' + skinThreshold(i)) + '"'
          +  ' aria-label="Skin ' + s.name + (un ? '' : ', locked, unlocks at ' + skinThreshold(i)) + '"></button>';
  }
  DOM.skins.innerHTML = shtml;

  const key = dailyKey();
  DOM.dailyStrip.textContent = 'DAILY ' + key + ' \u00b7 ' + dailyLabel(dailyMods(key))
                             + ' \u00b7 best ' + dailyBestGet(key);
}

/* Phase 4 share: clipboard only, never the network (PORT-01 / DATA-01). */
function fallbackCopy(text){
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (e){ return false; }
}

export function copyShare(text){
  const finish = ok => {
    DOM.shareBtn.textContent = ok ? 'COPIED!' : 'COPY FAILED';
    if (ok) Snd.copy();
  };
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(
      function(){ finish(true); },
      function(){ finish(fallbackCopy(text)); }
    );
  } else {
    finish(fallbackCopy(text));
  }
}

/* CFG drives the CSS toast timing too, so the knob stays single-sourced. */
export function applyCssKnobs(){
  try {
    document.documentElement.style.setProperty('--toast-in', CFG.achToastIn + 's');
  } catch (e){ /* CSS variables unsupported: the stylesheet fallback applies */ }
}

/* Called once at boot so a cached value can never hide a real change. */
export function resetHudCache(){
  hudScore = -1; hudBest = -1; hudCombo = -1; hudComboWidth = -1; hudFxKey = '\u0000';
  hudPauseState = '';
}
