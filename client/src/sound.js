// WebAudio sound engine (ported/condensed from the original single-player game).
class SFX {
  constructor() { this.ctx = null; this.on = loadPref(); }
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* unsupported */ } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  setOn(v) { this.on = v; try { localStorage.setItem('blackjack:sound', v ? '1' : '0'); } catch { /* ignore */ } }
  _noise(d, v = 0.14) {
    if (!this.ctx) return null;
    const r = this.ctx.sampleRate; const b = this.ctx.createBuffer(1, r * d, r); const a = b.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * v; return b;
  }
  _tone(freq, dur, type = 'sine', gain = 0.08, at = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + at; const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  card() {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime; const b = this._noise(0.07, 0.18); if (!b) return;
    const s = this.ctx.createBufferSource(); s.buffer = b; const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    s.connect(f); f.connect(g); g.connect(this.ctx.destination); s.start(t); s.stop(t + 0.07);
  }
  chip() { this._tone(3200, 0.1, 'square', 0.1); this._tone(6400, 0.08, 'sine', 0.05, 0.005); }
  btn() { this._tone(800, 0.05, 'sine', 0.05); }
  shuffle() {
    if (!this.ctx || !this.on) return;
    for (let i = 0; i < 10; i++) {
      const b = this._noise(0.05, 0.1); if (!b) continue; const t = this.ctx.currentTime + i * 0.035;
      const s = this.ctx.createBufferSource(); s.buffer = b; const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200 + Math.random() * 2500;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      s.connect(f); f.connect(g); g.connect(this.ctx.destination); s.start(t); s.stop(t + 0.06);
    }
  }
  win() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.35, 'sine', 0.1, i * 0.12)); }
  lose() { [400, 340, 280].forEach((f, i) => this._tone(f, 0.4, 'sine', 0.07, i * 0.18)); }
  push() { this._tone(440, 0.3, 'sine', 0.06); }
}

function loadPref() { try { return localStorage.getItem('blackjack:sound') !== '0'; } catch { return true; } }

export const sfx = new SFX();
