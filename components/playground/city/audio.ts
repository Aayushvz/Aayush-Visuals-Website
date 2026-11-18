/*
  City of Creators — sound, synthesised.

  Every sound here is generated from noise and oscillators at runtime, so
  the experiment still ships no audio files. A footstep on paving is a
  short click with a hard high end; the same step on grass is longer,
  quieter and much darker, because grass absorbs the top octaves. That
  difference is the whole point: you can hear when you leave the pavement.

  Nothing is created until the visitor presses Start — an AudioContext
  made before a gesture is born suspended and stays that way.
*/

export type Surface = "stone" | "grass" | "road";

export class CityAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastStep = 0;
  muted = false;

  /** called from the Start click, so the context begins running */
  init() {
    if (this.ctx) return;
    type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext || (window as WithWebkit).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    this.master = master;

    /* two seconds of white noise, reused for every step and for the
       ambience — generating noise per footstep would allocate a buffer
       several times a second for no audible gain */
    const frames = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;

    this.startAmbience();
  }

  /*
    City ambience: filtered noise for distant traffic, plus two detuned
    low oscillators for the hum a city always has under everything.
  */
  private startAmbience() {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.master) return;

    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    gain.connect(this.master);
    this.ambientGain = gain;

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    lp.Q.value = 0.4;

    src.connect(lp).connect(gain);
    src.start();

    for (const f of [52, 78]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      osc.connect(g).connect(gain);
      osc.start();
    }

    /* fade in, rather than appearing at full level the instant you start */
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 2.5);
  }

  /**
   * A footstep. `surface` changes the character; repeated calls inside the
   * step interval are ignored so this can be called every frame.
   */
  step(surface: Surface, now: number, running: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.master || this.muted) return;

    const interval = running ? 230 : 350;
    if (now - this.lastStep < interval) return;
    this.lastStep = now;

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    /* start somewhere random in the buffer so consecutive steps are not
       the identical waveform, which is what makes a loop sound like a loop */
    const offset = Math.random() * 1.5;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    let dur: number;
    let peak: number;

    if (surface === "grass") {
      filter.type = "lowpass";
      filter.frequency.value = 900;
      filter.Q.value = 0.7;
      dur = 0.1;
      peak = 0.1;
    } else if (surface === "road") {
      filter.type = "bandpass";
      filter.frequency.value = 2100;
      filter.Q.value = 1.1;
      dur = 0.05;
      peak = 0.085;
    } else {
      filter.type = "highpass";
      filter.frequency.value = 1500;
      filter.Q.value = 0.8;
      dur = 0.045;
      peak = 0.1;
    }

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

    src.connect(filter).connect(gain).connect(this.master);
    src.start(ctx.currentTime, offset, dur + 0.02);
    src.stop(ctx.currentTime + dur + 0.05);
  }

  /** the chime when a discovery opens */
  discover() {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime;
    /* a rising third — two notes is enough to read as "found something" */
    [660, 880].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.09);
      g.gain.linearRampToValueAtTime(0.14, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.42);
      osc.connect(g).connect(this.master!);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.5);
    });
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  destroy() {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.ambientGain = null;
    this.noise = null;
  }
}
