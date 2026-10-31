/* input.js — the only place that touches DOM events.
 * Guide §6: "Never run logic in event handlers except recording intents", so every
 * handler here just calls into flow.js / ball.js and lets the loop do the work.
 * CORE-10: Pointer Events, identical for mouse, touch and pen.
 */

import { DOM } from './dom.js';
import { KEYS } from './config.js';
import { LS } from './storage.js';
import { Snd } from './audio.js';
import { attemptBounce } from './ball.js';
import { skinChoose } from './skins.js';
import { copyShare, renderMeta } from './hud.js';
import { pauseGame, quitToMenu, resumeGame, shareText, startClimb, startDaily, startGame, toggleMute, togglePause, tryRestart } from './flow.js';

function onButton(e){
  const t = e.target;
  return !!(t && t.closest && t.closest('button'));
}

export function bindInput(g){
  DOM.canvas.addEventListener('pointerdown', function(e){
    e.preventDefault();
    Snd.ensure();                                     // AUD-02: inside the gesture
    if (g.state === 'play') attemptBounce(g, e.clientX, e.clientY, false);
    else if (g.state === 'over') tryRestart(g);
  });

  /* long-press must not open a callout / select text on mobile (INPUT-01) */
  DOM.canvas.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  DOM.startBtn.addEventListener('click', function(){ startGame(g); });
  DOM.climbBtn.addEventListener('click', function(){ startClimb(g); });
  DOM.dailyBtn.addEventListener('click', function(){ startDaily(g); });
  DOM.shareBtn.addEventListener('click', function(){ copyShare(shareText(g)); });
  DOM.retryBtn.addEventListener('click', function(){ startGame(g); });
  DOM.resumeBtn.addEventListener('click', function(){ resumeGame(g); });
  DOM.pauseQuitBtn.addEventListener('click', function(){ quitToMenu(g); });
  DOM.pauseBtn.addEventListener('click', function(){ togglePause(g); });
  DOM.muteBtn.addEventListener('click', function(){ Snd.ensure(); toggleMute(); });

  /* Phase 4 skins: palette swaps, gated by best-score thresholds */
  DOM.skins.addEventListener('click', function(e){
    const btn = e.target && e.target.closest ? e.target.closest('.swatch') : null;
    if (!btn) return;
    const best = Math.max(0, Math.floor(LS.num(KEYS.best, 0)));
    const skin = skinChoose(btn.getAttribute('data-skin'), best);
    if (skin){
      g.skin = skin;
      renderMeta(g);
      Snd.copy();
    }
  });

  window.addEventListener('keydown', function(e){
    /* A11Y-02: if a button has focus, Space/Enter belongs to that button */
    if (e.code === 'Space' || e.code === 'Enter' || e.key === ' '){
      if (onButton(e)) return;
      e.preventDefault();
      Snd.ensure();
      if (g.state === 'menu') startGame(g);
      else if (g.state === 'paused') resumeGame(g);
      else tryRestart(g);                              // UI-04 lock is checked inside
      return;
    }
    if (e.code === 'KeyP' || e.code === 'Escape'){     // UI-06
      e.preventDefault();
      Snd.ensure();
      togglePause(g);
      return;
    }
    if (g.state === 'menu' && !onButton(e)){
      if (e.code === 'KeyC'){ Snd.ensure(); startClimb(g); return; }
      if (e.code === 'KeyD'){ Snd.ensure(); startDaily(g); return; }
    }
    if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M'){   // AUD-05
      Snd.ensure();
      toggleMute();
    }
  });

  /* UI-06: auto-pause when the tab is hidden. Resume stays a deliberate act, so
   * returning to the tab can never drop you into a death you could not see. */
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) pauseGame(g, 'tab');
  });
}
