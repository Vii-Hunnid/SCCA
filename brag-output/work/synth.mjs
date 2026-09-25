// Original score + SFX for the SCCA brag video. 120 BPM, A minor. Writes audio.wav (44.1k stereo).
import { writeFileSync } from 'node:fs';

const SR = 44100, DUR = 22.0, N = Math.round(SR * DUR);
const dry = [new Float32Array(N), new Float32Array(N)];
const send = [new Float32Array(N), new Float32Array(N)];   // -> reverb
const duckable = [new Float32Array(N), new Float32Array(N)]; // pad/bass, sidechained to kick
const kickEnv = new Float32Array(N);

let seed = 12345;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rand() * 2 - 1;
const S = (t) => Math.round(t * SR);

function add(bus, i, l, r) { if (i >= 0 && i < N) { bus[0][i] += l; bus[1][i] += r; } }
function place(bus, t0, len, fn, gain = 1, pan = 0, sendAmt = 0) {
  const i0 = S(t0), n = S(len);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
  for (let k = 0; k < n; k++) {
    const v = fn(k / SR, k);
    add(bus, i0 + k, v * gl, v * gr);
    if (sendAmt) add(send, i0 + k, v * gl * sendAmt, v * gr * sendAmt);
  }
}

// ---------- instruments ----------
function kick(t0, g = 0.9) {
  let ph = 0;
  place(dry, t0, 0.45, (t) => {
    const f = 45 + 85 * Math.exp(-t * 28);
    ph += 2 * Math.PI * f / SR;
    return Math.sin(ph) * Math.exp(-t * 7.5) + (t < 0.004 ? noise() * 0.3 * (1 - t / 0.004) : 0);
  }, g);
  for (let k = 0; k < S(0.25); k++) { const i = S(t0) + k; if (i < N) kickEnv[i] = Math.max(kickEnv[i], Math.exp(-k / SR * 14)); }
}
function hat(t0, g = 0.07, pan = 0.25) {
  let prev = 0;
  place(dry, t0, 0.06, (t) => { const x = noise(); const y = x - prev; prev = x; return y * Math.exp(-t * 70); }, g, pan, 0.15);
}
function clap(t0, g = 0.16) {
  let lp = 0;
  place(dry, t0, 0.25, (t) => {
    const x = noise(); lp += 0.35 * (x - lp);
    const env = (t < 0.01 ? 1 : 0) * Math.exp(-((t * 1000) % 10) / 3) * 0.6 + Math.exp(-t * 18);
    return (x - lp) * env;
  }, g, 0, 0.5);
}
function bass(t0, f, dur, g = 0.32) {
  let ph = 0, lp = 0;
  place(duckable, t0, dur, (t) => {
    ph += f / SR;
    const saw = 2 * (ph % 1) - 1;
    lp += 0.06 * (saw - lp);
    const env = Math.min(1, t / 0.008) * Math.exp(-t * 2.2) * Math.min(1, (dur - t) / 0.02);
    return (lp * 0.8 + Math.sin(2 * Math.PI * f * t) * 0.6) * env;
  }, g);
}
function pad(freqs, t0, dur, g = 0.05) {
  const voices = freqs.flatMap((f) => [f * 0.997, f, f * 1.004]);
  const ph = voices.map(() => rand());
  let lp1 = 0, lp2 = 0;
  place(duckable, t0, dur, (t) => {
    let s = 0;
    for (let v = 0; v < voices.length; v++) { ph[v] += voices[v] / SR; s += 2 * (ph[v] % 1) - 1; }
    const cut = 0.035 + 0.02 * Math.sin(t * 1.3);
    lp1 += cut * (s - lp1); lp2 += cut * (lp1 - lp2);
    const env = Math.min(1, t / 0.5) * Math.min(1, (dur - t) / 0.6);
    return lp2 * env / voices.length * 3;
  }, g, 0, 0.8);
}
function pluck(f, t0, g = 0.07, pan = 0) {
  place(dry, t0, 0.5, (t) => (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 20)) * Math.exp(-t * 9) * Math.min(1, t / 0.002), g, pan, 0.7);
}
function tick(f, t0, g = 0.05, pan = 0) {
  place(dry, t0, 0.05, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 90) * Math.min(1, t / 0.001), g, pan, 0.5);
}
function click(t0, g = 0.25) {
  place(dry, t0, 0.03, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 2200 * t)) * Math.exp(-t * 260), g, 0, 0.3);
}
function sweep(t0, dur, f0, f1, g, q = 0.5, shape = (x) => Math.sin(Math.PI * x)) {
  // state-variable bandpass over noise with an exponential cutoff sweep
  let low = 0, band = 0;
  place(dry, t0, dur, (t) => {
    const x = t / dur, fc = f0 * Math.pow(f1 / f0, x);
    const F = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR);
    const hp = noise() - low - q * band; band += F * hp; low += F * band;
    return band * shape(x);
  }, g, 0, 0.9);
}
function impact(t0, g = 0.8) {
  let ph = 0;
  place(dry, t0, 1.6, (t) => { const f = 38 + 60 * Math.exp(-t * 12); ph += 2 * Math.PI * f / SR; return Math.sin(ph) * Math.exp(-t * 2.8); }, g);
  sweep(t0, 0.6, 3000, 300, 0.25, 0.6, (x) => Math.exp(-x * 6));
  for (let k = 0; k < S(0.4); k++) { const i = S(t0) + k; if (i < N) kickEnv[i] = Math.max(kickEnv[i], Math.exp(-k / SR * 6)); }
}
function glitch(t0, dur, g = 0.12, base = 440) {
  let ph = 0, f = base, hold = 0;
  place(dry, t0, dur, (t, k) => {
    if (k >= hold) { f = base * [1, 1.5, 2, 0.5, 1.189, 3][Math.floor(rand() * 6)]; hold = k + S(0.018 + rand() * 0.02); }
    ph += f / SR;
    const sq = (ph % 1) < 0.5 ? 1 : -1;
    const crushed = Math.round((sq * 0.6 + noise() * 0.4) * 4) / 4;
    return crushed * Math.min(1, (dur - t) / 0.02) * Math.min(1, t / 0.003);
  }, g, 0, 0.4);
}
function alert(t0, g = 0.09) {
  const tri = (p) => 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25));
  place(dry, t0, 0.34, (t) => { const f = t < 0.14 ? 880 : 659.25; return tri(f * t) * Math.exp(-((t % 0.14) * 14)) * Math.min(1, t / 0.004); }, g, 0, 0.6);
}

// ---------- arrangement ----------
const A = { A1: 55, F1: 43.65, C2: 65.41, G1: 49.0 };
const CH = [
  { b: A.A1, pad: [220, 261.63, 329.63], arp: [440, 523.25, 659.25, 523.25] },
  { b: A.F1, pad: [174.61, 220, 261.63], arp: [349.23, 440, 523.25, 440] },
  { b: A.C2, pad: [196, 261.63, 329.63], arp: [392, 523.25, 659.25, 523.25] },
  { b: A.G1, pad: [196, 246.94, 293.66], arp: [392, 493.88, 587.33, 493.88] },
];
const PENTA = [880, 1046.5, 1174.66, 1318.51, 1567.98];

// intro: pad bed under the typing
pad([220, 329.63, 440], 0, 2.2, 0.10);
for (let c = 0; c < 35; c += 2) tick(PENTA[(c * 3) % 5], 0.12 + c * (0.95 / 35), 0.08, c % 4 ? 0.3 : -0.3);
// scramble
glitch(1.7, 0.42, 0.17, 440);
sweep(1.55, 0.5, 400, 6000, 0.2);
// drop at 2.0
impact(2.0, 0.55);

const DRUMS_END = 20.0;
for (let bar = 1; bar < 10; bar++) {
  const t0 = bar * 2, ch = CH[(bar - 1) % 4];
  if (t0 >= 20) break;
  pad(ch.pad, t0, 2.05, 0.05);
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * 0.5;
    if (tb >= DRUMS_END) break;
    const gap = tb >= 16.75 && tb < 17.0;   // the "Gone." breath
    if (!gap && tb >= 2.0) kick(tb, tb < 3.5 ? 0.5 : 0.62);
    if (tb >= 3.5 && !gap) {
      hat(tb + 0.25);
      if (b % 2 === 1) clap(tb, 0.13);
    }
    if (!gap) {
      bass(tb, ch.b, 0.24);
      bass(tb + 0.25, ch.b * (b === 3 ? 1.5 : 2), 0.22, 0.22);
    }
    if (tb >= 3.5 && !(tb >= 16.5 && tb < 17.0)) {
      pluck(ch.arp[b], tb + 0.25, 0.045, b % 2 ? 0.4 : -0.4);
    }
  }
}
// scene transitions: soft whooshes into each cut
for (const tc of [3.52, 6.52, 10.52, 14.52, 19.02]) sweep(tc - 0.35, 0.55, 300, 5000, 0.10, 0.7);
// reveal sparkle
[0, 1, 2, 3].forEach((k) => pluck([880, 1046.5, 1318.51, 1760][k], 3.62 + k * 0.08, 0.035, k % 2 ? 0.5 : -0.5));
// streaming tokens
for (let k = 0; k < 22; k++) tick(PENTA[Math.floor(rand() * 5)] * 2, 8.0 + k * 0.078, 0.02, rand() - 0.5);
// scene 4: bars land, riser, "One row." impact
for (let c = 0; c < 9; c++) pluck(PENTA[c % 5] * (c < 5 ? 1 : 2), 11.55 + c * 0.05, 0.03, (c / 8) - 0.5);
sweep(12.05, 0.7, 200, 8000, 0.10, 0.4, (x) => x * x);
impact(12.75, 0.6);
// scene 5: click edit, alert, click confirm, glitch-out
click(15.4); alert(15.55);
click(16.6);
glitch(16.75, 0.22, 0.10, 220); glitch(16.83, 0.2, 0.08, 330); glitch(16.91, 0.22, 0.09, 165);
impact(17.0, 0.35);
// outro: terminal ticks, final hit + ringing Am
for (let c = 0; c < 12; c++) tick(PENTA[c % 5], 19.1 + c * 0.05, 0.028);
impact(20.1, 0.6);
pad([110, 220, 261.63, 329.63, 440], 20.0, 2.0, 0.06);
pluck(440, 20.1, 0.06); pluck(659.25, 20.18, 0.05, 0.3); pluck(880, 20.26, 0.04, -0.3);

// ---------- mix ----------
// sidechain duck
for (let i = 0; i < N; i++) {
  const d = 1 - 0.45 * kickEnv[i];
  dry[0][i] += duckable[0][i] * d; dry[1][i] += duckable[1][i] * d;
  send[0][i] += duckable[0][i] * d * 0.35; send[1][i] += duckable[1][i] * d * 0.35;
}
// Schroeder reverb on the send bus
function reverb(inp, combs, aps) {
  const out = new Float32Array(N);
  for (const [len, fb] of combs) {
    const buf = new Float32Array(len); let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[idx]; lp += 0.3 * (y - lp); buf[idx] = inp[i] + lp * fb; out[i] += y; idx = (idx + 1) % len; }
  }
  for (const len of aps) {
    const buf = new Float32Array(len); let idx = 0;
    for (let i = 0; i < N; i++) { const b = buf[idx]; const x = out[i]; const y = -x + b; buf[idx] = x + b * 0.5; out[i] = y; idx = (idx + 1) % len; }
  }
  return out;
}
const rvL = reverb(send[0], [[1557, .82], [1617, .82], [1491, .82], [1422, .82]], [225, 556, 441]);
const rvR = reverb(send[1], [[1580, .82], [1640, .82], [1514, .82], [1445, .82]], [248, 579, 464]);
const L = new Float32Array(N), R = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = dry[0][i] + rvL[i] * 0.09; R[i] = dry[1][i] + rvR[i] * 0.09;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
// gentle bus glue: soft clip, fade tail, normalize to -1 dBFS
const pre = 1.1 / peak;
let p2 = 0;
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / S(0.4));
  L[i] = Math.tanh(L[i] * pre * 1.4) * fade; R[i] = Math.tanh(R[i] * pre * 1.4) * fade;
  p2 = Math.max(p2, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / p2;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
}
writeFileSync(new URL('./audio.wav', import.meta.url), buf);
console.log('audio.wav written', DUR, 's');
