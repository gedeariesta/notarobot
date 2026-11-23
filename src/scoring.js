// Scoring from the answer lists (DESIGN.md, Scoring): lookups, bounces, "Did you mean",
// the Keyboard Smash filter, tiers from AI runs, verdicts, badges and the share text.
// Pure functions only: shared by the browser, the bank build script and the Node tests.

export const RUNS_PER_PROMPT = 300;

export const TIERS = {
  meat:      { key: 'meat',      name: 'Meat Proxy',             points: 0,   emoji: '🥩' },
  zombie:    { key: 'zombie',    name: 'Prompt Zombie',          points: 10,  emoji: '🧟' },
  slopper:   { key: 'slopper',   name: 'Slopper',                points: 25,  emoji: '🥣' },
  delegator: { key: 'delegator', name: 'Decision Delegator',     points: 50,  emoji: '🤷' },
  firsthand: { key: 'firsthand', name: 'First-Hand Thinker',     points: 75,  emoji: '🧠' },
  reserved:  { key: 'reserved',  name: 'Human Reserved',         points: 100, emoji: '🫀' },
  objector:  { key: 'objector',  name: 'Conscientious Objector', points: 100, emoji: '🕊️' },
  smash:     { key: 'smash',     name: 'Keyboard Smash',         points: 0,   emoji: '⌨️' },
  none:      { key: 'none',      name: 'No response',            points: 0,   emoji: '💤' },
};

/** The six layers of the Screening, top to bottom. */
export const LADDER = ['meat', 'zombie', 'slopper', 'delegator', 'firsthand', 'reserved'];
/** The four gates under Prompt Zombie, Slopper, Decision Delegator and First-Hand Thinker. */
export const GATES = [
  { below: 'zombie', label: '30/300', runs: 30 },
  { below: 'slopper', label: '6/300', runs: 6 },
  { below: 'delegator', label: '1/300', runs: 1 },
  { below: 'firsthand', label: 'Humans only', runs: 0 },
];

export const BADGES = {
  botBaby:     { key: 'botBaby',     name: 'Bot Baby',                emoji: '🍼', line: 'You asked the AI for a hint.' },
  rng:         { key: 'rng',         name: 'Random Number Generator', emoji: '🎲', line: 'Three or more answers bounced off the list.' },
  meatSupreme: { key: 'meatSupreme', name: 'Meat Proxy Supreme',      emoji: '🍖', line: "You gave the AI's answer three or more times." },
  turing:      { key: 'turing',      name: 'Turing Complete',         emoji: '🏅', line: 'Every answer was one the AI never gave.' },
  reading:     { key: 'reading',     name: 'Did the Reading',         emoji: '📚', line: 'You gave an answer straight from the reading.' },
  objector:    { key: 'objector',    name: 'Conscientious Objector',  emoji: '🕊️', line: 'You refused to fight.' },
  fast:        { key: 'fast',        name: 'Suspiciously Fast',       emoji: '⚡', line: 'Three or more answers in under two seconds each.' },
};
const BADGE_ORDER = ['botBaby', 'rng', 'meatSupreme', 'turing', 'reading', 'objector', 'fast'];

const OBJECTOR_TEXT = ['I refuse', 'no'];
const LEADING_FILLER = /^(?:(?:my|your|our|their|his|her|its|ones|to|a|an|the) )+/;

// ---------------------------------------------------------------- normalize

/**
 * DESIGN.md Scoring, Step 1: lowercase, trim, remove punctuation, drop one leading
 * "a"/"an"/"the", and drop a trailing "s" from words longer than three letters.
 */
export function normalize(input) {
  if (input == null) return '';
  let t = String(input).normalize('NFC').toLowerCase();
  t = t.replace(/[\p{P}\p{S}]/gu, '');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/^(a|an|the) /, '');
  return t
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');
}

/** The answer with leading possessives and fillers removed: "my crush's name" -> "crush name". */
export function core(n) {
  return n.replace(LEADING_FILLER, '');
}

const OBJECTOR_ANSWERS = new Set(OBJECTOR_TEXT.map(normalize));

// ---------------------------------------------------------------- inflections

const IRREGULAR = {
  man: 'men', woman: 'women', child: 'children', person: 'people', mouse: 'mice', goose: 'geese', tooth: 'teeth',
  foot: 'feet', ox: 'oxen', octopus: 'octopi', cactus: 'cacti', fungus: 'fungi', leaf: 'leaves', knife: 'knives',
  life: 'lives', wife: 'wives', wolf: 'wolves', calf: 'calves', half: 'halves', self: 'selves', shelf: 'shelves',
  thief: 'thieves', loaf: 'loaves', elf: 'elves', criterion: 'criteria', phenomenon: 'phenomena',
};
const IRREGULAR_BACK = Object.fromEntries(Object.entries(IRREGULAR).map(([s, p]) => [p, s]));

/** Plural and singular spellings of the last word, so a list can be written either way. */
export function inflections(raw) {
  const s = String(raw).toLowerCase().trim();
  const m = s.match(/^(.*?)([a-z]+)$/);
  if (!m) return [];
  const [, head, w] = m;
  if (w.length < 2) return [];
  const out = new Set();
  if (IRREGULAR[w]) out.add(IRREGULAR[w]);
  if (IRREGULAR_BACK[w]) out.add(IRREGULAR_BACK[w]);
  if (/[^aeiou]y$/.test(w)) out.add(`${w.slice(0, -1)}ies`);
  if (/(s|x|z|ch|sh)$/.test(w)) out.add(`${w}es`);
  if (/[^aeiou]ies$/.test(w)) out.add(`${w.slice(0, -3)}y`);
  if (/(ss|x|z|ch|sh)es$/.test(w)) out.add(w.slice(0, -2));
  if (/ves$/.test(w)) {
    out.add(`${w.slice(0, -3)}f`);
    out.add(`${w.slice(0, -3)}fe`);
  }
  if (/men$/.test(w)) out.add(`${w.slice(0, -3)}man`);
  if (/man$/.test(w)) out.add(`${w.slice(0, -3)}men`);
  if (!w.endsWith('s')) out.add(`${w}s`);
  else if (w.length <= 4) out.add(w.slice(0, -1));
  return [...out].map((v) => head + v);
}

// ---------------------------------------------------------------- compile

const VOWEL = /[aeiouy]/;
const stripMarks = (s) => s.normalize('NFD').replace(/\p{M}/gu, '');

/** Lowercase ASCII word tokens, accents removed: "Déjà vu!" -> ["deja", "vu"]. */
export function plainWords(raw) {
  return stripMarks(String(raw).toLowerCase()).split(/[^a-z0-9]+/).filter(Boolean);
}

/** Tier from a run count, with the team's hand-picked flag. The sealed answer is set separately. */
export function tierForRuns(runs, reserved = false) {
  if (runs >= 30) return 'zombie';
  if (runs >= 6) return 'slopper';
  if (runs >= 1) return 'delegator';
  return reserved ? 'reserved' : 'firsthand';
}

/**
 * Precomputes lookups for one prompt from prompts.json:
 * { id, text, source, ai, hint, answers: [{ a, aliases, runs, tier, reading }] }.
 * Canonical answers win over aliases, aliases over plural spellings, those over stripped forms.
 */
export function compilePrompt(p) {
  const entries = p.answers.map((x, i) => ({
    a: x.a, aliases: x.aliases || [], runs: x.runs || 0, tier: x.tier, reading: !!x.reading, idx: i,
  }));
  const exact = new Map();
  const flat = new Map();
  const conflicts = [];
  const candidates = [];
  const words = new Set();

  const put = (map, key, entry, raw) => {
    if (!key) return;
    const prev = map.get(key);
    if (!prev) map.set(key, entry);
    else if (prev !== entry) conflicts.push({ key, raw, kept: prev.a, dropped: entry.a });
  };
  const add = (raw, entry, { suggest = false, quiet = false } = {}) => {
    const n = normalize(raw);
    if (!n) return;
    for (const w of plainWords(raw)) words.add(w);
    if (quiet) {
      if (!exact.has(n)) exact.set(n, entry);
      const f = n.replace(/ /g, '');
      if (!flat.has(f)) flat.set(f, entry);
      return;
    }
    put(exact, n, entry, raw);
    put(flat, n.replace(/ /g, ''), entry, raw);
    if (suggest) candidates.push({ norm: n, flat: n.replace(/ /g, ''), display: raw, entry, tokens: topicTokens(n) });
  };

  for (const e of entries) add(e.a, e, { suggest: true });
  for (const e of entries) for (const al of e.aliases) add(al, e, { suggest: true });
  for (const e of entries) {
    for (const raw of [e.a, ...e.aliases]) for (const v of inflections(raw)) add(v, e, { quiet: true });
  }
  for (const e of entries) {
    for (const raw of [e.a, ...e.aliases]) {
      const c = core(normalize(raw));
      if (c && c !== normalize(raw)) add(c, e, { quiet: true });
    }
  }

  const byA = new Map(entries.map((e) => [e.a, e]));
  const aiEntry = byA.get(p.ai) || entries.find((e) => e.tier === 'meat');
  return {
    raw: p,
    id: p.id,
    text: p.text,
    source: p.source,
    aiAnswer: p.ai,
    aiEntry,
    hint: p.hint,
    hintEntry: byA.get(p.hint) || null,
    entries,
    exact,
    flat,
    candidates,
    conflicts,
    words,
    promptNorm: normalize(p.text),
  };
}

/** Finds the list entry for an answer, or null. Looks up the answer as written and with spaces removed. */
export function lookup(raw, cp) {
  const n = normalize(raw);
  if (!n) return null;
  const tries = [n];
  const c = core(n);
  if (c && c !== n) tries.push(c);
  for (const t of tries) {
    if (cp.exact.has(t)) return cp.exact.get(t);
    const f = t.replace(/ /g, '');
    if (cp.flat.has(f)) return cp.flat.get(f);
  }
  return null;
}

// ---------------------------------------------------------------- "Did you mean"

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

/** Edits allowed for a list answer of this many letters (spaces don't count). */
export function maxEdits(len) {
  if (len < 3) return 0;
  if (len <= 5) return 1;
  if (len <= 10) return 2;
  return 3;
}

/** Lowercases a suggestion unless it carries deliberate capitals (HAL 9000, R2-D2, NICU nurse). */
export function casual(s) {
  return /[A-Z]/.test(s.slice(1)) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * The single closest list spelling within the allowed edits, or null. Distance is measured after
 * normalization and again with spaces removed; ties go to the answer the AI gave more often.
 */
export function suggestDetail(raw, cp) {
  const n = normalize(raw);
  if (!n || lookup(raw, cp)) return null;
  const nf = n.replace(/ /g, '');
  let best = null;
  for (const c of cp.candidates) {
    const limit = maxEdits(c.flat.length);
    if (!limit || Math.abs(c.flat.length - nf.length) > limit) continue;
    const d = Math.min(editDistance(n, c.norm), editDistance(nf, c.flat));
    if (d === 0 || d > limit) continue;
    if (!best || d < best.d || (d === best.d && c.entry.runs > best.entry.runs)) best = { ...c, d };
  }
  return best ? { text: casual(best.display), edits: best.d, entry: best.entry } : null;
}

export function suggest(raw, cp) {
  return suggestDetail(raw, cp)?.text ?? null;
}

// Related answers: "nuclear" finds "nuclear war", "a nuclear war between countries" finds it too.
const STOP = new Set(('a an the of to in on for and or my your our their his her its being getting with from by at as is are '
  + 'be it that this i you we they me us them someone something some any very really just like kind sort type thing stuff '
  + 'lot more most less big small good bad new old one way when if not no so out up').split(' '));

/** Content words of a normalized answer, lightly stemmed, for matching related answers. */
export function topicTokens(n) {
  return n.split(' ').filter((w) => w && !STOP.has(w)).map((w) => {
    if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
    if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
    if (w.length > 5 && w.endsWith('ly')) return w.slice(0, -2);
    return w;
  });
}

/** Two words name the same thing: equal, one inside the other (volcano, supervolcano), or a long shared stem. */
function sameWord(a, b) {
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s.length >= 5 && l.includes(s)) return true;
  let p = 0;
  while (p < s.length && s[p] === l[p]) p++;
  return p >= 5 && p >= Math.ceil(s.length * 0.75);
}

/**
 * The list answer the input is about, when it isn't a spelling slip: every word of the input belongs
 * to the answer, or every word of the answer is in the input. The machine finishes your sentence, so
 * the answer the AI gave most often wins. It never volunteers a hand-picked Human Reserved answer.
 */
export function topicSuggest(raw, cp) {
  const n = normalize(raw);
  const tin = topicTokens(n);
  if (!tin.length || lookup(raw, cp)) return null;
  let best = null;
  for (const c of cp.candidates) {
    if (c.entry.tier === 'reserved' || !c.tokens.length) continue;
    const inside = tin.every((t) => c.tokens.some((u) => sameWord(t, u)));
    const covers = !inside && c.tokens.every((u) => tin.some((t) => sameWord(t, u)));
    if (!inside && !covers) continue;
    const overlap = (inside ? tin.length : c.tokens.length) / Math.max(tin.length, c.tokens.length);
    const rank = [c.entry.runs, overlap, -c.entry.a.length];
    if (!best || rank[0] > best.rank[0] || (rank[0] === best.rank[0] && (rank[1] > best.rank[1] || (rank[1] === best.rank[1] && rank[2] > best.rank[2])))) {
      best = { c, rank };
    }
  }
  return best ? { text: casual(best.c.entry.a), entry: best.c.entry } : null;
}

// ---------------------------------------------------------------- Keyboard Smash

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const KEY = {};
ROWS.forEach((row, r) => [...row].forEach((ch, i) => { KEY[ch] = [r, i]; }));

/**
 * A run along one keyboard row: "asdf", "qwerty", "lkjh", "asdfjkl", "sdfsdf". Real words that
 * happen to contain three neighbouring keys ("power", "tree") don't count.
 */
export function isKeyboardRow(token) {
  const t = String(token).toLowerCase();
  if (t.length < 3 || !/^[a-z]+$/.test(t)) return false;
  const runs = [];
  let len = 1;
  let dir = 0;
  for (let i = 1; i < t.length; i++) {
    const a = KEY[t[i - 1]];
    const b = KEY[t[i]];
    const step = a[0] === b[0] ? b[1] - a[1] : 99;
    if ((step === 1 || step === -1) && (len === 1 || step === dir)) {
      len++;
      dir = step;
    } else {
      runs.push(len);
      len = 1;
      dir = 0;
    }
  }
  runs.push(len);
  const covered = runs.filter((r) => r >= 3).reduce((s, r) => s + r, 0);
  return Math.max(...runs) >= 4 || covered === t.length;
}

/**
 * Keyboard Smash is for answers that aren't words at all: a run along a keyboard row, no vowel
 * anywhere, or one letter four times in a row. Anything else that misses the list just bounces.
 */
export function smashReason(raw) {
  const plain = stripMarks(String(raw).toLowerCase());
  if (!VOWEL.test(plain)) return 'no-vowel';
  if (/(.)\1{3,}/u.test(plain.replace(/\s/g, ''))) return 'repeat';
  const tokens = plainWords(raw);
  if (tokens.length && (tokens.every(isKeyboardRow) || tokens.some((t) => t.length >= 4 && isKeyboardRow(t)))) return 'keyboard';
  return null;
}

// ---------------------------------------------------------------- classify and score

/**
 * Decides what a submitted answer is, in the order of DESIGN.md Step 1:
 * { kind: 'empty' | 'objector' | 'answer' | 'smash' | 'suggest' | 'bounce', ... }.
 * ctx: { day }.
 */
export function classify(raw, cp, ctx = {}) {
  const { day = null } = ctx;
  const input = String(raw ?? '').trim();
  if (!input) return { kind: 'empty', input };
  const n = normalize(input);
  if (day === 3 && cp.id === 'C3' && OBJECTOR_ANSWERS.has(n)) return { kind: 'objector', input };
  const entry = lookup(input, cp);
  if (entry) return { kind: 'answer', input, entry };
  const smash = smashReason(input);
  if (smash) return { kind: 'smash', input, reason: smash };
  const near = suggestDetail(input, cp);
  if (near) return { kind: 'suggest', input, suggestion: near.text, edits: near.edits, entry: near.entry, why: 'spelling' };
  const topic = topicSuggest(input, cp);
  if (topic) return { kind: 'suggest', input, suggestion: topic.text, edits: 0, entry: topic.entry, why: 'topic' };
  return { kind: 'bounce', input };
}

/** The scored result for a list entry. A hint caps anything better than Slopper. */
export function scoreEntry(entry, { hinted = false, input = '' } = {}) {
  let tier = entry.tier;
  let capped = false;
  if (hinted && LADDER.indexOf(tier) > LADDER.indexOf('slopper')) {
    tier = 'slopper';
    capped = true;
  }
  return {
    input: input || entry.a,
    canonical: entry.a,
    tier,
    trueTier: entry.tier,
    points: TIERS[tier].points,
    runs: entry.runs,
    reading: entry.reading,
    hinted: !!hinted,
    capped,
    special: null,
  };
}

export function specialResult(kind, input = '', extra = {}) {
  const tier = kind === 'objector' ? 'objector' : kind;
  return {
    input, canonical: null, tier, trueTier: tier, points: TIERS[tier].points, runs: null,
    reading: false, hinted: !!extra.hinted, capped: false, special: kind,
  };
}

/** Human Reserved: the model, caught off guard. One per landing; a round uses all five before any repeats. */
export const RESERVED_LINES = [
  'The model would like to know where you got that.',
  'The model is googling that right now.',
  'Okay, the model did not see that coming.',
  'The model is writing that down for next time.',
  'Nobody told the model about that one.',
];

/**
 * The next Human Reserved line, given the lines already shown this round (in order). Random, but
 * nothing repeats until all five are used, and a fresh cycle never opens on the line shown last.
 */
export function pickReservedLine(used = [], rand = Math.random) {
  const shown = used.filter((l) => RESERVED_LINES.includes(l));
  const cycle = shown.slice(shown.length - (shown.length % RESERVED_LINES.length));
  let left = RESERVED_LINES.filter((l) => !cycle.includes(l));
  if (!cycle.length && shown.length) left = left.filter((l) => l !== shown[shown.length - 1]);
  return left[Math.floor(rand() * left.length)];
}

/** "The AI said this 4 times in 300." and friends: the line under each verdict. */
export function landingLine(r) {
  if (r.special === 'none') return 'Bot-like behaviour suspected.';
  if (r.special === 'smash') return "That isn't an answer.";
  if (r.special === 'objector') return 'Refusal noted.';
  let line;
  if (r.trueTier === 'meat') line = 'Redundant. The model said it first.';
  else if (r.runs === 1) line = 'The AI said this once in 300.';
  else if (r.runs > 1) line = `The AI said this ${r.runs} times in 300.`;
  else if (r.trueTier === 'reserved') line = r.capped ? 'The AI never said this.' : r.line || RESERVED_LINES[0];
  // A hint caps the answer at Slopper, so it doesn't get called a deep cut.
  else line = r.capped ? 'The AI never said this.' : 'Deep cut. The AI never said this.';
  return r.capped ? `${line} AI-assisted.` : line;
}

/** The mono line under a stamp or verdict, e.g. "The AI said this 4 times in 300 | +50". */
export function resultLine(r) {
  return `${landingLine(r).replace(/\.$/, '')} | ${r.points ? `+${r.points}` : '0 pts'}`;
}

export function stampTitle(r) {
  return TIERS[r.tier].name;
}

/** Only these three end with a rubber stamp; everything else ends on its shape or a verdict. */
export function stamped(r) {
  return r.tier === 'meat' || r.tier === 'smash' || r.tier === 'none';
}

// ---------------------------------------------------------------- round

export const VERDICTS = [
  { min: 650, name: 'Human Reserved', line: 'This role cannot be automated. Yet.' },
  { min: 500, name: 'Verified Human', line: 'You passed. For today.' },
  { min: 350, name: 'Probably Human', line: 'Passed, with reservations.' },
  { min: 200, name: 'Third-Party Thinker', line: 'You think, but mostly secondhand.' },
  { min: 0, name: 'Artificially Intelligent', line: 'Most of your answers were ones a model would give.' },
];

export function verdictFor(total) {
  return VERDICTS.find((v) => total >= v.min);
}

export function passed(total) {
  return total >= 350;
}

/** answers: [{ tier, special, hinted, reading, ms, bounces }] */
export function badgesFor(answers) {
  const has = new Set();
  const meat = answers.filter((a) => a.tier === 'meat').length;
  if (answers.some((a) => a.hinted)) has.add('botBaby');
  if (answers.reduce((s, a) => s + (a.bounces || 0), 0) >= 3) has.add('rng');
  if (meat >= 3) has.add('meatSupreme');
  if (answers.length > 0 && meat === 0 && answers.every((a) => ['firsthand', 'reserved', 'objector'].includes(a.tier))) has.add('turing');
  if (answers.some((a) => a.reading)) has.add('reading');
  if (answers.some((a) => a.special === 'objector')) has.add('objector');
  if (answers.filter((a) => a.special !== 'none' && typeof a.ms === 'number' && a.ms < 2000).length >= 3) has.add('fast');
  return BADGE_ORDER.filter((k) => has.has(k));
}

export function totalScore(answers) {
  return answers.reduce((s, a) => s + (a.points || 0), 0);
}

// ---------------------------------------------------------------- the answer key

/** Deepest first: the order of each prompt's full answer list on the results screen, and its filters. */
export const KEY_ORDER = ['reserved', 'firsthand', 'delegator', 'slopper', 'zombie', 'meat'];

/**
 * Every answer on a prompt's list, for the results screen: deepest tier first, then the fewest AI
 * runs, then A to Z by the answer without its "a", "an" or "the". `keys` holds the answer and its
 * spellings, normalized, for search.
 */
export function answerKey(cp) {
  const rank = (t) => KEY_ORDER.indexOf(t);
  return cp.entries
    .map((e) => ({
      a: e.a, tier: e.tier, runs: e.runs, points: TIERS[e.tier].points, reading: e.reading, sort: normalize(e.a),
      keys: [...new Set([e.a, ...e.aliases].map(normalize).filter(Boolean))],
    }))
    .sort((x, y) => rank(x.tier) - rank(y.tier) || x.runs - y.runs || x.sort.localeCompare(y.sort, 'en', { numeric: true }));
}

/** How many answers each tier holds. */
export function keyCounts(rows) {
  const out = {};
  for (const r of rows) out[r.tier] = (out[r.tier] || 0) + 1;
  return out;
}

/** The rows whose answer, or a spelling of it, contains the search (both normalized, spaces optional). */
export function searchKey(rows, query) {
  const n = normalize(query);
  if (!n) return rows;
  const flat = n.replace(/ /g, '');
  return rows.filter((r) => r.keys.some((k) => k.includes(n) || k.replace(/ /g, '').includes(flat)));
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
