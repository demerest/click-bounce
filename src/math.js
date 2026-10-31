/* math.js — tiny pure helpers. No state, no DOM. */

export const TAU = Math.PI * 2;

export function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }

export function rand(a, b){ return a + Math.random() * (b - a); }

/* shortest-arc angle interpolation (used for stretch orientation, PHYS-04) */
export function lerpAngle(a, b, t){
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

/* rotate `a` toward `b` by at most `maxStep` radians — capped turn rate for the seeker */
export function turnToward(a, b, maxStep){
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + clamp(d, -maxStep, maxStep);
}

/* frame-rate independent exponential decay */
export function decay(v, rate, dt){ return v * Math.exp(-rate * dt); }

/* move v toward target by a 0..1 fraction */
export function approach(v, target, t){ return v + (target - v) * clamp(t, 0, 1); }
