// Builds the game's data from the question bank.
//
//   node scripts/build-bank.mjs          check bank/*.json and write prompts.json + bank/QUESTION_BANK.md
//
// The bank files are the source of truth. Each prompt lists:
//   ai        the sealed AI answer (its run count is whatever is left of the 300)
//   runs      every other answer the AI gave, with its count out of 300
//   reserved  answers the team hand-picked as Human Reserved (they must have 0 runs)
//   list      every other correct answer (0 runs: First-Hand Thinker)
//   aliases   other spellings, keyed by the answer they belong to
//   reading   answers that come from the reading (they earn Did the Reading)
// Run counts are simulated until the team runs the prompts through real models (DESIGN.md,
// Producing the answer lists); paste the real counts into "runs" and rebuild.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUNS_PER_PROMPT, TIERS, compilePrompt, normalize, tierForRuns, plainWords } from '../src/scoring.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bankDir = path.join(root, 'bank');
const FILES = ['day1-work.json', 'day2-minds.json', 'day3-war.json', 'day4-simulation.json'];
const LAUNCH_DATE = '2026-11-25';

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

function buildPrompt(src) {
  const id = src.id;
  const order = [];
  const byA = new Map();
  const byNorm = new Map();
  const addEntry = (a, runs, tier) => {
    const n = normalize(a);
    if (byNorm.has(n)) {
      err(id, `"${a}" duplicates "${byNorm.get(n).a}"`);
      return null;
    }
    const e = { a, aliases: [], runs, tier };
    byA.set(a, e);
    byNorm.set(n, e);
    order.push(e);
    return e;
  };

  const otherRuns = Object.values(src.runs || {}).reduce((s, v) => s + v, 0);
  const aiRuns = RUNS_PER_PROMPT - otherRuns;
  const maxOther = Math.max(0, ...Object.values(src.runs || {}));
  if (aiRuns <= maxOther) err(id, `the sealed answer only gets ${aiRuns} runs, not more than the runner-up (${maxOther})`);
  addEntry(src.ai, aiRuns, 'meat');
  for (const [a, n] of Object.entries(src.runs || {})) {
    if (!Number.isInteger(n) || n < 1) err(id, `"${a}" has a bad run count (${n})`);
    addEntry(a, n, tierForRuns(n));
  }
  for (const a of src.reserved || []) {
    if (src.runs?.[a]) err(id, `"${a}" is hand-picked but the AI gave it`);
    addEntry(a, 0, 'reserved');
  }
  for (const a of src.list || []) addEntry(a, 0, 'firsthand');
  const reservedCount = (src.reserved || []).length;
  if (reservedCount < 1 || reservedCount > 8) warn(id, `${reservedCount} Human Reserved answers (the doc asks for 3 to 8)`);

  for (const [a, variants] of Object.entries(src.aliases || {})) {
    const e = byA.get(a);
    if (!e) {
      err(id, `aliases for "${a}", which isn't an answer`);
      continue;
    }
    for (const v of variants) {
      const n = normalize(v);
      const owner = byNorm.get(n);
      if (owner && owner !== e) {
        err(id, `alias "${v}" of "${a}" is already the answer "${owner.a}"`);
        continue;
      }
      if (!owner) byNorm.set(n, e);
      e.aliases.push(v);
    }
  }
  for (const a of src.reading || []) {
    const e = byA.get(a);
    if (!e) err(id, `reading flag on "${a}", which isn't an answer`);
    else e.reading = true;
  }

  const ranked = order.filter((e) => e.runs > 0).sort((x, y) => y.runs - x.runs);
  const prompt = {
    id,
    text: src.text,
    source: src.source,
    ai: src.ai,
    hint: ranked[1]?.a ?? null,
    answers: order.map((e) => {
      const out = { a: e.a };
      if (e.aliases.length) out.aliases = e.aliases;
      out.runs = e.runs;
      out.tier = e.tier;
      if (e.reading) out.reading = true;
      return out;
    }),
  };

  // The game's own lookup must agree with the bank: every spelling finds its own answer.
  const cp = compilePrompt(prompt);
  for (const c of cp.conflicts) err(id, `"${c.raw}" reads the same as "${c.kept}" (from "${c.dropped}")`);
  return { prompt, notes: src.notes || [], cp };
}

const days = [];
const notes = {};
for (const file of FILES) {
  const src = JSON.parse(fs.readFileSync(path.join(bankDir, file), 'utf8'));
  const prompts = [];
  for (const p of src.prompts) {
    const built = buildPrompt(p);
    prompts.push(built.prompt);
    notes[p.id] = built.notes;
  }
  if (prompts.length !== 7) err(`Day ${src.day}`, `${prompts.length} prompts (needs 7)`);
  days.push({ id: src.day, title: src.title, prompts });
}

if (warnings.length) console.warn(`Warnings:\n  ${warnings.join('\n  ')}`);
if (errors.length) {
  console.error(`The bank has ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------- prompts.json

const data = {
  launchDate: LAUNCH_DATE,
  runs: {
    perPrompt: RUNS_PER_PROMPT,
    simulated: true,
    models: [],
    date: null,
    note: 'Run counts are simulated. Replace them with real runs (100 each on three models) before launch.',
  },
  days,
};
// One answer per line keeps the diff readable when the team edits the bank.
let json = JSON.stringify({ ...data, days: '__DAYS__' }, null, 2);
const dayJson = days
  .map((d) => {
    const ps = d.prompts
      .map((p) => {
        const { answers, ...head } = p;
        const h = JSON.stringify(head).slice(0, -1);
        const as = answers.map((a) => `        ${JSON.stringify(a)}`).join(',\n');
        return `      ${h},"answers":[\n${as}\n      ]}`;
      })
      .join(',\n');
    return `    {"id":${d.id},"title":${JSON.stringify(d.title)},"prompts":[\n${ps}\n    ]}`;
  })
  .join(',\n');
json = json.replace('"__DAYS__"', `[\n${dayJson}\n  ]`);
JSON.parse(json);
fs.writeFileSync(path.join(root, 'prompts.json'), `${json}\n`);

// ---------------------------------------------------------------- QUESTION_BANK.md

const md = [];
const count = (p, t) => p.answers.filter((a) => a.tier === t).length;
md.push('# notarobot question bank');
md.push('');
md.push('Generated by `node scripts/build-bank.mjs` from `bank/day*.json`. Edit those files, not this one.');
md.push('');
md.push(`**Run counts are simulated.** Each prompt was "run" 300 times (100 each on three models, the way DESIGN.md describes), and the counts below are a judgement of what current chat models answer when asked the prompt plus "Answer in one to four words". Replace them with real runs before launch, then rebuild.`);
md.push('');
md.push('Tiers: Meat Proxy is the sealed answer. Prompt Zombie is 30 or more runs, Slopper 6 to 29, Decision Delegator 1 to 5, First-Hand Thinker 0 runs, and Human Reserved is 0 runs and hand-picked. 📚 marks answers from the reading.');
md.push('');
md.push('| Day | Prompt | Answers | Aliases | AI gave | Human Reserved |');
md.push('| --- | --- | ---: | ---: | ---: | ---: |');
for (const d of days) {
  for (const p of d.prompts) {
    const aliasCount = p.answers.reduce((s, a) => s + (a.aliases?.length || 0), 0);
    md.push(`| ${d.id} | ${p.id} | ${p.answers.length} | ${aliasCount} | ${p.answers.filter((a) => a.runs > 0).length} | ${count(p, 'reserved')} |`);
  }
}
for (const d of days) {
  md.push('');
  md.push(`## Day ${d.id}: ${d.title}`);
  for (const p of d.prompts) {
    md.push('');
    md.push(`### ${p.id}. ${p.text}`);
    md.push('');
    md.push(`${p.source} | sealed answer: **${p.ai}** | hint: ${p.hint}`);
    md.push('');
    md.push('| Runs | Answer | Tier | Also accepts |');
    md.push('| ---: | --- | --- | --- |');
    for (const a of p.answers.filter((x) => x.runs > 0).sort((x, y) => y.runs - x.runs)) {
      md.push(`| ${a.runs} | ${a.a}${a.reading ? ' 📚' : ''} | ${TIERS[a.tier].name} | ${(a.aliases || []).join(', ')} |`);
    }
    md.push('');
    const res = p.answers.filter((a) => a.tier === 'reserved');
    md.push(`**Human Reserved:** ${res.map((a) => `${a.a}${a.reading ? ' 📚' : ''}`).join(', ') || 'none'}`);
    md.push('');
    const fh = p.answers.filter((a) => a.tier === 'firsthand');
    md.push(`**First-Hand Thinker (${fh.length}):** ${fh.map((a) => `${a.a}${a.reading ? ' 📚' : ''}`).join(', ') || 'none'}`);
    for (const n of notes[p.id] || []) {
      md.push('');
      md.push(`> ${n}`);
    }
  }
}
fs.writeFileSync(path.join(bankDir, 'QUESTION_BANK.md'), `${md.join('\n')}\n`);

const totals = days.flatMap((d) => d.prompts).reduce(
  (s, p) => ({ answers: s.answers + p.answers.length, aliases: s.aliases + p.answers.reduce((x, a) => x + (a.aliases?.length || 0), 0) }),
  { answers: 0, aliases: 0 },
);
const listWords = new Set(days.flatMap((d) => d.prompts).flatMap((p) => p.answers.flatMap((a) => [a.a, ...(a.aliases || [])].flatMap(plainWords))));
console.log(`prompts.json: ${days.length} days, ${totals.answers} answers, ${totals.aliases} aliases, ${listWords.size} distinct list words`);
