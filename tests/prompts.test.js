import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compilePrompt, lookup, tierForRuns, RUNS_PER_PROMPT } from '../src/scoring.js';

const bank = JSON.parse(readFileSync(new URL('../prompts.json', import.meta.url)));

test('launch date, run metadata and four days of seven prompts', () => {
  assert.match(bank.launchDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(bank.runs.perPrompt, 300);
  assert.deepEqual(bank.days.map((d) => d.id), [1, 2, 3, 4]);
  for (const d of bank.days) assert.equal(d.prompts.length, 7, `day ${d.id}`);
  const ids = bank.days.flatMap((d) => d.prompts.map((p) => p.id));
  assert.equal(new Set(ids).size, ids.length);
});

for (const day of bank.days) {
  for (const p of day.prompts) {
    test(`${p.id}: runs, tiers, hint and lookups agree`, () => {
      assert.ok(p.text.startsWith('Name '), 'every prompt is a "Name a..." category');
      const runs = p.answers.reduce((s, a) => s + a.runs, 0);
      assert.equal(runs, RUNS_PER_PROMPT, 'runs sum to 300');

      const ai = p.answers.find((a) => a.a === p.ai);
      assert.equal(ai.tier, 'meat', 'the sealed answer is Meat Proxy');
      assert.ok(p.answers.every((a) => a === ai || a.runs < ai.runs), 'the sealed answer is the most common');
      assert.equal(p.answers.filter((a) => a.tier === 'meat').length, 1);

      const ranked = p.answers.filter((a) => a.runs > 0).sort((x, y) => y.runs - x.runs);
      assert.equal(p.hint, ranked[1].a, 'hint is the second most common answer');

      for (const a of p.answers) {
        if (a === ai) continue;
        if (a.tier === 'reserved') assert.equal(a.runs, 0, `${a.a}: Human Reserved needs 0 runs`);
        else assert.equal(a.tier, tierForRuns(a.runs), `${a.a}: tier matches its runs`);
      }
      const reserved = p.answers.filter((a) => a.tier === 'reserved').length;
      assert.ok(reserved >= 1 && reserved <= 8, `${reserved} Human Reserved answers`);

      const cp = compilePrompt(p);
      assert.deepEqual(cp.conflicts, [], 'no two answers read the same');
      for (const a of p.answers) {
        assert.equal(lookup(a.a, cp)?.a, a.a, `"${a.a}" finds itself`);
        for (const al of a.aliases || []) assert.equal(lookup(al, cp)?.a, a.a, `alias "${al}" finds "${a.a}"`);
      }
    });
  }
}

test('Days 1 to 3 have full lists; the closed prompts stay short', () => {
  for (const p of bank.days.slice(0, 3).flatMap((d) => d.prompts)) {
    if (p.id === 'C2' || p.id === 'M1') assert.ok(p.answers.length < 20, `${p.id} is a closed list`);
    else assert.ok(p.answers.length >= 100, `${p.id} has ${p.answers.length} answers`);
  }
});

test('the class plays Day 1: Work live on December 1', async () => {
  const { dayForDate } = await import('../src/days.js');
  assert.equal(dayForDate('2026-12-01', bank.launchDate), 1);
});
