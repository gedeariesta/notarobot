// Device storage. Everything is wrapped so the game still runs for one session
// when localStorage is blocked (private windows, previews).

const PREFIX = 'notarobot:';
const memory = new Map();

function read(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (v != null) return JSON.parse(v);
  } catch {
    if (memory.has(key)) return memory.get(key);
  }
  return memory.has(key) ? memory.get(key) : fallback;
}

function write(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: memory copy keeps the session going */
  }
}

/**
 * A namespace keeps demo-mode play apart from the real daily game. Scores never depend on what
 * other players said (DESIGN.md, Other players), so nothing here feeds back into scoring.
 * Shape: { rounds: { [roundKey]: Round }, streak: { count, last }, bounces: [{ promptId, input, at }] }
 */
export function createStore(ns) {
  const key = `${ns}:v2`;
  const data = read(key, null) || { rounds: {}, streak: null, bounces: [] };
  data.bounces = data.bounces || [];
  const save = () => write(key, data);
  return {
    get data() {
      return data;
    },
    getRound(k) {
      return data.rounds[k] || null;
    },
    putRound(k, round) {
      data.rounds[k] = round;
      save();
    },
    /** Demo mode logs bounced answers, so the team can find correct answers missing from a list. */
    logBounce(entry) {
      data.bounces.push(entry);
      if (data.bounces.length > 500) data.bounces.splice(0, data.bounces.length - 500);
      save();
    },
    get bounces() {
      return data.bounces;
    },
    get streak() {
      return data.streak;
    },
    setStreak(s) {
      data.streak = s;
      save();
    },
  };
}

export const prefs = {
  get muted() {
    return !!read('muted', false);
  },
  set muted(v) {
    write('muted', !!v);
  },
};

/** Clears every notarobot key on this device (demo-mode Reset). */
export function resetAll() {
  memory.clear();
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nothing stored */
  }
}
