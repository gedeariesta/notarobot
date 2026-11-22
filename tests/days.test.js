import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayForDate, daysBetween, addDays, liveStreak, completeStreak, formatHMS } from '../src/days.js';

test('day rotation cycles 1, 2, 3 from the launch date', () => {
  const L = '2026-11-24';
  assert.equal(dayForDate(L, L), 1);
  assert.equal(dayForDate('2026-11-25', L), 2);
  assert.equal(dayForDate('2026-11-26', L), 3);
  assert.equal(dayForDate('2026-11-27', L), 1);
  assert.equal(dayForDate('2026-11-23', L), 3);
  assert.equal(dayForDate('2026-11-21', L), 1);
});

test('date arithmetic crosses months', () => {
  assert.equal(daysBetween('2026-11-30', '2026-12-01'), 1);
  assert.equal(addDays('2026-11-30', 2), '2026-12-02');
});

test('streaks', () => {
  assert.equal(liveStreak(null, '2026-11-25'), 0);
  assert.equal(liveStreak({ count: 3, last: '2026-11-24' }, '2026-11-25'), 3);
  assert.equal(liveStreak({ count: 3, last: '2026-11-23' }, '2026-11-25'), 0);
  assert.deepEqual(completeStreak(null, '2026-11-25'), { count: 1, last: '2026-11-25', justBroken: false });
  assert.deepEqual(completeStreak({ count: 2, last: '2026-11-24' }, '2026-11-25'), { count: 3, last: '2026-11-25', justBroken: false });
  assert.deepEqual(completeStreak({ count: 2, last: '2026-11-25' }, '2026-11-25'), { count: 2, last: '2026-11-25', justBroken: false });
  assert.deepEqual(completeStreak({ count: 5, last: '2026-11-20' }, '2026-11-25'), { count: 1, last: '2026-11-25', justBroken: true });
});

test('countdown format', () => {
  assert.equal(formatHMS(3723000), '01:02:03');
  assert.equal(formatHMS(-5), '00:00:00');
});
