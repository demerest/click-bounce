/* hud.js — everything drawn in DOM/CSS rather than canvas (UI-03, UI-05).
 * DOM writes are cached: we only touch the document when a value actually changed.
 */

import { CFG } from './config.js';
import { DOM } from './dom.js';
import { Snd } from './audio.js';

let hudScore = -1;
let hudBest = -1;
let hudCombo = -1;
let hudComboWidth = -1;
let hudFxKey = '';
let hudPauseState = '';

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

export function showMenu(){
  hideOverlays();
  DOM.menu.classList.remove('hidden');
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
  DOM.finalScoreVal.textContent = g.score;
  DOM.newBest.style.display = g.newBest ? 'inline-block' : 'none';
  DOM.finalBounces.textContent = g.bounces;
  DOM.finalCombo.textContent = '\u00d7' + Math.min(g.maxCombo, CFG.comboCap);
  DOM.finalTime.textContent = Math.floor(g.elapsed) + 's';
  DOM.finalBest.textContent = g.best;
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

  syncPauseButton(g);
}

/* Called once at boot so a cached value can never hide a real change. */
export function resetHudCache(){
  hudScore = -1; hudBest = -1; hudCombo = -1; hudComboWidth = -1; hudFxKey = '\u0000';
  hudPauseState = '';
}
