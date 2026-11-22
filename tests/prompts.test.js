import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compilePrompt, scoreAnswer, normalize } from '../src/scoring.js';

const bank = JSON.parse(readFileSync(new URL('../prompts.json', import.meta.url)));

test('launch date and four days of seven prompts', () => {
  assert.match(bank.launchDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(bank.days.map((d) => d.id), [1, 2, 3, 4]);
  for (const d of bank.days) assert.equal(d.prompts.length, 7, `day ${d.id}`);
  const ids = bank.days.flatMap((d) => d.prompts.map((p) => p.id));
  assert.equal(new Set(ids).size, ids.length);
});

for (const day of bank.days) {
  for (const p of day.prompts) {
    test(`${p.id}: seed, hint and AI answer are consistent`, () => {
      assert.ok(p.text.startsWith('Name '), 'prompt starts with "Name"');
      const cp = compilePrompt(p);
      const sum = Object.values(p.seed).reduce((a, b) => a + b, 0);
      assert.equal(sum, 100, 'seed sums to 100');
      assert.ok(Object.values(p.seed).includes(1), 'rare examples sit in the seed at count 1');

      const ranked = [...cp.seed.entries()].sort((a, b) => b[1] - a[1]);
      assert.equal(cp.canon(normalize(p.hint)), ranked[1][0], 'hint is the second most common seed answer');
      assert.notEqual(scoreAnswer(p.hint, cp, { day: day.id }).tier, 'meat', 'hint is never the AI answer');

      for (const k of Object.keys(p.seed)) {
        const r = scoreAnswer(k, cp, { day: day.id });
        assert.notEqual(r.tier, 'meat', `seed answer "${k}" collides with the AI answer`);
        assert.notEqual(r.tier, 'smash', `seed answer "${k}" fails the filter`);
      }
    });
  }
}

test('the class plays Day 1: Work live on December 1', async () => {
  const { dayForDate } = await import('../src/days.js');
  assert.equal(dayForDate('2026-12-01', bank.launchDate), 1);
});
