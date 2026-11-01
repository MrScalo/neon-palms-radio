/**
 * The short burst of static you hear between two stations. Synthesised locally with the Web
 * Audio API: no files, no network. Purely decorative, so it never throws.
 */

/** Peak gain at full radio volume. Deliberately quiet: it sits under the music, not on top of it. */
const MAX_GAIN = 0.2;
const REDUCED_MOTION_FACTOR = 0.5;
const BURST_S = 0.26;
const ATTACK_S = 0.012;
const HOLD_S = 0.09;
/** Releases the audio device again once the dial has been quiet for a while. */
const IDLE_SUSPEND_MS = 2_000;

/** How loud the burst peaks: follows the radio volume, quieter with reduced motion, 0 for silence. */
export function staticPeakGain(volume: number, muted: boolean, reducedMotion: boolean): number {
  if (muted || !Number.isFinite(volume) || volume <= 0) return 0;
  const level = Math.min(100, volume) / 100;
  return MAX_GAIN * level * (reducedMotion ? REDUCED_MOTION_FACTOR : 1);
}

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let current: AudioBufferSourceNode | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise !== null && noise.sampleRate === ctx.sampleRate) return noise;
  const length = Math.ceil(ctx.sampleRate * BURST_S);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // White noise whose level jumps every few milliseconds, so it crackles instead of hissing evenly.
  const chunk = Math.max(1, Math.round(ctx.sampleRate * 0.008));
  let level = 1;
  for (let i = 0; i < length; i++) {
    if (i % chunk === 0) level = 0.4 + Math.random() * 0.6;
    data[i] = (Math.random() * 2 - 1) * level;
  }
  noise = buffer;
  return buffer;
}

function scheduleSuspend(ctx: AudioContext): void {
  if (idleTimer !== null) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (current === null) ctx.suspend().catch(() => {});
  }, IDLE_SUSPEND_MS);
}

/**
 * Plays one burst at `peakGain` (see staticPeakGain). Call it straight from the click or key
 * handler that switches the station: browsers only let a gesture start audio.
 */
export function playStaticBurst(peakGain: number): void {
  if (!(peakGain > 0) || typeof window === "undefined" || typeof window.AudioContext !== "function") return;
  try {
    context ??= new window.AudioContext({ latencyHint: "interactive" });
    const ctx = context;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    current?.stop();

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 400;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.8;
    const envelope = ctx.createGain();

    const t = ctx.currentTime;
    // The band slides down while the burst fades, like a needle sweeping across the dial.
    band.frequency.setValueAtTime(3_200, t);
    band.frequency.exponentialRampToValueAtTime(1_300, t + BURST_S);
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.exponentialRampToValueAtTime(peakGain, t + ATTACK_S);
    envelope.gain.setValueAtTime(peakGain, t + HOLD_S);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + BURST_S);

    source.connect(highpass).connect(band).connect(envelope).connect(ctx.destination);
    source.onended = () => {
      source.disconnect();
      highpass.disconnect();
      band.disconnect();
      envelope.disconnect();
      if (current === source) {
        current = null;
        scheduleSuspend(ctx);
      }
    };
    current = source;
    source.start(t);
    source.stop(t + BURST_S);
  } catch {
    // Static is a garnish: without Web Audio the station simply switches silently.
  }
}
