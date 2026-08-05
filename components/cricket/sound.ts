/*
  Every sound in the game, synthesised at runtime.

  There are no audio files here on purpose. A bat crack, a stump clatter and
  a crowd swell are all short noise-and-envelope shapes, so generating them
  costs a few hundred bytes of code instead of a few hundred kilobytes of
  assets on a page most people will never open. It also means the sounds can
  respond to the shot: a six is the same synthesis as a single, brighter and
  louder.

  The context is created lazily on the first gesture. Browsers refuse to
  start audio before one, and the game's first interaction is a click anyway.
*/

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ctx.destination);
  return ctx;
}

/** call from a click/keydown handler before the first sound */
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === "suspended") void c.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.9, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

/* a short burst of white noise, reused by everything percussive */
function noiseBuffer(c: AudioContext, seconds: number) {
  const frames = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

type HitOpts = {
  /** 0 = mistimed and dull, 1 = middled and bright */
  quality: number;
};

/*
  Bat on ball. Two layers: a filtered noise transient for the crack, and a
  short pitched body underneath so it reads as wood rather than static. The
  filter opens and the body rises with quality, which is what makes a six
  sound different from a leading edge without a second sample.
*/
export function playHit({ quality }: HitOpts) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime;
  const q = Math.max(0, Math.min(1, quality));

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.12);

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 900 + q * 2600;
  bp.Q.value = 0.9;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35 + q * 0.5, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09 + q * 0.05);

  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.2);

  const body = c.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(150 + q * 130, t);
  body.frequency.exponentialRampToValueAtTime(70, t + 0.11);
  const bg = c.createGain();
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(0.18 + q * 0.22, t + 0.006);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  body.connect(bg).connect(master);
  body.start(t);
  body.stop(t + 0.2);
}

/* three or four wooden knocks in quick succession, slightly detuned */
export function playStumps() {
  const c = ensure();
  if (!c || !master) return;
  const t0 = c.currentTime;
  for (let i = 0; i < 4; i++) {
    const t = t0 + i * (0.035 + Math.random() * 0.03);
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(220 + Math.random() * 180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1800;
    osc.connect(lp).connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.16);
  }
}

/*
  Crowd. Bandpassed noise with a slow swell, which is close enough to a
  distant roar once it is under a bat crack. `size` scales both how loud it
  gets and how long it hangs around, so a four gets a murmur and a six gets
  the whole ground.
*/
export function playCrowd(size: number) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime;
  const s = Math.max(0, Math.min(1, size));
  const dur = 0.7 + s * 1.4;

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 700;
  bp.Q.value = 0.55;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05 + s * 0.16, t + 0.12 + s * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/* the bowler letting go: a very short airy tick, easy to miss and better
   for it. It exists to make the release moment feel like a moment. */
export function playRelease() {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.08);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2600;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src.connect(hp).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.1);
}
