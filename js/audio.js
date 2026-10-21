'use strict';

const SFX = {
  ctx: null,
  muted: false,

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  tone(freq, dur = 0.15, type = 'sine', vol = 0.2, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  noise(dur = 0.08, vol = 0.25, delay = 0, hp = 1200) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hp;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
  },

  play(name) {
    switch (name) {
      case 'flick': this.noise(0.07, 0.3); break;
      case 'draw': this.noise(0.09, 0.18, 0, 700); break;
      case 'shuffle': for (let i = 0; i < 6; i++) this.noise(0.05, 0.2, i * 0.07); break;
      case 'turn': this.tone(880, 0.12, 'sine', 0.12); break;
      case 'click': this.tone(660, 0.05, 'sine', 0.1); break;
      case 'uno': [523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.22, i * 0.09)); break;
      case 'penalty': this.tone(140, 0.3, 'square', 0.18); this.tone(110, 0.3, 'square', 0.14, 0.05); break;
      case 'error': this.tone(180, 0.12, 'sawtooth', 0.12); break;
      case 'catch': this.tone(330, 0.12, 'square', 0.2); this.tone(262, 0.16, 'square', 0.2, 0.1); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, i * 0.12)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, i * 0.15)); break;
    }
  },
};
