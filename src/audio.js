/* audio.js — every sound is synthesized (AUD-01). No files, ever.
 * AUD-02: the context is only created/resumed from ensure(), which input.js
 * calls from inside a real user gesture — never at load time.
 * AUD-04: master gain <= 0.2, every voice uses a short envelope.
 * AUD-06: one distinct, throttled sound per discrete event.
 */

import { CFG } from './config.js';

export const Snd = {
  ctx: null,
  master: null,
  noiseBuf: null,
  muted: false,
  available: true,
  lastAt: {},

  /* called from a user gesture only */
  ensure(){
    if (!this.available) return false;
    if (!this.ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC){ this.available = false; return false; }   // COMPAT-01
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : CFG.masterGain;
        this.master.connect(this.ctx.destination);
        const len = Math.max(1, Math.floor(this.ctx.sampleRate * 0.5));
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;
      } catch (e){
        this.ctx = null; this.master = null; this.available = false; return false;
      }
    }
    if (this.ctx.state === 'suspended'){
      const p = this.ctx.resume();
      if (p && typeof p.catch === 'function') p.catch(function(){});
    }
    return true;
  },

  setMuted(m){
    this.muted = !!m;
    if (this.master) this.master.gain.value = this.muted ? 0 : CFG.masterGain;
  },

  /* rate limiter so a burst of identical events cannot machine-gun (AUD-06) */
  gate(key, gap){
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const prev = this.lastAt[key];
    if (prev !== undefined && now - prev < gap * 1000) return false;
    this.lastAt[key] = now;
    return true;
  },

  tone(f0, f1, dur, type, vol, delay){
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + CFG.toneAttack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + CFG.toneTail);
  },

  noise(dur, vol, delay){
    if (!this.ctx || this.muted || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = CFG.noiseCutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t0); s.stop(t0 + dur + CFG.toneTail);
  },

  /* detuned pair = the "pad" voice used by the slow-mo bubble */
  pad(f, dur, vol, detune){
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    for (let i = 0; i < 2; i++){
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      o.detune.setValueAtTime(i ? detune : -detune, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol * 0.5, t0 + dur * 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + CFG.toneTail);
    }
  },

  /* ---- events ---- */
  bounce(combo){                                   // AUD-03 pentatonic ladder
    const steps = CFG.pentatonic;
    const semi = steps[Math.max(0, Math.min(combo - 1, steps.length - 1))];
    const f = CFG.rootFreq * Math.pow(2, semi / 12);
    this.tone(f, f, 0.1, 'triangle', 0.45);
    this.tone(f * 2, f * 2, 0.06, 'sine', 0.14);
  },
  miss(){ this.tone(130, 80, 0.07, 'square', 0.2); },
  wall(){ if (this.gate('wall', CFG.throttleWall)) this.tone(170, 150, 0.05, 'sine', 0.12); },
  star(){ this.tone(784, 784, 0.08, 'sine', 0.35); this.tone(1046, 1046, 0.1, 'sine', 0.35, 0.08); },
  shieldPickup(){ this.tone(392, 587, 0.16, 'triangle', 0.4); },
  shieldPop(){ this.tone(500, 110, 0.22, 'sawtooth', 0.4); this.noise(0.18, 0.3); },
  die(){ this.tone(260, 55, 0.55, 'sawtooth', 0.5); this.tone(130, 40, 0.6, 'square', 0.25, 0.05); this.noise(0.45, 0.35); },
  start(){ this.tone(330, 660, 0.18, 'triangle', 0.35); },
  pause(){ this.tone(440, 330, 0.09, 'sine', 0.22); },
  resume(){ this.tone(330, 440, 0.09, 'sine', 0.22); },

  nearMiss(){ if (this.gate('near', CFG.throttleNearMiss)) this.tone(880, 1320, 0.07, 'sine', 0.2); },

  spikeWarn(){ if (this.gate('warn', CFG.throttleWarn)) this.tone(620, 620, 0.06, 'square', 0.16); },
  spikeDrop(){ this.tone(300, 90, 0.2, 'sawtooth', 0.26); this.noise(0.1, 0.14); },

  seekerWarn(){ if (this.gate('seek', CFG.throttleSeeker)) this.tone(240, 300, 0.18, 'square', 0.16); },
  seekerDie(){ this.tone(700, 160, 0.18, 'square', 0.24); this.noise(0.14, 0.2); },

  slowmo(){ this.pad(196, 1.1, 0.3, 14); this.tone(587, 587, 0.14, 'sine', 0.16, 0.02); },
  slowmoEnd(){ this.tone(392, 523, 0.12, 'sine', 0.14); },
  magnet(){ this.tone(523, 784, 0.14, 'triangle', 0.3); this.tone(659, 988, 0.12, 'sine', 0.16, 0.06); },
  heavy(){ this.tone(180, 120, 0.24, 'sawtooth', 0.3); this.noise(0.16, 0.18); this.tone(1046, 1046, 0.08, 'sine', 0.2, 0.02); },

  /* Phase 4 */
  achievement(){ this.tone(659, 659, 0.09, 'triangle', 0.32); this.tone(880, 880, 0.09, 'triangle', 0.3, 0.09); this.tone(1318, 1318, 0.16, 'sine', 0.26, 0.18); },
  copy(){ this.tone(988, 1480, 0.07, 'sine', 0.22); },
  climb(){ this.tone(262, 392, 0.12, 'triangle', 0.3); this.tone(392, 523, 0.14, 'triangle', 0.26, 0.1); },
};
