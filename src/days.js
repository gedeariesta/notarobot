// Calendar helpers: day rotation and streaks. Dates are local YYYY-MM-DD keys.

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function keyToUTC(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a, b) {
  return Math.round((keyToUTC(b) - keyToUTC(a)) / 86400000);
}

export function addDays(key, n) {
  const t = new Date(keyToUTC(key) + n * 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** Days cycle 1, 2, 3 from the launch date. Dates before launch keep the same cycle. */
export function dayForDate(key, launchKey) {
  const diff = daysBetween(launchKey, key);
  return (((diff % 3) + 3) % 3) + 1;
}

/** Streak shown before playing: it survives only if the last round was today or yesterday. */
export function liveStreak(streak, today) {
  if (!streak || !streak.last) return 0;
  const gap = daysBetween(streak.last, today);
  return gap <= 1 ? streak.count : 0;
}

/** Updates the streak after a completed scored round. Returns { count, last, justBroken }. */
export function completeStreak(streak, today) {
  if (!streak || !streak.last) return { count: 1, last: today, justBroken: false };
  const gap = daysBetween(streak.last, today);
  if (gap <= 0) return { ...streak, justBroken: false };
  if (gap === 1) return { count: streak.count + 1, last: today, justBroken: false };
  return { count: 1, last: today, justBroken: true };
}

/** Milliseconds until local midnight. */
export function msUntilMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next - now;
}

export function formatHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}
