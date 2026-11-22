// Scoring, normalization, validity, autocorrect, verdicts and badges.
// Pure functions only: shared by the browser and the Node unit tests.
import { BLOCKLIST_WORDS } from './blocklist.js';

export const TIERS = {
  meat:      { key: 'meat',      name: 'Meat Proxy',         points: 0,   emoji: '🥩', fill: '#C92A2A', text: '#C92A2A' },
  zombie:    { key: 'zombie',    name: 'Prompt Zombie',      points: 10,  emoji: '🧟', fill: '#E8590C', text: '#C2410C' },
  slopper:   { key: 'slopper',   name: 'Slopper',            points: 25,  emoji: '🥣', fill: '#F59F00', text: '#8A5A00' },
  delegator: { key: 'delegator', name: 'Decision Delegator', points: 50,  emoji: '🤷', fill: '#A9B4C2', text: '#4A5260' },
  firsthand: { key: 'firsthand', name: 'First-Hand Thinker', points: 75,  emoji: '🧠', fill: '#5C9DF5', text: '#1F4FBF' },
  reserved:  { key: 'reserved',  name: 'Human Reserved',     points: 100, emoji: '🫀', fill: '#6741D9', text: '#5B33C9' },
  smash:     { key: 'smash',     name: 'Keyboard Smash',     points: 0,   emoji: '⌨️', fill: '#1B1F24', text: '#1B1F24' },
  none:      { key: 'none',      name: 'No response',        points: 0,   emoji: '💤', fill: '#1B1F24', text: '#1B1F24' },
};

/** The six rarity layers of the Screening, top to bottom. */
export const LADDER = ['meat', 'zombie', 'slopper', 'delegator', 'firsthand', 'reserved'];
/** Share thresholds for the gates below Prompt Zombie, Slopper, Decision Delegator, First-Hand Thinker. */
export const GATES = [25, 10, 4, 1];

export const BADGES = {
  botBaby:     { key: 'botBaby',     name: 'Bot Baby',                emoji: '🍼' },
  rng:         { key: 'rng',         name: 'Random Number Generator', emoji: '🎲' },
  meatSupreme: { key: 'meatSupreme', name: 'Meat Proxy Supreme',      emoji: '🍖' },
  turing:      { key: 'turing',      name: 'Turing Complete',         emoji: '🏅' },
  objector:    { key: 'objector',    name: 'Conscientious Objector',  emoji: '🕊️' },
  fast:        { key: 'fast',        name: 'Suspiciously Fast',       emoji: '⚡' },
};

const NON_ANSWERS = new Set(['idk', 'no', 'nothing', 'na']);
const OBJECTOR_ANSWERS = new Set(['i refuse', 'no']);

// ---------------------------------------------------------------- normalize

/**
 * DESIGN.md Scoring, Step 1: lowercase, trim, remove punctuation, drop one leading
 * "a"/"an"/"the", and drop a trailing "s" from words longer than three letters.
 */
export function normalize(input) {
  if (input == null) return '';
  let t = String(input).normalize('NFC').toLowerCase();
  t = t.replace(/\p{P}/gu, '');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/^(a|an|the) /, '');
  return t
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');
}

const BLOCKLIST = new Set(BLOCKLIST_WORDS.map(normalize));

// ---------------------------------------------------------------- compile

/** Precomputes lookups for one prompt from prompts.json. */
export function compilePrompt(p) {
  const aliasToCanon = new Map();
  const display = new Map(); // canonical -> how to show it
  for (const [canon, variants] of Object.entries(p.aliases || {})) {
    const c = normalize(canon);
    aliasToCanon.set(c, c);
    for (const v of variants) {
      const n = normalize(v);
      if (!aliasToCanon.has(n)) aliasToCanon.set(n, c);
    }
  }
  const canon = (n) => aliasToCanon.get(n) ?? n;

  const aiSet = new Set([p.ai.answer, ...(p.ai.aliases || [])].map(normalize));

  const seed = new Map();
  let seedTotal = 0;
  for (const [k, v] of Object.entries(p.seed || {})) {
    const c = canon(normalize(k));
    seed.set(c, (seed.get(c) || 0) + v);
    if (!display.has(c)) display.set(c, k);
    seedTotal += v;
  }

  const validSet = p.validSet ? new Set(p.validSet.map((v) => canon(normalize(v)))) : null;

  // Spellings the autocorrect may suggest, with a weight for breaking ties.
  const candidates = [];
  const seen = new Set();
  const addCand = (text, weight) => {
    const n = normalize(text);
    if (!n || seen.has(n)) return;
    seen.add(n);
    candidates.push({ norm: n, display: text, weight });
  };
  for (const [k, v] of Object.entries(p.seed || {})) addCand(k, v);
  for (const [c, variants] of Object.entries(p.aliases || {})) {
    const w = seed.get(normalize(c)) || 0;
    addCand(c, w);
    for (const v of variants) addCand(v, w);
  }
  addCand(p.ai.answer, 0);
  for (const a of p.ai.aliases || []) addCand(a, 0);
  for (const v of p.validSet || []) addCand(v, 0);

  return {
    raw: p,
    id: p.id,
    text: p.text,
    aiAnswer: p.ai.answer,
    hint: p.hint,
    canon,
    aliasToCanon,
    aiSet,
    seed,
    seedTotal,
    validSet,
    candidates,
    display,
    promptNorm: normalize(p.text),
  };
}

// ---------------------------------------------------------------- validity

const VOWEL = /[aeiouy]/;
const stripMarks = (s) => s.normalize('NFD').replace(/\p{M}/gu, '');

/** DESIGN.md Scoring, Step 4. Returns a reason string, or null when the answer is fine. */
export function invalidReason(n, cp) {
  if (n.length < 2) return 'short';
  if (!VOWEL.test(stripMarks(n))) return 'no-vowel';
  if (/(.)\1{3,}/u.test(n)) return 'repeat';
  if (n.split(' ').some((w) => BLOCKLIST.has(w)) || BLOCKLIST.has(n)) return 'blocklist';
  if (cp && n === cp.promptNorm) return 'copied-prompt';
  if (NON_ANSWERS.has(n)) return 'non-answer';
  return null;
}

/** True when the normalized answer is a seed answer, alias, AI answer or valid-set entry. */
export function isKnown(n, cp) {
  const c = cp.canon(n);
  return cp.aiSet.has(n) || cp.aiSet.has(c) || cp.seed.has(c) || cp.aliasToCanon.has(n) || !!(cp.validSet && cp.validSet.has(c));
}

// ---------------------------------------------------------------- tiers

export function tierForShare(share) {
  if (share >= GATES[0]) return 'zombie';
  if (share >= GATES[1]) return 'slopper';
  if (share >= GATES[2]) return 'delegator';
  if (share >= GATES[3]) return 'firsthand';
  return 'reserved';
}

/** Rounds a share for display without letting the rounding cross a tier boundary. */
export function formatShare(share) {
  const r = Math.round(share);
  for (const b of GATES) {
    if (share < b && r >= b) return (Math.floor(share * 10) / 10).toFixed(1);
  }
  return String(r);
}

/**
 * Scores one answer.
 * @param {string} raw what the player submitted
 * @param {object} cp a compiled prompt
 * @param {object} ctx { day, hinted, pool } where pool maps canonical answer -> live count
 */
export function scoreAnswer(raw, cp, ctx = {}) {
  const { day = null, hinted = false, pool = {} } = ctx;
  const input = (raw ?? '').trim();
  const base = { input, hinted: !!hinted, capped: false, special: null, share: null, isNew: false, canonical: null };

  if (!input) return { ...base, tier: 'none', points: 0, special: 'none' };

  const n = normalize(input);

  // Easter egg: Day 3, C3. Skips the filter. A hint caps every answer, so it can't fire then.
  if (day === 3 && cp.id === 'C3' && !hinted && OBJECTOR_ANSWERS.has(n)) {
    return { ...base, canonical: n, tier: 'reserved', points: 100, special: 'objector' };
  }

  const c = cp.canon(n);
  const aiMatch = cp.aiSet.has(n) || cp.aiSet.has(c);

  if (cp.validSet && !aiMatch && !cp.validSet.has(c)) {
    return { ...base, canonical: c, tier: 'smash', points: 0, special: 'smash', reason: 'not-in-valid-set' };
  }
  // Known answers (seed, aliases, the AI's answer) skip the shape checks, so "RN", "R2-D2" and "AC" pass.
  if (!isKnown(n, cp)) {
    const reason = invalidReason(n, cp);
    if (reason) return { ...base, canonical: c, tier: 'smash', points: 0, special: 'smash', reason };
  }

  if (aiMatch) return { ...base, canonical: c, tier: 'meat', points: 0 };

  const poolTotal = Object.values(pool).reduce((a, b) => a + b, 0);
  const prior = (cp.seed.get(c) || 0) + (pool[c] || 0);
  const total = cp.seedTotal + poolTotal;
  // Share counts this answer too: it has now been said.
  const share = ((prior + 1) / (total + 1)) * 100;
  let tier = prior === 0 ? 'reserved' : tierForShare(share);
  let capped = false;
  if (hinted && LADDER.indexOf(tier) > LADDER.indexOf('slopper')) {
    tier = 'slopper';
    capped = true;
  }
  return { ...base, canonical: c, tier, points: TIERS[tier].points, share, isNew: prior === 0, capped };
}

/** The line printed under the stamp. */
export function stampSubline(r) {
  if (r.special === 'none') return 'Bot-like behaviour suspected.';
  if (r.special === 'smash') return "That isn't an answer.";
  if (r.special === 'objector') return 'Refusal noted.';
  if (r.tier === 'meat') return 'The model said this.';
  if (r.tier === 'reserved') return 'Almost nobody said this.';
  const s = formatShare(r.share);
  if (r.capped) return `${s}% of humans said this. AI-assisted.`;
  if (r.tier === 'firsthand') return `Only ${s}% of humans said this.`;
  return `${s}% of humans said this.`;
}

/**
 * The mono line under a stamp or verdict, e.g. "The model said this | 0 pts" or
 * "43% of humans said this | +10". The screen sets it in uppercase.
 */
export function resultLine(r) {
  const sub = stampSubline(r).replace(/\.$/, '');
  return `${sub} | ${r.points ? `+${r.points}` : '0 pts'}`;
}

export function stampTitle(r) {
  if (r.special === 'objector') return 'Conscientious Objector';
  return TIERS[r.tier].name;
}

// ---------------------------------------------------------------- autocorrect

/** Damerau-Levenshtein distance (optimal string alignment variant). */
export function editDistance(a, b) {
  const A = [...a];
  const B = [...b];
  const m = A.length;
  const n = B.length;
  const d = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

export function maxEdits(len) {
  if (len < 3) return 0;
  if (len <= 5) return 1;
  if (len <= 10) return 2;
  return 3;
}

/** Lowercases a suggestion unless it carries deliberate capitals (HAL 9000, R2-D2). */
function casual(s) {
  return /[A-Z]/.test(s.slice(1)) ? s : s.toLowerCase();
}

/**
 * Returns { text, edits } for the single closest known spelling, or null when the answer
 * is an exact match, too short, or nothing is close. Ties go to the more common answer.
 */
export function suggestDetail(raw, cp) {
  const n = normalize(raw);
  const limit = maxEdits([...n.replace(/ /g, '')].length);
  if (!limit) return null;
  if (cp.candidates.some((c) => c.norm === n)) return null;
  let best = null;
  for (const c of cp.candidates) {
    const d = editDistance(n, c.norm);
    if (d > limit) continue;
    if (!best || d < best.d || (d === best.d && c.weight > best.weight)) best = { ...c, d };
  }
  return best ? { text: casual(best.display), edits: best.d } : null;
}

export function suggest(raw, cp) {
  return suggestDetail(raw, cp)?.text ?? null;
}

// ---------------------------------------------------------------- round

export const VERDICTS = [
  { min: 650, name: 'Human Reserved', line: 'This role cannot be automated. Yet.' },
  { min: 500, name: 'Verified Human', line: 'You passed. For today.' },
  { min: 350, name: 'Probably Human', line: 'Verification inconclusive. Please try again tomorrow.' },
  { min: 200, name: 'Third-Party Thinker', line: 'You think, but mostly secondhand.' },
  { min: 0, name: 'Artificially Intelligent', line: 'Most of your answers were ones a model would give.' },
];

export function verdictFor(total) {
  return VERDICTS.find((v) => total >= v.min);
}

export function passed(total) {
  return total >= 350;
}

/** answers: [{ tier, special, hinted, isNew, ms }] */
export function badgesFor(answers) {
  const out = [];
  const meat = answers.filter((a) => a.tier === 'meat').length;
  if (answers.some((a) => a.hinted)) out.push('botBaby');
  if (answers.filter((a) => a.isNew && !a.special && a.tier !== 'meat').length >= 3) out.push('rng');
  if (meat >= 3) out.push('meatSupreme');
  if (answers.length > 0 && meat === 0 && answers.every((a) => a.tier === 'firsthand' || a.tier === 'reserved')) out.push('turing');
  if (answers.some((a) => a.special === 'objector')) out.push('objector');
  if (answers.filter((a) => a.special !== 'none' && typeof a.ms === 'number' && a.ms < 2000).length >= 3) out.push('fast');
  return out;
}

export function totalScore(answers) {
  return answers.reduce((s, a) => s + (a.points || 0), 0);
}

const STREAK_LINES = [
  [7, 'I saved your spot. I always do.'],
  [4, 'The AI never misses a day. Do you?'],
  [3, 'Leaving already? Third-Party Thinkers usually check ChatGPT first.'],
  [2, 'Two days. The AI has been here for all of them.'],
  [1, 'See you tomorrow. The AI will be here either way.'],
];

export function guiltLine(streak, justBroken) {
  if (justBroken) return "You were gone. The model wasn't.";
  return (STREAK_LINES.find(([min]) => streak >= min) || STREAK_LINES[STREAK_LINES.length - 1])[1];
}

export function shareText({ dayId, dayTitle, answers, url }) {
  const total = totalScore(answers);
  const v = verdictFor(total);
  const grid = answers.map((a) => TIERS[a.tier].emoji).join('');
  const badges = badgesFor(answers).map((b) => `${BADGES[b].emoji} ${BADGES[b].name}`);
  return [`notarobot | Day ${dayId}: ${dayTitle}`, `${v.name} | ${total}/700`, grid, ...badges, url].join('\n');
}
