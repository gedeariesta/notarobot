// Tiers are shapes (DESIGN.md, Visual design system). Paths come from the v2 system
// artboard of the design pack, all in a 0 to 100 box. The rarer the answer, the less
// geometric its specimen.

export const SHAPES = {
  // The answer before the machine has judged it: a soft, unverified blob.
  subject: { d: 'M34.4 9 C56.8 2.2 76.9 17.9 85.9 35.8 C94.8 53.8 90.4 76.2 74.7 87.4 C59 98.6 34.4 96.3 20.9 82.9 C7.5 69.4 5.2 49.3 14.2 31.4 C18.7 20.2 25.4 13.4 34.4 9 Z' },
  square: { d: 'M8 8 L92 8 L92 92 L8 92 Z' },
  circle: { d: 'M50 6 C74.3 6 94 25.7 94 50 C94 74.3 74.3 94 50 94 C25.7 94 6 74.3 6 50 C6 25.7 25.7 6 50 6 Z' },
  wobble: { d: 'M52 5 C78 7 95 27 93 52 C91 77 72 95 47 94 C22 93 5 74 7 48 C9 22 27 3 52 5Z' },
  dent: { d: 'M54 4 C76 8 96 26 94 50 C93 66 98 80 84 90 C70 99 50 92 34 96 C18 98 6 84 6 66 C6 50 2 36 12 22 C22 8 38 2 54 4Z' },
  lump: {
    d: 'M55 4 C70 2 84 14 88 28 C93 42 99 52 92 66 C85 82 70 97 50 95 C34 93 26 84 14 76 C3 68 2 52 8 38 C14 22 22 8 38 6 C44 5 49 5 55 4Z',
    holes: [{ cx: 40, cy: 40, rx: 6, ry: 4 }],
  },
  splatter: {
    d: 'M48 10 C58 4 66 14 72 12 C84 8 94 22 88 34 C84 44 96 52 90 64 C84 76 72 74 66 84 C58 94 44 92 36 86 C28 80 16 84 10 72 C4 60 16 54 12 42 C8 30 22 22 30 20 C38 18 40 14 48 10Z',
    holes: [{ cx: 44, cy: 44, rx: 7, ry: 4 }, { cx: 62, cy: 64, rx: 3, ry: 2 }],
    drops: [{ cx: 96, cy: 10, r: 4 }, { cx: 4, cy: 94, r: 3 }, { cx: 98, cy: 88, r: 2.5 }],
  },
};

/** The shape each tier ends on. */
export const TIER_SHAPE = {
  meat: 'square',
  zombie: 'circle',
  slopper: 'wobble',
  delegator: 'dent',
  firsthand: 'lump',
  reserved: 'splatter',
  smash: 'dashed',
  none: 'dot',
};

/** The shape the falling blob takes in each layer of the Screening, top to bottom. */
export const LAYER_SHAPE = ['subject', 'circle', 'wobble', 'dent', 'lump', 'splatter'];

/** Inner SVG markup for a shape in the 0 to 100 box. Colours come from CSS classes. */
export function shapeMarkup(name) {
  if (name === 'dashed') {
    return '<rect class="sp-line" x="10" y="10" width="80" height="80" stroke-width="7" stroke-dasharray="12 9"/>';
  }
  if (name === 'dot') return '<circle class="sp-body" cx="50" cy="50" r="16"/>';
  const s = SHAPES[name];
  let out = `<path class="sp-body" d="${s.d}"/>`;
  for (const h of s.holes || []) out += `<ellipse class="sp-hole" cx="${h.cx}" cy="${h.cy}" rx="${h.rx}" ry="${h.ry}"/>`;
  for (const p of s.drops || []) out += `<circle class="sp-body" cx="${p.cx}" cy="${p.cy}" r="${p.r}"/>`;
  return out;
}

/** A tier's specimen as a standalone SVG. */
export function specimenSVG(tier, size = 22, label = '') {
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="specimen" width="${size}" height="${size}" viewBox="0 0 100 100" ${a11y}>${shapeMarkup(TIER_SHAPE[tier])}</svg>`;
}

/** Specimen progress: the current prompt is a dashed circle, the rest are faint outlines. */
export function pendingSVG(size = 22, current = false) {
  const ring = current
    ? '<circle class="sp-line" cx="50" cy="50" r="44" stroke-width="8" stroke-dasharray="14 10"/>'
    : '<circle class="sp-line sp-faint" cx="50" cy="50" r="44" stroke-width="5"/>';
  return `<svg class="specimen" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${ring}</svg>`;
}
