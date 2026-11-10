/* dom.js — every element lookup happens once, here (UI-05: menus/HUD in DOM).
 * The bundle places this at the end of <body>; module builds are deferred.
 * Either way the DOM is ready when this evaluates.
 */

function byId(id){ return document.getElementById(id); }

export const DOM = {
  canvas: byId('game'),
  hud: byId('hud'),
  score: byId('score'),
  best: byId('best'),
  comboBox: byId('comboBox'),
  combo: byId('combo'),
  comboBar: byId('comboBar'),
  effects: byId('effects'),
  pauseBtn: byId('pauseBtn'),
  muteBtn: byId('mute'),
  menu: byId('menu'),
  pauseEl: byId('pause'),
  over: byId('over'),
  pauseReason: byId('pauseReason'),
  startBtn: byId('startBtn'),
  climbBtn: byId('climbBtn'),
  dailyBtn: byId('dailyBtn'),
  shareBtn: byId('shareBtn'),
  resumeBtn: byId('resumeBtn'),
  pauseQuitBtn: byId('pauseQuitBtn'),
  retryBtn: byId('retryBtn'),
  menuBtn: byId('menuBtn'),
  scoreUnit: byId('scoreUnit'),
  modeTag: byId('modeTag'),
  overEyebrow: byId('overEyebrow'),
  toasts: byId('toasts'),
  toast: byId('toast'),
  toastName: byId('toastName'),
  toastDesc: byId('toastDesc'),
  badges: byId('badges'),
  skins: byId('skins'),
  dailyStrip: byId('dailyStrip'),
  finalScoreVal: byId('finalScoreVal'),
  newBest: byId('newBest'),
  finalBounces: byId('finalBounces'),
  finalCombo: byId('finalCombo'),
  finalTime: byId('finalTime'),
  finalBest: byId('finalBest'),
  srStatus: byId('srStatus'),
  fatal: byId('fatal'),
};

/* Last-resort surface for a runtime failure. COMPAT-01 asks for graceful
 * degradation; a silent black screen is not graceful. Also our test seam. */
export function showFatal(msg){
  const el = DOM.fatal;
  if (!el) return;
  el.textContent = 'Something broke: ' + msg;
  el.classList.remove('hidden');
}

export function announce(msg){
  if (DOM.srStatus) DOM.srStatus.textContent = msg;
}

/* Touch-only devices have no keyboard to advertise, so the PC key hints are
 * hidden there (playtest: the Android app and phone browsers). */
export function touchOnlyInput(fine, coarse, touchPoints){
  return !fine && (coarse || touchPoints > 0);
}

export function detectTouchOnly(){
  try {
    const mm = window.matchMedia;
    return touchOnlyInput(
      !!(mm && mm('(pointer: fine)').matches),
      !!(mm && mm('(pointer: coarse)').matches),
      navigator.maxTouchPoints || 0);
  } catch (e){ return false; }
}

/* Impact / Arial Black exist on desktops but not on Android, where the display
 * stack silently falls back to a light sans at weight 400 (playtest: the menu
 * buttons looked thin next to the web build). Where no heavy face resolves,
 * synthetise the weight instead. */
export function fallbackDisplay(impactW, plainW, blackW){
  return Math.abs(impactW - plainW) < 0.5 && Math.abs(blackW - plainW) < 0.5;
}

export function detectFallbackDisplay(){
  try {
    const c = document.createElement('canvas').getContext('2d');
    const probe = 'WWWWWWWW';
    c.font = '32px Impact, sans-serif'; const a = c.measureText(probe).width;
    c.font = '32px sans-serif'; const b = c.measureText(probe).width;
    c.font = '32px "Arial Black", sans-serif'; const d = c.measureText(probe).width;
    return fallbackDisplay(a, b, d);
  } catch (e){ return false; }
}
