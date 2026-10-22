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

/* Procedural background music — a laid-back lounge loop, generated live with
   Web Audio so the game still needs zero audio files and works offline. */
const Music = {
  KEY: 'xunox-music-v1',
  enabled: false,
  playing: false,
  master: null,
  timer: null,
  step: 0,
  nextTime: 0,
  bpm: 92,

  chords: [
    { bass: 'C2', notes: ['C3', 'E3', 'G3', 'B3'] },
    { bass: 'A2', notes: ['A2', 'C3', 'E3', 'G3'] },
    { bass: 'D2', notes: ['D3', 'F3', 'A3', 'C4'] },
    { bass: 'G2', notes: ['G3', 'B3', 'D4', 'F4'] },
    { bass: 'F2', notes: ['F3', 'A3', 'C4', 'E4'] },
    { bass: 'E2', notes: ['E3', 'G3', 'B3', 'D4'] },
    { bass: 'D2', notes: ['D3', 'F3', 'A3', 'C4'] },
    { bass: 'G2', notes: ['G3', 'B3', 'D4', 'F4'] },
  ],

  melody: [
    [0, 'E4', 0.45], [4, 'G4', 0.45],
    [8, 'A4', 0.45], [12, 'C5', 0.55],
    [16, 'D5', 0.45], [20, 'C5', 0.3], [22, 'A4', 0.35],
    [24, 'B4', 0.45], [28, 'D5', 0.45],
    [32, 'E5', 0.6], [36, 'D5', 0.3], [38, 'C5', 0.3],
    [40, 'A4', 0.5], [44, 'G4', 0.35],
    [48, 'E4', 0.45], [52, 'G4', 0.3], [54, 'A4', 0.3],
    [56, 'B4', 0.45], [60, 'D5', 0.45],
  ],

  load() {
    try { return localStorage.getItem(this.KEY) === '1'; } catch (e) { return false; }
  },
  save(on) {
    try { localStorage.setItem(this.KEY, on ? '1' : '0'); } catch (e) {}
  },

  nf(note) {
    const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const m = note.match(/^([A-G])(#?)(\d)$/);
    const semi = NAMES[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12;
    return 440 * Math.pow(2, (semi - 69) / 12);
  },

  start() {
    const ctx = SFX.ensure();
    if (!ctx || this.playing) return;
    this.playing = true;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.5);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 200);
  },

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const m = this.master;
    const ctx = SFX.ctx;
    if (m && ctx) {
      m.gain.cancelScheduledValues(ctx.currentTime);
      m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
      m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(() => { try { m.disconnect(); } catch (e) {} }, 700);
    }
    this.master = null;
  },

  toggle() {
    this.enabled = !this.enabled;
    this.save(this.enabled);
    if (this.enabled) this.start();
    else this.stop();
    return this.enabled;
  },

  schedule() {
    if (!this.playing || !SFX.ctx) return;
    const ctx = SFX.ctx;
    const stepDur = 30 / this.bpm;
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 1.0) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % 64;
      this.nextTime += stepDur;
    }
  },

  playStep(step, t, stepDur) {
    const bar = Math.floor(step / 8);
    const s = step % 8;
    const swing = s % 2 === 1 ? stepDur * 0.28 : 0;
    const ch = this.chords[bar];

    if (s === 0 || s === 4) this.kick(t);
    if (s === 2 || s === 6) this.snare(t + swing);
    this.hat(t + swing, s % 2 === 1 ? 0.035 : 0.02);

    if (s === 0) this.bass(t, ch.bass, stepDur * 3.4);
    if (s === 4) this.bass(t, ch.bass, stepDur * 1.8, 0.7);
    if (s === 3 || s === 6) this.comp(t + swing, ch.notes, stepDur * 1.6);

    const m = this.melody.find(([ms]) => ms === step);
    if (m && Math.random() > 0.12) this.lead(t + swing, m[1], m[2]);
  },

  bass(t, note, dur, vol = 1) {
    const ctx = SFX.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = this.nf(note);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.17 * vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.1);
  },

  comp(t, notes, dur) {
    const ctx = SFX.ctx;
    for (const n of notes) {
      for (const det of [-3, 3]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = this.nf(n);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.028, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
    }
  },

  lead(t, note, dur) {
    const ctx = SFX.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = this.nf(note) * (Math.random() < 0.15 ? 2 : 1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.055, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.1);
  },

  kick(t) {
    const ctx = SFX.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.25);
  },

  snare(t) { this.brush(t, 0.14, 0.045, 1700); },
  hat(t, vol) { this.brush(t, 0.035, vol, 7000); },

  brush(t, dur, vol, hp) {
    const ctx = SFX.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  },
};
