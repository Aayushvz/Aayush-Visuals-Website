/*
  City of Creators — sound and music synthesiser.

  Synthesises footsteps, discovery chimes, multiple music tracks, and
  authentic retro Game Boy SFX (beeps, confirms, warps) using Web Audio API
  oscillators and buffers, plus the original theme stream.
*/

export type Surface = "stone" | "grass" | "road";

export type TrackInfo = {
  id: number;
  title: string;
  kind: string;
};

export const TRACKS: TrackInfo[] = [
  { id: 0, title: "City Skyline", kind: "Original Chiptune Theme" },
  { id: 1, title: "Cyber Arcade 8-Bit", kind: "Synthesised FM Chiptune" },
  { id: 2, title: "Midnight Lo-Fi Beat", kind: "Generative Chill Synth" },
];

export class CityAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private music: HTMLAudioElement | null = null;
  private musicGain: GainNode | null = null;
  private lastStep = 0;
  private releaseWake: (() => void) | null = null;
  muted = false;

  currentTrack = 0;
  private synthLoopId = 0;
  private synthOscs: OscillatorNode[] = [];
  private volumeLevel = 0.5;

  init() {
    if (this.ctx) return;
    type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext || (window as WithWebkit).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    this.ctx = ctx;

    const wake = () => {
      void ctx.resume();
      this.wakeMusic();
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", wake);
    };
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", wake);
    this.releaseWake = () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", wake);
    };

    const master = ctx.createGain();
    master.gain.value = this.volumeLevel;
    master.connect(ctx.destination);
    this.master = master;

    const frames = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;

    this.startAmbience();
    this.startMusic();
    this.wakeMusic();
  }

  private startMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;

    const el = document.createElement("audio");
    el.loop = true;
    el.preload = "none";
    el.crossOrigin = "anonymous";

    const ogg = document.createElement("source");
    ogg.src = "/playground/audio/city-theme.ogg";
    ogg.type = "audio/ogg; codecs=opus";
    const m4a = document.createElement("source");
    m4a.src = "/playground/audio/city-theme.m4a";
    m4a.type = "audio/mp4";
    el.appendChild(ogg);
    el.appendChild(m4a);

    const gain = ctx.createGain();
    gain.gain.value = 0.34;
    gain.connect(this.master);
    this.musicGain = gain;

    try {
      ctx.createMediaElementSource(el).connect(gain);
    } catch {
      el.volume = 0.34;
      gain.disconnect();
      this.musicGain = null;
    }

    el.setAttribute("aria-hidden", "true");
    el.style.display = "none";
    document.body.appendChild(el);

    this.music = el;
  }

  private wakeMusic() {
    if (this.currentTrack === 0) {
      const el = this.music;
      if (!el || this.muted) return;
      el.load();
      void el.play().catch(() => {});
    } else {
      this.startSynthesizedTrack(this.currentTrack);
    }
  }

  setTrack(index: number) {
    this.currentTrack = (index + TRACKS.length) % TRACKS.length;
    this.stopSynthesizer();
    if (this.currentTrack === 0) {
      if (!this.muted) {
        void this.ctx?.resume();
        void this.music?.play().catch(() => {});
      }
    } else {
      this.music?.pause();
      if (!this.muted) {
        void this.ctx?.resume();
        this.startSynthesizedTrack(this.currentTrack);
      }
    }
    this.playSelect();
  }

  nextTrack() {
    this.setTrack(this.currentTrack + 1);
  }

  prevTrack() {
    this.setTrack(this.currentTrack - 1);
  }

  private stopSynthesizer() {
    if (this.synthLoopId) {
      window.clearInterval(this.synthLoopId);
      this.synthLoopId = 0;
    }
    for (const osc of this.synthOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.synthOscs = [];
  }

  /* 8-bit generative retro loops */
  private startSynthesizedTrack(track: number) {
    this.stopSynthesizer();
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;

    if (track === 1) {
      // 8-bit Chiptune Arpeggios
      const notes = [261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66];
      let step = 0;

      this.synthLoopId = window.setInterval(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(notes[step % notes.length], t);

        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

        osc.connect(g).connect(this.master!);
        osc.start(t);
        osc.stop(t + 0.18);
        step++;
      }, 160);
    } else if (track === 2) {
      // Lo-Fi Warm Ambient Progression
      const chords = [
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [164.81, 196.0, 246.94, 293.66], // Em7
        [146.83, 174.61, 220.0, 261.63], // Dm7
        [130.81, 164.81, 196.0, 246.94], // Cmaj7
      ];
      let chordIdx = 0;

      this.synthLoopId = window.setInterval(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const currentChord = chords[chordIdx % chords.length];

        for (const freq of currentChord) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 650;

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t);

          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.04, t + 0.3);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

          osc.connect(filter).connect(g).connect(this.master!);
          osc.start(t);
          osc.stop(t + 2.0);
        }
        chordIdx++;
      }, 2000);
    }
  }

  /* Sound effects */
  playBeep() {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playSelect() {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      g.gain.setValueAtTime(0.08, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.08);
      osc.connect(g).connect(this.master!);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.1);
    });
  }

  playWarp() {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime;
    [300, 450, 600, 900, 1200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + i * 0.04);
      g.gain.setValueAtTime(0.1, t + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.04 + 0.12);
      osc.connect(g).connect(this.master!);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.14);
    });
  }

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

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 2.5);
  }

  step(surface: Surface, now: number, running: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.master || this.muted) return;

    const interval = running ? 230 : 350;
    if (now - this.lastStep < interval) return;
    this.lastStep = now;

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
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

  discover() {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime;
    [660, 880, 1100].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.08);
      g.gain.linearRampToValueAtTime(0.16, t + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.45);
      osc.connect(g).connect(this.master!);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.5);
    });
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : this.volumeLevel, this.ctx.currentTime, 0.05);
    }
    if (!m) {
      void this.ctx?.resume();
      this.wakeMusic();
    } else {
      this.music?.pause();
      this.stopSynthesizer();
    }
  }

  setVolume(vol: number) {
    this.volumeLevel = Math.max(0, Math.min(1, vol));
    if (this.master && this.ctx && !this.muted) {
      this.master.gain.setTargetAtTime(this.volumeLevel, this.ctx.currentTime, 0.05);
    }
  }

  destroy() {
    this.stopSynthesizer();
    this.music?.pause();
    this.music?.remove();
    this.music = null;
    this.musicGain = null;
    this.releaseWake?.();
    this.releaseWake = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.ambientGain = null;
    this.noise = null;
  }
}
