/* flow.js — state machine transitions (UI-01, UI-04, UI-06).
 * menu -> play -> (paused) -> dying -> over -> play ...
 * Nothing here is called from an event handler without going through input.js.
 */

import { CFG, KEYS } from './config.js';
import { approach } from './math.js';
import { LS } from './storage.js';
import { announce } from './dom.js';
import { Snd } from './audio.js';
import { resetBall, resetRun } from './state.js';
import { deathBurst } from './ball.js';
import { hideOverlays, showGameOver, showMenu, showPause, syncMuteButton } from './hud.js';

function nowMs(){
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/* SCORE-06 (best) and AUD-05 (mute) — both read through the guarded storage layer. */
export function loadPersisted(g){
  g.best = Math.max(0, Math.floor(LS.num(KEYS.best, 0)));
  Snd.setMuted(LS.bool(KEYS.mute, false));
  syncMuteButton();
}

export function startGame(g){
  Snd.ensure();                       // AUD-02: inside a user gesture
  resetRun(g);
  g.state = 'play';
  hideOverlays();
  Snd.start();
  announce('Run started. Click near the ball to bounce it.');
}

/* CORE-04 / HAZ-03 both end here. The panel is delayed so the death lands first. */
export function die(g){
  if (g.ball.dead) return;
  g.ball.dead = true;
  g.state = 'dying';
  g.deathT = 0;
  g.panelShown = false;
  g.overAt = nowMs();
  deathBurst(g);
  Snd.die();

  g.newBest = g.score > g.best;
  if (g.newBest){
    g.best = g.score;
    LS.set(KEYS.best, String(g.best));     // silently ignored if storage is blocked
  }
  announce('Run over. Score ' + g.score + (g.newBest ? ', new best!' : '') + ' Best ' + g.best + '.');
}

/* Real-time (unscaled) driver for the death sequence and the restart lock. */
export function updateFlow(g, dtReal){
  if (g.state === 'dying'){
    g.deathT += dtReal;
    g.timeScale = approach(g.timeScale, CFG.deathTimeScale, CFG.deathTimeScaleRate * dtReal);
    if (g.deathT >= CFG.deathSlowmo) g.state = 'over';
  } else if (g.state === 'over'){
    g.timeScale = 1;
    if (!g.panelShown && nowMs() - g.overAt >= (CFG.deathSlowmo + CFG.overPanelDelay) * 1000){
      g.panelShown = true;
      showGameOver(g);
    }
  } else {
    g.timeScale = 1;
  }
}

/* UI-04: locked for restartLock after death so a panic click cannot skip the panel. */
export function tryRestart(g){
  if (g.state !== 'over') return false;
  if (nowMs() - g.overAt < CFG.restartLock * 1000) return false;
  startGame(g);
  return true;
}

export function pauseGame(g, by){
  if (g.state !== 'play') return false;
  g.state = 'paused';
  g.pausedBy = by || 'user';
  showPause(g);
  Snd.pause();
  announce('Paused.');
  return true;
}

export function resumeGame(g){
  if (g.state !== 'paused') return false;
  g.state = 'play';
  g.pausedBy = null;
  hideOverlays();
  Snd.ensure();
  Snd.resume();
  announce('Resumed.');
  return true;
}

export function togglePause(g){
  return g.state === 'paused' ? resumeGame(g) : pauseGame(g, 'user');
}

export function quitToMenu(g){
  g.state = 'menu';
  g.pausedBy = null;
  g.timeScale = 1;
  resetRun(g);
  resetBall(g);
  showMenu();
}

export function toggleMute(){
  Snd.setMuted(!Snd.muted);
  LS.set(KEYS.mute, Snd.muted ? '1' : '0');
  syncMuteButton();
  if (!Snd.muted){
    Snd.ensure();
    Snd.resume();          // audible confirmation that sound is back
  }
  announce(Snd.muted ? 'Sound off.' : 'Sound on.');
  return Snd.muted;
}
