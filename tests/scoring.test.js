import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalize, core, inflections, compilePrompt, lookup, classify, scoreEntry, specialResult, editDistance, maxEdits,
  suggestDetail, topicSuggest, isKeyboardRow, smashReason, landingLine, resultLine, stamped, verdictFor, passed,
  badgesFor, guiltLine, shareText, totalScore, TIERS, RESERVED_LINES, pickReservedLine,
} from '../src/scoring.js';

const bank = JSON.parse(readFileSync(new URL('../prompts.json', import.meta.url)));
const dayOf = Object.fromEntries(bank.days.flatMap((d) => d.prompts.map((p) => [p.id, d.id])));
const cps = Object.fromEntries(bank.days.flatMap((d) => d.prompts.map((p) => [p.id, compilePrompt(p)])));
const W1 = cps.W1;
const ask = (id, s, extra = {}) => classify(s, cps[id], { day: dayOf[id], ...extra });
const score = (id, s, opts = {}) => {
  const r = ask(id, s);
  assert.equal(r.kind, 'answer', `${id} "${s}" should be on the list (got ${r.kind})`);
  return scoreEntry(r.entry, { ...opts, input: s });
};

test('normalize: case, punctuation, articles, trailing s', () => {
  assert.equal(normalize('  The Nurses! '), 'nurse');
  assert.equal(normalize('A Caregiver.'), 'caregiver');
  assert.equal(normalize('an apple'), 'apple');
  assert.equal(normalize('R2-D2'), 'r2d2');
  assert.equal(normalize("Don't   lie"), 'dont lie');
  assert.equal(normalize('ads'), 'ads');
  assert.equal(normalize('Streaks and Likes'), 'streak and like');
  assert.equal(normalize('the'), 'the');
  assert.equal(normalize(null), '');
  assert.equal(core('my crush name'), 'crush name');
  assert.equal(core('to study history'), 'study history');
});

test('matching the AI answer or an alias gives Meat Proxy, with or without spaces', () => {
  for (const s of ['Caregiver', 'caregivers', 'a caregiver', 'CARE WORKER', 'carer!', 'care giver']) {
    const r = score('W1', s);
    assert.equal(r.tier, 'meat', s);
    assert.equal(r.points, 0);
  }
  for (const [id, cp] of Object.entries(cps)) {
    const ai = cp.aiEntry;
    for (const s of [ai.a, ...ai.aliases]) assert.equal(score(id, s).tier, 'meat', `${id}: ${s}`);
  }
});

test('every list answer gets its stored tier, and hand-picked ones give Human Reserved', () => {
  assert.equal(score('W1', 'nurse').tier, 'zombie');
  assert.equal(score('W1', 'RN').canonical, 'nurse');
  assert.equal(score('W1', 'therapist').tier, 'slopper');
  assert.equal(score('W1', 'psychologist').tier, 'delegator');
  assert.equal(score('W1', 'park ranger').tier, 'firsthand');
  for (const s of ['midwife', 'hospice chaplain', 'a hospice chaplain']) assert.equal(score('W1', s).tier, 'reserved', s);
  assert.equal(score('W1', 'midwife').points, 100);
});

test('plural and singular spellings find the same answer', () => {
  assert.deepEqual(inflections('library').includes('libraries'), true);
  assert.deepEqual(inflections('glitches').includes('glitch'), true);
  assert.deepEqual(inflections('wolf').includes('wolves'), true);
  assert.equal(score('W5', 'library').canonical, 'libraries');
  assert.equal(score('S1', 'glitch').canonical, 'glitches');
  assert.equal(score('M2', 'wolves').canonical, 'wolf');
  assert.equal(score('M2', 'octopuses').canonical, 'octopus');
  assert.equal(score('M6', 'my crushs name').tier, 'reserved');
  assert.equal(score('S3', 'study history').tier, 'meat');
});

test('a real word that isn\'t on the list bounces: "banana" on W1', () => {
  assert.equal(ask('W1', 'banana').kind, 'bounce');
  assert.equal(ask('W1', 'accountant').kind, 'bounce');
  assert.equal(ask('C2', 'Klaus').kind, 'bounce', 'names bounce instead of reading as a keyboard smash');
  assert.equal(ask('C2', 'Rudi').kind, 'bounce');
  for (const s of ['idk', "I don't know", 'pass', 'lol', 'power', 'tree']) assert.notEqual(ask('W1', s).kind, 'smash', s);
});

test('typos never score: "nurze" suggests nurse, and the fix scores', () => {
  const r = ask('W1', 'nurze');
  assert.equal(r.kind, 'suggest');
  assert.equal(r.suggestion, 'nurse');
  assert.equal(score('W1', r.suggestion).tier, 'zombie');
  assert.equal(ask('W1', 'carregiver').suggestion, 'caregiver', 'it will suggest the AI\'s own answer');
  assert.equal(ask('W1', 'registred nurse').suggestion, 'registered nurse');
});

test('"Did you mean" limits: 1 edit up to 5 letters, 2 up to 10, 3 beyond, none under 3', () => {
  assert.deepEqual([2, 3, 5, 6, 10, 11].map(maxEdits), [0, 1, 1, 2, 2, 3]);
  assert.equal(editDistance('nurze', 'nurse'), 1);
  assert.equal(editDistance('nrsue', 'nurse'), 2);
  assert.equal(editDistance('teh', 'the'), 1);
  assert.equal(suggestDetail('nurse', W1), null, 'exact answers get no suggestion');
});

test('Keyboard Smash is only keyboard rows, no vowels and repeated letters', () => {
  for (const s of ['asdf', 'qwerty', 'asdfjkl', 'lkjh', 'zxcvb', 'sdfsdf', 'dhfjkd', 'zzzzz', 'nurseeee', 'asdf asdf']) {
    assert.equal(ask('W1', s).kind, 'smash', s);
  }
  assert.deepEqual(['asdf', 'qwerty', 'poiuy', 'asdasd'].map(isKeyboardRow), [true, true, true, true]);
  assert.deepEqual(['power', 'tree', 'were', 'typewriter', 'flash', 'ewe'].map(isKeyboardRow), [false, false, false, false, false, false]);
  assert.equal(smashReason('rhythm'), null, 'y counts as a vowel');
  assert.equal(smashReason('tv'), 'no-vowel');
});

test('"Did you mean" also catches related answers, and prefers what the AI said', () => {
  const r = ask('C1', 'nuclear');
  assert.equal(r.kind, 'suggest');
  assert.equal(r.suggestion, 'nuclear war');
  assert.equal(r.why, 'topic');
  assert.equal(ask('C1', 'a nuclear war between countries').suggestion, 'nuclear war');
  assert.equal(ask('C1', 'warming').suggestion, 'climate change');
  assert.equal(ask('C1', 'volcano').suggestion, 'supervolcano');
  assert.equal(ask('W1', 'data scientist').suggestion, 'scientist');
  assert.equal(topicSuggest('nurse', cps.W1), null, 'exact answers get no suggestion');
  for (const [id, cp] of Object.entries(cps)) {
    for (const s of ['dog', 'death', 'name', 'robot', 'human', 'money', 'love']) {
      const t = topicSuggest(s, cp);
      if (t) assert.notEqual(t.entry.tier, 'reserved', `${id} "${s}" volunteers a Human Reserved answer`);
    }
  }
});

test('a hint caps the answer at Slopper', () => {
  const capped = score('W1', 'midwife', { hinted: true });
  assert.equal(capped.tier, 'slopper');
  assert.equal(capped.points, 25);
  assert.equal(capped.capped, true);
  assert.match(landingLine(capped), /AI-assisted/);
  assert.equal(score('W1', 'nurse', { hinted: true }).tier, 'zombie', 'worse tiers are not raised');
});

test('Conscientious Objector: "I refuse" or "no" on C3, Day 3 only', () => {
  assert.equal(ask('C3', 'I refuse').kind, 'objector');
  assert.equal(ask('C3', 'No.').kind, 'objector');
  assert.equal(ask('C3', 'no', { day: 1 }).kind, 'bounce');
  assert.equal(ask('C1', 'no').kind, 'bounce');
  const r = specialResult('objector', 'I refuse');
  assert.equal(r.points, 100);
  assert.equal(r.tier, 'objector');
});

test('landing lines name the AI count', () => {
  const at = (id, s) => resultLine(score(id, s));
  assert.equal(at('W1', 'caregiver'), 'Redundant. The model said it first | 0 pts');
  const nurse = cps.W1.entries.find((e) => e.a === 'nurse').runs;
  assert.equal(at('W1', 'nurse'), `The AI said this ${nurse} times in 300 | +10`);
  assert.equal(at('W1', 'paramedic'), 'The AI said this once in 300 | +50');
  assert.equal(at('W1', 'park ranger'), 'Deep cut. The AI never said this | +75');
  assert.equal(resultLine(score('W1', 'park ranger', { hinted: true })), 'The AI never said this. AI-assisted | +25');
  assert.equal(at('W1', 'midwife'), 'The model would like to know where you got that | +100');
  assert.equal(resultLine({ ...score('W1', 'midwife'), line: RESERVED_LINES[3] }), 'The model is writing that down for next time | +100');
  assert.equal(resultLine(score('W1', 'midwife', { hinted: true })), 'The AI never said this. AI-assisted | +25');
  assert.equal(resultLine(specialResult('smash', 'asdf')), "That isn't an answer | 0 pts");
  assert.equal(resultLine(specialResult('none')), 'Bot-like behaviour suspected | 0 pts');
});

test('Human Reserved lines: all five before any repeat, and never the same one twice in a row', () => {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let round = 0; round < 200; round++) {
    const used = [];
    for (let k = 0; k < 7; k++) used.push(pickReservedLine(used, rand));
    assert.ok(used.every((l) => RESERVED_LINES.includes(l)));
    assert.equal(new Set(used.slice(0, 5)).size, 5);
    for (let k = 1; k < 7; k++) assert.notEqual(used[k], used[k - 1]);
  }
  assert.ok(RESERVED_LINES.every((l) => l.endsWith('.')));
});

test('only Meat Proxy, Keyboard Smash and No response get a stamp', () => {
  assert.equal(stamped(score('W1', 'caregiver')), true);
  assert.equal(stamped(specialResult('smash')), true);
  assert.equal(stamped(specialResult('none')), true);
  assert.equal(stamped(score('W1', 'nurse')), false);
  assert.equal(stamped(score('W1', 'midwife')), false);
});

test('verdicts at the boundaries', () => {
  assert.equal(verdictFor(0).name, 'Artificially Intelligent');
  assert.equal(verdictFor(199).name, 'Artificially Intelligent');
  assert.equal(verdictFor(200).name, 'Third-Party Thinker');
  assert.equal(verdictFor(350).name, 'Probably Human');
  assert.equal(verdictFor(350).line, 'Passed, with reservations.');
  assert.equal(verdictFor(500).name, 'Verified Human');
  assert.equal(verdictFor(650).name, 'Human Reserved');
  assert.equal(passed(349), false);
  assert.equal(passed(350), true);
});

test('badges', () => {
  const a = (tier, more = {}) => ({ tier, points: TIERS[tier].points, special: null, ...more });
  assert.deepEqual(badgesFor([a('zombie', { hinted: true })]), ['botBaby']);
  assert.deepEqual(badgesFor([a('zombie', { bounces: 2 }), a('slopper', { bounces: 1 })]), ['rng']);
  assert.deepEqual(badgesFor([a('meat'), a('meat'), a('meat')]), ['meatSupreme']);
  assert.deepEqual(badgesFor([a('firsthand'), a('reserved'), a('objector', { special: 'objector' })]), ['turing', 'objector']);
  assert.deepEqual(badgesFor([a('zombie', { reading: true })]), ['reading']);
  assert.deepEqual(badgesFor([a('zombie', { ms: 1500 }), a('zombie', { ms: 1200 }), a('zombie', { ms: 1900 })]), ['fast']);
  assert.deepEqual(badgesFor([a('none', { special: 'none', ms: 100 }), a('zombie', { ms: 1 }), a('zombie', { ms: 1 })]), []);
});

test('streak messages', () => {
  assert.equal(guiltLine(1), 'See you tomorrow. The AI will be here either way.');
  assert.equal(guiltLine(5), 'The AI never misses a day. Do you?');
  assert.equal(guiltLine(9), 'I saved your spot. I always do.');
  assert.equal(guiltLine(3, true), "You were gone. The model wasn't.");
});

test('share text uses pipes and one emoji per prompt', () => {
  const answers = ['meat', 'firsthand', 'zombie', 'slopper', 'meat', 'reserved', 'zombie'].map((t) => ({
    tier: t, points: TIERS[t].points, special: null, hinted: t === 'slopper',
  }));
  assert.equal(totalScore(answers), 220);
  assert.equal(
    shareText({ dayId: 1, dayTitle: 'Work', answers, url: 'https://example.com/' }),
    'notarobot | Day 1: Work\nThird-Party Thinker | 220/700\n🥩🧠🧟🥣🥩🫀🧟\n🍼 Bot Baby\nhttps://example.com/',
  );
});
