// WebAudio-synthesized sound only: no audio files, no network.
// Engine hum, two-tone siren, gunshot noise burst, pickup chime.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c || muted) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  function noise(dur, vol, lowpass) {
    const c = ensure();
    if (!c || muted) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass || 1200;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() {
      muted = !muted;
      if (muted) { this.setEngine(0); this.siren(false); }
      return muted;
    },
    get muted() { return muted; },
    shoot() { noise(0.16, 0.5, 900); tone(160, 0.1, 'square', 0.18, 60); },
    chime() { tone(880, 0.12, 'sine', 0.25); setTimeout(() => tone(1320, 0.2, 'sine', 0.25), 110); },
    crash() { noise(0.3, 0.4, 500); },
    busted() { tone(440, 0.25, 'sawtooth', 0.25, 220); setTimeout(() => tone(330, 0.4, 'sawtooth', 0.25, 165), 220); },
    setEngine(speed01) {
      const c = ensure();
      if (!c) return;
      if (muted || speed01 <= 0.01) {
        if (engineOsc) { try { engineOsc.stop(); } catch {} engineOsc = null; }
        return;
      }
      if (!engineOsc) {
        engineOsc = c.createOscillator();
        engineGain = c.createGain();
        engineOsc.type = 'sawtooth';
        engineGain.gain.value = 0.03;
        const f = c.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 500;
        engineOsc.connect(f).connect(engineGain).connect(c.destination);
        engineOsc.start();
      }
      engineOsc.frequency.setValueAtTime(55 + speed01 * 130, c.currentTime);
      engineGain.gain.setValueAtTime(0.02 + speed01 * 0.05, c.currentTime);
    },
    siren(on) {
      const c = ensure();
      if (!c) return;
      if (!on || muted) {
        if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; }
        if (sirenOsc) { try { sirenOsc.stop(); } catch {} sirenOsc = null; }
        return;
      }
      if (sirenOsc) return;
      sirenOsc = c.createOscillator();
      sirenGain = c.createGain();
      sirenOsc.type = 'triangle';
      sirenGain.gain.value = 0.035;
      sirenOsc.connect(sirenGain).connect(c.destination);
      sirenOsc.start();
      let hi = false;
      sirenTimer = setInterval(() => {
        if (!sirenOsc) return;
        hi = !hi;
        sirenOsc.frequency.setValueAtTime(hi ? 960 : 720, c.currentTime);
      }, 380);
    },
  };
}
