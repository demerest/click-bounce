/* game.js — orchestration: the loop, the frame budget, and boot.
 * Guide §6: one requestAnimationFrame, dt clamped in exactly one place (here),
 * then update -> HUD -> render.
 */

import { CFG, KEYS } from './config.js';
import { clamp } from './math.js';
import { LS } from './storage.js';
import { DOM, showFatal } from './dom.js';
import { Snd } from './audio.js';
import { bgBaseHue, createGame, gravityNow, resetRun, timeScaleNow } from './state.js';
import { addEdgeWarn, addRing, addScore, addText, burst, shakeBy, updateFx } from './fx.js';
import { attemptBounce, ballHitFloor, updateBall } from './ball.js';
import { spawnPickup, spawnSaw, spawnSeeker, spawnSpike, sawInterval, updateSpawners } from './spawn.js';
import { collectPickup, updateHazards, updatePickups } from './entities.js';
import { die, loadPersisted, pauseGame, quitToMenu, resumeGame, shareText, startClimb, startDaily, startGame, startRun, toggleMute, togglePause, tryRestart, updateFlow } from './flow.js';
import { createRenderer } from './render.js';
import { resetHudCache, showMenu, updateHud, applyCssKnobs, copyShare, renderMeta } from './hud.js';
import { bindInput } from './input.js';
import { ACH, achCount, achHas, achReset, achTick, achUnlock } from './achievements.js';
import { SKINS, skinChoose, skinIsUnlocked, skinLoad } from './skins.js';
import { climbBandValid, climbBandY, climbInit, climbMakeBand, climbUpdate } from './climb.js';
import { dailyBestGet, dailyBestSet, dailyKey, dailyLabel, dailyMods } from './daily.js';

export const G = createGame();
let R = null;
let last = 0;
const DEBUG = debugMode();

/* ------------------------------------------------------------- attract mode */
/* UI-02: a live autopilot ball on the menu — no sound, no score, no hazards. */
function attractMode(g, physDt){
  const b = g.ball;
  if (b.vy > 0 && b.y > g.H * CFG.autoTriggerFrac){
    const push = clamp((g.W / 2 - b.x) * CFG.autoPushGain, -CFG.autoPushMax, CFG.autoPushMax);
    attemptBounce(g, b.x - push * CFG.autoPushOffset, b.y + b.r * 2, true);
  }
  if (b.y + b.r >= g.H){
    b.y = g.H - b.r;
    b.vy = -CFG.bouncePower * CFG.autoFloorPowerMul;
    b.wAmp = CFG.autoFloorWobble;
  }
}

/* Timed pickup effects. Every one of them is capped in CFG (pillar 4). */
function tickEffects(g, dt){
  if (g.slowmoT > 0){
    g.slowmoT -= dt;
    if (g.slowmoT <= 0){ g.slowmoT = 0; Snd.slowmoEnd(); }
  }
  if (g.magnetT > 0) g.magnetT = Math.max(0, g.magnetT - dt);
  if (g.heavyT > 0) g.heavyT = Math.max(0, g.heavyT - dt);
}

/* ------------------------------------------------------------------- update */
export function update(g, dtReal){
  updateFlow(g, dtReal);
  if (g.state === 'paused') return;              // UI-06: frozen, state fully intact

  g.totalT += dtReal;

  /* Phase 2 hit-stop: physics freezes for a few frames, the wobble keeps going.
   * Only during play — freezing the menu demo would look like a hang. */
  const hitStopActive = g.hitStop > 0 && g.state === 'play';
  if (g.hitStop > 0) g.hitStop = Math.max(0, g.hitStop - dtReal);

  const fxDt = dtReal * (hitStopActive ? 1 : timeScaleNow(g));
  const physDt = hitStopActive ? 0 : dtReal * timeScaleNow(g);

  updateFx(g, fxDt);
  achTick(g, fxDt);                       // Phase 4: badge conditions + toast clock
  if (g.state === 'over') return;                // tableau behind the panel, as in the prototype

  const playing = g.state === 'play';
  if (playing){
    g.elapsed += physDt;
    /* effect durations are real-time: slow-mo must not extend itself */
    tickEffects(g, dtReal * g.timeScale);
  }

  const gravity = gravityNow(g);

  /* A11Y-01: with reduced motion the menu demo ball parks itself instead of
   * bouncing forever. During play, reduced motion only strips decoration. */
  const parked = g.state === 'menu' && g.reducedMotion;
  if (parked){
    g.ball.vx = 0; g.ball.vy = 0;
  } else if (g.state === 'menu'){
    attractMode(g, physDt);
  }

  if (!parked && physDt > 0) updateBall(g, physDt, gravity);

  if (playing){
    if (g.mode === 'climb'){
      /* Phase 5: bands, lava and the metre score replace the classic spawners */
      if (physDt > 0 && climbUpdate(g, physDt)) return;
      if (g.combo > 0){
        g.comboTimer -= physDt;
        if (g.comboTimer <= 0) g.combo = 0;
      }
    } else {
      if (ballHitFloor(g)){ die(g); return; }      // CORE-04
      if (g.combo > 0){
        g.comboTimer -= physDt;
        if (g.comboTimer <= 0) g.combo = 0;        // SCORE-02 expiry
      }
      updateSpawners(g, physDt);
    }
  }

  if (physDt > 0 && g.mode !== 'climb'){
    updateHazards(g, physDt);
    updatePickups(g, physDt);
  }
}

/* One frame of the whole game. dt is already clamped by advance(). */
export function step(dt){
  update(G, dt);
  updateHud(G);
  if (R) R.draw(G);
}

/* -------------------------------------------------------------------- loop */
/* PHYS-01: the dt clamp lives here and nowhere else (guide §6 / ROADMAP §3). */
export function advance(now){
  const dt = Math.min(Math.max((now - last) / 1000, 0), CFG.fpsFloorDt);
  last = now;
  step(dt);
  return dt;
}

function frame(now){
  if (!DEBUG) requestAnimationFrame(frame);
  advance(now);
}

/* -------------------------------------------------------------------- boot */
function detectReducedMotion(){
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e){ return false; }
}

function debugMode(){
  try {
    return /[?&]debug/.test(window.location.search) || /(^|[#&])debug/.test(window.location.hash);
  } catch (e){ return false; }
}

/* COMPAT-01: a visible failure beats a silent black screen. */
function installErrorSurface(){
  window.addEventListener('error', function(ev){
    showFatal((ev && ev.message) || 'unknown error');
  });
}

function onResize(){ if (R) R.resize(G); }

export function newTestGame(w, h){
  const g = createGame();
  g.W = w; g.H = h;
  g.reducedMotion = G.reducedMotion;
  resetRun(g);
  return g;
}

export function boot(){
  try {
    LS.probe();
    G.reducedMotion = detectReducedMotion();
    applyCssKnobs();
    R = createRenderer(DOM.canvas);
    R.resize(G);
    loadPersisted(G);
    G.skin = skinLoad();
    resetHudCache();
    resetRun(G);
    showMenu(G);
    bindInput(G);
    window.addEventListener('resize', onResize);
    installErrorSurface();
    updateHud(G);
    last = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    if (DEBUG){
      /* Test seam: index.html?debug exposes the internals and does NOT start the
       * loop, so a harness can drive deterministic fixed-dt steps. The shipped
       * page defines no globals at all. */
      window.__KEEPUP__ = {
        CFG: CFG, KEYS: KEYS, G: G, LS: LS, Snd: Snd, renderer: R,
        step: step, update: update, advance: advance, frame: frame, newGame: newTestGame,
        fx: {
          burst: burst, addRing: addRing, addText: addText, addScore: addScore,
          shakeBy: shakeBy, addEdgeWarn: addEdgeWarn, updateFx: updateFx,
        },
        startGame: startGame, die: die, tryRestart: tryRestart, tickEffects: tickEffects,
        startRun: startRun, startDaily: startDaily, startClimb: startClimb, shareText: shareText,
        climbInit: climbInit, climbUpdate: climbUpdate,
        climbMakeBand: climbMakeBand, climbBandValid: climbBandValid, climbBandY: climbBandY,
        achTick: achTick, achHas: achHas, achCount: achCount, achReset: achReset, achUnlock: achUnlock,
        achCurrentToast: achCurrentToast,
        ACH: ACH, SKINS: SKINS, skinLoad: skinLoad, skinChoose: skinChoose, skinIsUnlocked: skinIsUnlocked,
        dailyKey: dailyKey, dailyMods: dailyMods, dailyLabel: dailyLabel,
        dailyBestGet: dailyBestGet, dailyBestSet: dailyBestSet,
        pauseGame: pauseGame, resumeGame: resumeGame, togglePause: togglePause,
        quitToMenu: quitToMenu, toggleMute: toggleMute, updateFlow: updateFlow,
        attemptBounce: attemptBounce, gravityNow: gravityNow, resetRun: resetRun, bgBaseHue: bgBaseHue,
        timeScaleNow: timeScaleNow,
        spawnSaw: spawnSaw, spawnSpike: spawnSpike, spawnSeeker: spawnSeeker,
        spawnPickup: spawnPickup, updateSpawners: updateSpawners, sawInterval: sawInterval,
        copyShare: copyShare, renderMeta: renderMeta,
        updateHazards: updateHazards, updatePickups: updatePickups,
        collectPickup: collectPickup, updateBall: updateBall, updateHud: updateHud,
        showFatal: showFatal,
      };
      R.draw(G);
    } else {
      requestAnimationFrame(frame);
    }
  } catch (err){
    showFatal(err && err.message ? err.message : String(err));
  }
}

boot();
