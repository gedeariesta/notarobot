// A plate: one particle figure plus its annotation kit (callouts on leader lines ending in open
// circles, + crosshairs, a FIG caption and a scale bar). Callouts are pinned to points of the
// figure, so they follow it when the layout or the figure changes.
import { Figure, samplePath, radiusFor, rng } from './specimen.js';
import { FIGURES } from './figures.js';
import { esc } from './ui.js';

const shapeCache = new Map();

/** Particle positions for a named figure (cached: sampling reads a mask, once per figure). */
export function figureShape(name, n, seed = name) {
  const key = `${name}|${n}|${seed}`;
  if (!shapeCache.has(key)) {
    const f = FIGURES[name];
    shapeCache.set(key, samplePath(n, f.d, { box: f.box, seed, grooves: f.grooves, groove: f.groove, porosity: f.porosity }));
  }
  return shapeCache.get(key);
}

/** A loose cloud of particles, for figures to assemble from or come apart into. */
export function dust(n, seed = 'dust', spread = 1.5) {
  const r = rng(seed);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 0.6) * spread * 0.5;
    out[i * 2] = Math.cos(a) * d;
    out[i * 2 + 1] = Math.sin(a) * d;
  }
  return out;
}

/** A point of a figure, from its drawing box into the figure's own units (longer side = 1). */
export function figPoint(name, ax, ay) {
  const [bx, by, bw, bh] = FIGURES[name].box;
  const m = Math.max(bw, bh);
  return [(ax - bx - bw / 2) / m, (ay - by - bh / 2) / m];
}

export function plateHTML({ cap = '', scale = '', cls = '' } = {}) {
  return `<figure class="plate ${cls}" aria-hidden="true">
    <canvas class="plate-canvas"></canvas>
    <svg class="plate-lines"></svg>
    <div class="plate-labels"></div>
    <span class="cross tl">+</span><span class="cross tr">+</span><span class="cross bl">+</span><span class="cross br">+</span>
    <div class="plate-cap mono"><i class="sq"></i><span class="cap-text">${esc(cap)}</span></div>
    ${scale ? `<div class="plate-scale mono"><span>${esc(scale)}</span><i class="bar"></i></div>` : ''}
  </figure>`;
}

export class Plate {
  /**
   * root: a .plate element. layout(w, h, name) returns { x, y, size } in CSS px for a figure.
   */
  constructor(root, { count = 2400, color = '#1F3CFF', seed = 'plate', reduced = false, layout, fill = 0.5 } = {}) {
    this.root = root;
    this.canvas = root.querySelector('.plate-canvas');
    this.svg = root.querySelector('.plate-lines');
    this.labelsEl = root.querySelector('.plate-labels');
    this.capEl = root.querySelector('.cap-text');
    this.layout = layout || ((w, h) => ({ x: w / 2, y: h / 2, size: Math.min(w, h) * 0.9 }));
    this.fig = new Figure(this.canvas, { count, radius: radiusFor(count, fill), color, seed, reduced });
    this.count = count;
    this.names = [];
    this.current = null;
    this.callouts = [];
    this.onResize = () => this.place();
    window.addEventListener('resize', this.onResize);
  }

  get ok() { return this.fig.ok; }

  /** Registers a named figure (or raw points under a name) and returns its shape index. */
  add(name, pts = null) {
    const i = this.fig.addShape(pts || figureShape(name, this.count, `${name}-${this.count}`));
    this.names[i] = name;
    return i;
  }

  /** Places the figure for its current shape and redraws the callouts. */
  place(name = this.current) {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!w || !h) return;
    this.current = name;
    Object.assign(this.fig.state, this.layout(w, h, name));
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svg.setAttribute('width', w);
    this.svg.setAttribute('height', h);
    this.drawCallouts();
    this.fig.render();
  }

  setCaption(text) {
    if (this.capEl) this.capEl.textContent = text;
  }

  /**
   * Callouts: [{ text, at: [x, y] in the figure's drawing box, dx, dy }] where (dx, dy) is where the
   * label sits relative to the point, in px. The leader runs from an open circle to the label.
   */
  setCallouts(name, list) {
    this.calloutFor = name;
    this.callouts = list;
    this.labelsEl.innerHTML = list.map((c, i) => `<span class="callout-l mono" data-i="${i}">(&nbsp;${esc(c.text)}&nbsp;)</span>`).join('');
    this.drawCallouts();
  }

  anchor(name, at) {
    const s = this.fig.state;
    const [nx, ny] = figPoint(name, at[0], at[1]);
    return [s.x + nx * s.size, s.y + ny * s.size];
  }

  drawCallouts() {
    if (!this.callouts.length) { this.svg.innerHTML = ''; return; }
    const w = this.root.clientWidth;
    let lines = '';
    this.callouts.forEach((c, i) => {
      const [ax, ay] = this.anchor(this.calloutFor, c.at);
      const label = this.labelsEl.querySelector(`[data-i="${i}"]`);
      const lw = label ? label.offsetWidth + 6 : 0;
      const right = c.dx >= 0;
      // Keep the label inside the plate: shorten the leader rather than push text off the edge.
      const lx = right ? Math.min(w - lw, ax + c.dx) : Math.max(lw, ax + c.dx);
      const ly = Math.max(10, ay + c.dy);
      const elbow = ax + c.dx * 0.55;
      // A paper-coloured halo under each leader, so it cuts across the scan instead of vanishing.
      const d = `M${ax} ${ay} L${elbow} ${ly} L${lx} ${ly}`;
      lines += `<path class="halo" d="${d}"/><path d="${d}"/><circle cx="${ax}" cy="${ay}" r="3.5"/>`;
      if (label) {
        label.style.top = `${ly - 6}px`;
        if (right) { label.style.left = `${lx + 4}px`; label.style.right = 'auto'; }
        else { label.style.right = `${w - lx + 4}px`; label.style.left = 'auto'; }
      }
    });
    this.svg.innerHTML = lines;
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.fig.destroy();
  }
}
