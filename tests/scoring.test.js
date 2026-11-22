import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalize, compilePrompt, scoreAnswer, invalidReason, formatShare, tierForShare,
  editDistance, suggest, suggestDetail, verdictFor, passed, badgesFor, guiltLine, shareText,
  stampSubline, resultLine,
} from '../src/scoring.js';

const bank = JSON.parse(readFileSync(new URL('../prompts.json', import.meta.url)));
const byId = Object.fromEntries(bank.days.flatMap((d) => d.prompts.map((p) => [p.id, compilePrompt(p)])));
const W1 = byId.W1;

test('normalize: case, punctuation, articles, trailing s', () => {
  assert.equal(normalize('  The Nurses! '), 'nurse');
  assert.equal(normalize('A Caregiver.'), 'caregiver');
  assert.equal(normalize('an apple'), 'apple');
  assert.equal(normalize('R2-D2'), 'r2d2');
  assert.equal(normalize("Don't   lie"), 'dont lie');
  assert.equal(normalize('ads'), 'ads'); // three letters keep their s
  assert.equal(normalize('Streaks and Likes'), 'streak and like');
  assert.equal(normalize('the'), 'the'); // a lone article is not stripped
  assert.equal(normalize(null), '');
});

test('matching the AI answer or an alias always gives Meat Proxy', () => {
  for (const s of ['Caregiver', 'caregivers', 'a caregiver', 'CARE WORKER', 'carer!']) {
    const r = scoreAnswer(s, W1, { day: 1 });
    assert.equal(r.tier, 'meat', s);
    assert.equal(r.points, 0);
  }
  for (const cp of Object.values(byId)) {
    for (const s of [cp.raw.ai.answer, ...cp.raw.ai.aliases]) {
      assert.equal(scoreAnswer(s, cp, { day: 3 }).tier, 'meat', `${cp.id}: ${s}`);
    }
  }
});

test('Meat Proxy wins even when the pool says the answer is rare', () => {
  assert.equal(scoreAnswer('caregiver', W1, { pool: {} }).tier, 'meat');
});

test('aliases fold into one answer and skip the shape checks', () => {
  const rn = scoreAnswer('RN', W1, { day: 1 });
  assert.equal(rn.canonical, 'nurse');
  assert.equal(rn.tier, 'zombie');
  assert.equal(scoreAnswer('registered nurses', W1).canonical, 'nurse');
  assert.equal(scoreAnswer('R2-D2', byId.C5).tier !== 'smash', true);
  assert.equal(scoreAnswer('AC', byId.C5).tier, 'firsthand');
});

test('rarity tiers from the seeded sample', () => {
  assert.equal(scoreAnswer('nurse', W1).tier, 'zombie'); // 43%
  assert.equal(scoreAnswer('teacher', W1).tier, 'zombie'); // 25 -> 26/101
  assert.equal(scoreAnswer('therapist', W1).tier, 'slopper'); // 15
  assert.equal(scoreAnswer('doctor', W1).tier, 'delegator'); // 9 -> 10/101 = 9.9%
  assert.equal(scoreAnswer('park ranger', W1).tier, 'delegator'); // 5 -> 6/101
  assert.equal(scoreAnswer('midwife', W1).tier, 'firsthand'); // 1 -> 2/101
  const fresh = scoreAnswer('deep sea welder', W1);
  assert.equal(fresh.tier, 'reserved');
  assert.equal(fresh.points, 100);
  assert.equal(fresh.isNew, true);
});

test('live answers on this device shift the share', () => {
  const pool = { 'deep sea welder': 40 }; // 41 of 141
  const r = scoreAnswer('deep sea welder', W1, { pool });
  assert.equal(r.tier, 'zombie');
  assert.equal(r.isNew, false);
});

test('Keyboard Smash filter', () => {
  for (const s of ['q', 'xkcd', 'zzzz', 'loooool', 'idk', 'IDK', 'no', 'nothing', 'n/a', 'shit', 'fucking robots']) {
    assert.equal(scoreAnswer(s, W1, { day: 1 }).tier, 'smash', s);
  }
  assert.equal(scoreAnswer(W1.text, W1).tier, 'smash');
  // Weird but real answers pass.
  assert.equal(scoreAnswer('loool', W1).tier, 'reserved');
  assert.equal(scoreAnswer('Philip K. Dick', byId.C5).tier, 'reserved');
  assert.equal(invalidReason('déjà', W1), null);
});

test('C2 only accepts its valid set', () => {
  const C2 = byId.C2;
  assert.equal(scoreAnswer('teddy bear kid', C2).canonical, 'david');
  assert.equal(scoreAnswer('the boy', C2).tier, 'zombie');
  assert.equal(scoreAnswer('Tasso', C2).tier, 'zombie');
  assert.equal(scoreAnswer('Klaus', C2).tier, 'firsthand');
  assert.equal(scoreAnswer('The wounded soldier', C2).tier, 'meat');
  assert.equal(scoreAnswer('Frank', C2).tier, 'smash');
});

test('Conscientious Objector: Day 3, C3, "I refuse" or "no"', () => {
  const C3 = byId.C3;
  for (const s of ['I refuse', 'i refuse.', 'No', 'no']) {
    const r = scoreAnswer(s, C3, { day: 3 });
    assert.equal(r.special, 'objector', s);
    assert.equal(r.points, 100);
  }
  assert.equal(scoreAnswer('no', C3, { day: 1 }).tier, 'smash');
  assert.equal(scoreAnswer('no', W1, { day: 3 }).tier, 'smash');
  assert.equal(scoreAnswer('no', C3, { day: 3, hinted: true }).tier, 'smash');
});

test('a hinted prompt never scores above 25', () => {
  const cases = ['deep sea welder', 'midwife', 'park ranger', 'therapist', 'nurse', 'caregiver'];
  for (const s of cases) {
    const r = scoreAnswer(s, W1, { hinted: true });
    assert.ok(r.points <= 25, `${s} scored ${r.points}`);
  }
  const capped = scoreAnswer('midwife', W1, { hinted: true });
  assert.equal(capped.tier, 'slopper');
  assert.equal(capped.capped, true);
  assert.match(stampSubline(capped), /AI-assisted/);
  assert.equal(scoreAnswer('nurse', W1, { hinted: true }).tier, 'zombie');
});

test('stamp and verdict lines', () => {
  assert.equal(resultLine(scoreAnswer('caregiver', W1)), 'The model said this | 0 pts');
  assert.equal(resultLine(scoreAnswer('zzzz', W1)), "That isn't an answer | 0 pts");
  assert.equal(resultLine(scoreAnswer('', W1)), 'Bot-like behaviour suspected | 0 pts');
  assert.equal(resultLine(scoreAnswer('nurse', W1)), '44% of humans said this | +10');
  assert.equal(resultLine(scoreAnswer('midwife', W1)), 'Only 2% of humans said this | +75');
  assert.equal(resultLine(scoreAnswer('deep sea welder', W1)), 'Almost nobody said this | +100');
  assert.equal(resultLine(scoreAnswer('midwife', W1, { hinted: true })), '2% of humans said this. AI-assisted | +25');
  assert.equal(resultLine(scoreAnswer('I refuse', byId.C3, { day: 3 })), 'Refusal noted | +100');
});

test('timeout gives No response', () => {
  const r = scoreAnswer('   ', W1);
  assert.equal(r.tier, 'none');
  assert.equal(stampSubline(r), 'Bot-like behaviour suspected.');
});

test('share formatting never crosses a tier boundary', () => {
  assert.equal(formatShare(42.57), '43');
  assert.equal(formatShare(24.8), '24.8');
  assert.equal(formatShare(9.9), '9.9');
  assert.equal(formatShare(3.96), '3.9');
  assert.equal(formatShare(24.96), '24.9');
  assert.equal(formatShare(1.98), '2');
  assert.equal(tierForShare(25), 'zombie');
  assert.equal(tierForShare(10), 'slopper');
  assert.equal(tierForShare(4), 'delegator');
  assert.equal(tierForShare(1), 'firsthand');
  assert.equal(tierForShare(0.99), 'reserved');
});

test('Damerau-Levenshtein distance', () => {
  assert.equal(editDistance('ca', 'ac'), 1);
  assert.equal(editDistance('carregiver', 'caregiver'), 1);
  assert.equal(editDistance('nurse', 'nurse'), 0);
  assert.equal(editDistance('kitten', 'sitting'), 3);
});

test('autocorrect suggestions', () => {
  assert.equal(suggest('carregiver', W1), 'caregiver'); // suggests the AI's own answer
  assert.equal(suggest('caregiver', W1), null);
  assert.equal(suggest('nurse', W1), null);
  assert.equal(suggest('nrse', W1), 'nurse');
  assert.equal(suggest('zz', W1), null);
  assert.equal(suggest('therapsit', W1), 'therapist');
  assert.equal(suggest('completely different', W1), null);
  assert.equal(suggest('dug', byId.M2), 'dog');
  assert.deepEqual(suggestDetail('carregiver', W1), { text: 'caregiver', edits: 1 });
  assert.deepEqual(suggestDetail('park rangre', W1), { text: 'park ranger', edits: 1 });
  assert.equal(suggestDetail('therpst', W1).edits, 2);
});

test('autocorrect ties go to the more common answer', () => {
  const cp = compilePrompt({
    id: 'T', text: 'Name a thing.', source: '',
    ai: { answer: 'zzz', aliases: [] }, aliases: {},
    seed: { cart: 10, carp: 40, card: 50 }, hint: 'carp', validSet: null,
  });
  assert.equal(suggest('carx', cp), 'card');
});

test('round verdicts', () => {
  assert.equal(verdictFor(0).name, 'Artificially Intelligent');
  assert.equal(verdictFor(199).name, 'Artificially Intelligent');
  assert.equal(verdictFor(200).name, 'Third-Party Thinker');
  assert.equal(verdictFor(349).name, 'Third-Party Thinker');
  assert.equal(verdictFor(350).name, 'Probably Human');
  assert.equal(verdictFor(499).name, 'Probably Human');
  assert.equal(verdictFor(500).name, 'Verified Human');
  assert.equal(verdictFor(649).name, 'Verified Human');
  assert.equal(verdictFor(650).name, 'Human Reserved');
  assert.equal(verdictFor(700).name, 'Human Reserved');
  assert.equal(passed(349), false);
  assert.equal(passed(350), true);
});

test('badges', () => {
  const a = (tier, extra = {}) => ({ tier, special: null, hinted: false, isNew: false, ms: 5000, ...extra });
  assert.deepEqual(badgesFor([a('zombie', { hinted: true })]), ['botBaby']);
  assert.ok(badgesFor([a('reserved', { isNew: true }), a('reserved', { isNew: true }), a('reserved', { isNew: true })]).includes('rng'));
  assert.ok(badgesFor([a('meat'), a('meat'), a('meat')]).includes('meatSupreme'));
  assert.ok(badgesFor(Array(7).fill(a('firsthand'))).includes('turing'));
  assert.ok(!badgesFor([...Array(6).fill(a('firsthand')), a('smash', { special: 'smash' })]).includes('turing'));
  assert.ok(badgesFor([a('reserved', { special: 'objector' })]).includes('objector'));
  assert.ok(badgesFor([a('zombie', { ms: 900 }), a('zombie', { ms: 1500 }), a('zombie', { ms: 1999 })]).includes('fast'));
  assert.ok(!badgesFor([a('none', { special: 'none', ms: 100 }), a('zombie', { ms: 1500 }), a('zombie', { ms: 1999 })]).includes('fast'));
});

test('guilt lines by streak', () => {
  assert.match(guiltLine(1), /See you tomorrow/);
  assert.match(guiltLine(2), /Two days/);
  assert.match(guiltLine(3), /Leaving already/);
  assert.match(guiltLine(5), /never misses/);
  assert.match(guiltLine(9), /saved your spot/);
  assert.match(guiltLine(1, true), /You were gone/);
});

test('share text format', () => {
  const answers = [
    { tier: 'meat', points: 0 }, { tier: 'firsthand', points: 75 }, { tier: 'zombie', points: 10 },
    { tier: 'slopper', points: 25, hinted: true }, { tier: 'meat', points: 0 }, { tier: 'reserved', points: 100 },
    { tier: 'zombie', points: 10 },
  ];
  const text = shareText({ dayId: 1, dayTitle: 'Work', answers, url: 'https://example.test/' });
  assert.equal(text, 'notarobot | Day 1: Work\nThird-Party Thinker | 220/700\n🥩🧠🧟🥣🥩🫀🧟\n🍼 Bot Baby\nhttps://example.test/');
});
