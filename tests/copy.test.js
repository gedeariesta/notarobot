import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// DESIGN.md, Copy and tone: no middle dots anywhere. Pipes separate things instead.
const root = new URL('../', import.meta.url);
const files = ['index.html', 'styles.css', 'prompts.json', ...readdirSync(new URL('src/', root)).map((f) => `src/${f}`)];

test('no middle dots in anything the game ships', () => {
  for (const f of files) {
    const text = readFileSync(new URL(f, root), 'utf8');
    const at = text.indexOf('·');
    assert.equal(at, -1, `${f} has a middle dot near: ${text.slice(Math.max(0, at - 30), at + 30)}`);
  }
});
