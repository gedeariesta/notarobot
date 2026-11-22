// Short, dry synthesized sounds (Web Audio API). Nothing is loaded from files.
import { prefs } from './state.js';

let ctx = null;
let muted = prefs.muted;

function ac() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone({ freq = 440, to = null, type = 'sine', dur = 0.08, gain = 0.15, delay = 0 }) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur = 0.06, gain = 0.2, filter = 1200, delay = 0 }) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filter;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const sound = {
  get muted() {
    return muted;
  },
  setMuted(v) {
    muted = !!v;
    prefs.muted = muted;
    if (muted && ctx) ctx.suspend?.();
  },
  /** Call from a user gesture so mobile browsers allow audio. */
  unlock() {
    ac();
  },
  click: () => { noise({ dur: 0.03, gain: 0.25, filter: 3000 }); tone({ freq: 1800, dur: 0.03, gain: 0.05, type: 'square' }); },
  key: () => tone({ freq: 2400 + Math.random() * 300, dur: 0.015, gain: 0.012, type: 'square' }),
  tick: () => tone({ freq: 1320, dur: 0.04, gain: 0.06, type: 'triangle' }),
  clunk: () => { noise({ dur: 0.12, gain: 0.5, filter: 400 }); tone({ freq: 110, to: 60, dur: 0.14, gain: 0.25 }); },
  thud: () => { noise({ dur: 0.18, gain: 0.6, filter: 260 }); tone({ freq: 80, to: 45, dur: 0.2, gain: 0.35 }); },
  chime: () => { [880, 1108.7, 1318.5].forEach((f, i) => tone({ freq: f, dur: 0.6, gain: 0.07, delay: i * 0.07 })); },
  buzz: () => tone({ freq: 140, dur: 0.22, gain: 0.08, type: 'sawtooth' }),
  timer: () => tone({ freq: 980, dur: 0.05, gain: 0.05, type: 'square' }),
  flood: () => { noise({ dur: 0.38, gain: 0.12, filter: 700 }); tone({ freq: 90, to: 160, dur: 0.35, gain: 0.05 }); },
  glitch: () => { for (let i = 0; i < 5; i++) tone({ freq: 200 + Math.random() * 1600, dur: 0.03, gain: 0.04, type: 'square', delay: i * 0.04 }); },
};

export function vibrate(ms = 30) {
  try {
    // Browsers block vibration until the person has tapped the page.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
