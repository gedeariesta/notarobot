// Small shared UI helpers and square-capped line icons.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const svg = (body, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  lock: svg('<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  arrow: '<span class="arrow" aria-hidden="true">→</span>',
};

/** Parses one HTML string into its first element. */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Lowercases a display answer unless it carries deliberate capitals (HAL 9000, R2-D2). */
export function casual(s) {
  return /[A-Z]/.test(String(s).slice(1)) ? s : String(s).toLowerCase();
}

/** Curly quotes and apostrophes for display text. */
export function smartQuotes(s) {
  return String(s)
    .replace(/(^|[\s(\[])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/'/g, '’');
}

/** Two-digit numbers for labels: 3 -> "03". */
export const pad2 = (n) => String(n).padStart(2, '0');

/** One word per line, so big verdicts break the way the design pack sets them. */
export function wordLines(text) {
  return String(text).split(' ').map((w) => `<span>${esc(w)}</span>`).join('');
}

/** Shrinks an element's font size until its widest line fits its own width. */
export function fitText(node, max, min = 24) {
  let size = max;
  node.style.fontSize = `${size}px`;
  while (size > min && node.scrollWidth > node.clientWidth + 1) {
    size -= 2;
    node.style.fontSize = `${size}px`;
  }
  return size;
}

/**
 * Marks the letters of `to` that are not in `from` (longest common subsequence),
 * so the autocorrect card can highlight what it changed.
 */
export function markChanges(from, to) {
  const a = [...from.toLowerCase()];
  const b = [...to];
  const bl = b.map((c) => c.toLowerCase());
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === bl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const keep = new Set();
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === bl[j]) { keep.add(j); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return b.map((c, j) => (keep.has(j) || c === ' ' ? esc(c) : `<mark>${esc(c)}</mark>`)).join('');
}
