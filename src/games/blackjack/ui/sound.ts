/**
 * Card sounds, made in the browser with the Web Audio API — no audio files.
 *
 * A dealt card is a short burst of noise run through a filter that sweeps
 * upward (the "fwip" of the card sliding across felt), plus a soft low thump
 * as it lands. Each card is varied slightly so a run of hits doesn't sound
 * like a machine gun.
 *
 * Browsers only allow sound after the visitor has clicked or pressed a key on
 * the page, so the audio engine starts on the first interaction.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  // Half a second of white noise, reused for every sound.
  noise = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Call from a click/keypress handler: browsers keep audio suspended until then. */
export function unlockAudio() {
  const c = audio();
  if (c && c.state === "suspended") void c.resume();
}

const jitter = (amount: number) => 1 + (Math.random() * 2 - 1) * amount;

/** Filtered noise burst. `from`→`to` is the filter sweep in Hz. */
function swish(c: AudioContext, t: number, dur: number, from: number, to: number, volume: number) {
  const src = c.createBufferSource();
  src.buffer = noise;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t, Math.random() * 0.3, dur + 0.02);
}

/** Low, short thump — the card landing on the felt. */
function thump(c: AudioContext, t: number, volume: number) {
  const src = c.createBufferSource();
  src.buffer = noise;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 260;
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t, Math.random() * 0.3, 0.07);
}

function ready(): AudioContext | null {
  if (!enabled) return null;
  const c = audio();
  return c && c.state === "running" && noise ? c : null;
}

/** A card sliding out of the shoe and landing. */
export function playDeal() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  const p = jitter(0.12);
  const dur = 0.11 * jitter(0.15);
  swish(c, t, dur, 1400 * p, 5200 * p, 0.55);
  thump(c, t + dur * 0.8, 0.85 * jitter(0.2));
}

/** The dealer turning over the hole card: two quick, crisp snaps. */
export function playFlip() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  swish(c, t, 0.045, 3000, 6500, 0.38);
  swish(c, t + 0.06, 0.05, 2400, 5200, 0.45);
}
