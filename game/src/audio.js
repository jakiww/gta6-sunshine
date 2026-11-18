// Sunshine City — all sound is synthesized with WebAudio.
// No audio files, no network: every effect is an oscillator or a
// filtered noise burst built at runtime.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.muted = false;
    this.sirenTimer = 0;
  }

  // Must be called from a user gesture (the Start button) — browsers
  // block AudioContext creation before that.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.35;
  }

  _tone(freq, duration, type, volume, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(volume || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  _noise(duration, volume, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = this.ctx.createGain();
    gain.gain.value = volume || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  click() { this._tone(660, 0.07, 'square', 0.12); }
  pickup() {
    this._tone(523, 0.1, 'sine', 0.22);
    setTimeout(() => this._tone(784, 0.16, 'sine', 0.22), 90);
  }
  cash() {
    this._tone(880, 0.09, 'triangle', 0.2);
    setTimeout(() => this._tone(1174, 0.09, 'triangle', 0.2), 80);
    setTimeout(() => this._tone(1568, 0.18, 'triangle', 0.2), 160);
  }
  gunshot() { this._noise(0.16, 0.5, 900); this._tone(160, 0.12, 'square', 0.25, 60); }
  crash() { this._noise(0.3, 0.4, 500); }
  door() { this._tone(220, 0.08, 'square', 0.15, 140); }
  fail() { this._tone(220, 0.35, 'sawtooth', 0.18, 110); }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'triangle', 0.22), i * 110));
  }

  // Two-tone police siren, called every frame while police are near.
  siren(dt, intensity) {
    if (!this.ctx || this.muted) return;
    this.sirenTimer -= dt;
    if (this.sirenTimer > 0) return;
    this.sirenTimer = 0.45;
    const high = Math.random() > 0.5;
    this._tone(high ? 950 : 700, 0.42, 'sine', 0.05 * intensity);
  }

  // Looping engine hum whose pitch follows speed. Call every frame.
  engine(speedRatio, driving) {
    if (!this.ctx) return;
    if (!driving) {
      if (this.engineOsc) {
        try { this.engineOsc.stop(); } catch (e) { /* already stopped */ }
        this.engineOsc = null;
        this.engineGain = null;
      }
      return;
    }
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.04;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    const freq = 55 + speedRatio * 130;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.03 + speedRatio * 0.05, this.ctx.currentTime, 0.1);
  }
}
