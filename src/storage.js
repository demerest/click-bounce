/* storage.js — localStorage, fully guarded (SCORE-06, COMPAT-01, DATA-01).
 * Private browsing / disabled storage must degrade silently, never throw.
 */

export const LS = {
  available: false,

  probe(){
    try {
      const k = '__keepup_probe';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      this.available = true;
    } catch (e){
      this.available = false;
    }
    return this.available;
  },

  get(k){
    try { return window.localStorage.getItem(k); } catch (e){ return null; }
  },

  set(k, v){
    try { window.localStorage.setItem(k, v); return true; } catch (e){ return false; }
  },

  num(k, dflt){
    const n = parseFloat(this.get(k));
    return isFinite(n) ? n : dflt;
  },

  bool(k, dflt){
    const v = this.get(k);
    return v === null ? dflt : v === '1';
  },
};
