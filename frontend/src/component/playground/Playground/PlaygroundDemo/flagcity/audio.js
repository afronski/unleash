// One-shot sound effects. Browsers block audio before the first user gesture;
// play() rejections are swallowed, so early deaths are simply silent.
export class SoundFX {
  constructor(screamUrl) {
    this.screamUrl = screamUrl;
    this.scream = null;
    this.actx = null;
  }

  // Synthesized car horn — no asset needed. Real horns sound a two-note
  // chord (roughly F#4 + A4); two sawtooth oscillators through a lowpass
  // give the brassy timbre, with a quick attack and ~half-second sustain.
  beep() {
    try {
      if (!this.actx) this.actx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.actx.state === 'suspended') this.actx.resume().catch(() => {});
      const t0 = this.actx.currentTime;

      const gain = this.actx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.025);
      gain.gain.setValueAtTime(0.1, t0 + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.58);

      const filter = this.actx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1600;
      filter.Q.value = 1.5;

      filter.connect(gain).connect(this.actx.destination);
      for (const freq of [370, 440]) {
        const osc = this.actx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.connect(filter);
        osc.start(t0);
        osc.stop(t0 + 0.6);
      }
    } catch {
      // no audio available — fine
    }
  }

  playScream() {
    try {
      if (!this.scream) {
        this.scream = new Audio(this.screamUrl);
        this.scream.preload = 'auto';
      }
      const shot = this.scream.cloneNode(); // allow overlapping screams
      shot.volume = 0.55;
      shot.play().catch(() => {});
    } catch {
      // no audio support — fine
    }
  }
}
