// Point-cloud specimens. Every human thing in notarobot is drawn the way a lab scan would draw it:
// hundreds of particles fused into one porous blob, with holes where the scan is thin and loose
// droplets at the edge. Machine things snap to a grid.
//
// Rendering is two WebGL passes: particles splat a density field into a half-resolution buffer,
// then a full-screen pass thresholds it into a crisp, anti-aliased silhouette in one colour.
// Shapes are point sets; a Figure moves the same particles between them, so a GSAP timeline can
// drive (and seek) every morph through figure.state.

const VS_POINTS = `
attribute vec3 a_p;
uniform vec2 u_res;
uniform float u_scale;
void main() {
  vec2 p = a_p.xy * u_scale;
  vec2 clip = (p / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = max(1.0, a_p.z * u_scale * 2.0);
}`;
const FS_POINTS = `
precision mediump float;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = dot(c, c);
  if (d > 1.0) discard;
  float f = 1.0 - d;
  gl_FragColor = vec4(f * f * 0.55);
}`;
const VS_QUAD = `
attribute vec2 a_q;
varying vec2 v_uv;
void main() { v_uv = a_q * 0.5 + 0.5; gl_Position = vec4(a_q, 0.0, 1.0); }`;
const FS_QUAD = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_field;
uniform vec3 u_color;
uniform float u_alpha;
void main() {
  float v = texture2D(u_field, v_uv).r;
  float a = smoothstep(0.30, 0.36, v) * u_alpha;
  gl_FragColor = vec4(u_color * a, a);
}`;

const hexToRgb = (hex) => {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

// ------------------------------------------------------------------ randomness and noise

/** Deterministic random numbers, so the same answer always makes the same specimen. */
export function rng(seed = 1) {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 2D value noise in [0, 1]. */
function makeNoise(seed) {
  const r = rng(seed);
  const P = new Float32Array(256).map(() => r());
  const h = (x, y) => P[(x * 73 + y * 151 + ((x * y) & 31)) & 255];
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = s(x - xi);
    const yf = s(y - yi);
    const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * xf;
    const b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * xf;
    return a + (b - a) * yf;
  };
}

// ------------------------------------------------------------------ shapes (point sets)

const maskCache = new Map();

/** A filled mask of an SVG path (and optional grooves cut through it), sampled once. */
function pathMask(d, box, grooves, groove) {
  const key = `${d}|${box}|${grooves || ''}|${groove}`;
  if (maskCache.has(key)) return maskCache.get(key);
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const [bx, by, bw, bh] = box;
  const k = S / Math.max(bw, bh);
  ctx.setTransform(k, 0, 0, k, -bx * k + (S - bw * k) / 2, -by * k + (S - bh * k) / 2);
  ctx.fillStyle = '#000';
  ctx.fill(new Path2D(d), 'evenodd');
  if (grooves) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = groove;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(grooves));
  }
  const data = ctx.getImageData(0, 0, S, S).data;
  const mask = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) mask[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  const out = { mask, S, aspect: bw / bh };
  maskCache.set(key, out);
  return out;
}

/**
 * Samples n particles inside an SVG path, porous like a scan: noise thins some regions into holes,
 * and a few droplets land just outside the edge. Returns positions centred on 0, scaled so the
 * longer side is 1 (Float32Array, x then y).
 */
export function samplePath(n, d, opts = {}) {
  const {
    box = [0, 0, 100, 100], seed = 'shape', porosity = 0.26, holeScale = 11, drops = 0.008,
    grooves = null, groove = 8, edge = 0.03, jitter = 0.45,
  } = opts;
  const { mask, S } = pathMask(d, box, grooves, groove);
  const r = rng(seed);
  const noise = makeNoise(`${seed}n`);
  const noise2 = makeNoise(`${seed}m`);
  const inside = (x, y) => {
    const ix = Math.floor(x * S);
    const iy = Math.floor(y * S);
    return ix >= 0 && iy >= 0 && ix < S && iy < S && mask[iy * S + ix] === 1;
  };
  const nearEdge = (x, y) => {
    for (const [dx, dy] of [[edge, 0], [-edge, 0], [0, edge], [0, -edge], [edge, edge], [-edge, -edge], [edge, -edge], [-edge, edge]]) {
      if (!inside(x + dx, y + dy)) return true;
    }
    return false;
  };
  let area = 0;
  for (let i = 0; i < mask.length; i++) area += mask[i];
  area /= mask.length;

  // An even, jittered grid inside the silhouette: a scan, not a spray.
  const nDrops = Math.round(n * drops);
  const want = n - nDrops;
  const holeP = porosity * 0.55;
  const g = Math.max(4, Math.round(Math.sqrt(want / Math.max(0.02, area * (1 - holeP)))));
  const cells = [];
  for (let gy = 0; gy < g; gy++) {
    for (let gx = 0; gx < g; gx++) {
      const x = (gx + 0.5 + (r() - 0.5) * jitter) / g;
      const y = (gy + 0.5 + (r() - 0.5) * jitter) / g;
      if (!inside(x, y)) continue;
      // Holes: two octaves of smooth noise open "lakes" inside, never through the edge.
      const nz = noise(x * holeScale, y * holeScale) * 0.7 + noise2(x * holeScale * 2.3, y * holeScale * 2.3) * 0.3;
      if (nz < porosity && !nearEdge(x, y)) continue;
      cells.push(x, y);
    }
  }
  // Exactly n particles: thin out or double up at random.
  let pts = cells;
  let m = pts.length / 2;
  while (m > want) {
    const i = Math.floor(r() * m);
    pts[i * 2] = pts[(m - 1) * 2];
    pts[i * 2 + 1] = pts[(m - 1) * 2 + 1];
    m--;
  }
  pts = pts.slice(0, m * 2);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < m; i++) { out[i * 2] = pts[i * 2] - 0.5; out[i * 2 + 1] = pts[i * 2 + 1] - 0.5; }
  let k = m;
  while (k < want && m > 0) {
    const j = Math.floor(r() * m);
    out[k * 2] = out[j * 2] + (r() - 0.5) / g;
    out[k * 2 + 1] = out[j * 2 + 1] + (r() - 0.5) / g;
    k++;
  }
  // Droplets: loose particles just off the edge.
  let guard = 0;
  while (k < n && guard++ < n * 400) {
    const x = r();
    const y = r();
    if (inside(x, y)) continue;
    const reach = 0.012 + r() * r() * 0.05;
    if (![[reach, 0], [-reach, 0], [0, reach], [0, -reach]].some(([dx, dy]) => inside(x + dx, y + dy))) continue;
    out[k * 2] = x - 0.5;
    out[k * 2 + 1] = y - 0.5;
    k++;
  }
  for (; k < n; k++) { out[k * 2] = (r() - 0.5) * 0.05; out[k * 2 + 1] = (r() - 0.5) * 0.05; }
  return sortPolar(out);
}

/** A good particle radius (in shape units) for n particles filling about `fill` of the box. */
export function radiusFor(n, fill = 0.5) {
  return 1.5 / Math.sqrt(n / fill);
}

/** A perfect grid: the machine's way of holding a shape. */
export function sampleGrid(n, { w = 1, h = 1 } = {}) {
  const cols = Math.ceil(Math.sqrt((n * w) / h));
  const rows = Math.ceil(n / cols);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const cx = i % cols;
    const cy = Math.floor(i / cols);
    out[i * 2] = ((cx + 0.5) / cols - 0.5) * w;
    out[i * 2 + 1] = ((cy + 0.5) / rows - 0.5) * h;
  }
  return sortPolar(out);
}

/** All particles on one point: an answer with nothing in it. */
export function samplePoint(n, size = 0.05, seed = 'dot') {
  const r = rng(seed);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * size * 0.5;
    out[i * 2] = Math.cos(a) * rad;
    out[i * 2 + 1] = Math.sin(a) * rad;
  }
  return sortPolar(out);
}

/** Particles ordered by angle, then radius, so morphs move each one only a short way. */
function sortPolar(pts) {
  const n = pts.length / 2;
  const idx = Array.from({ length: n }, (_, i) => i);
  const key = idx.map((i) => {
    const x = pts[i * 2];
    const y = pts[i * 2 + 1];
    const ang = Math.atan2(y, x);
    const band = Math.floor(Math.hypot(x, y) * 6);
    return band * 10 + (ang + Math.PI);
  });
  idx.sort((a, b) => key[a] - key[b]);
  const out = new Float32Array(pts.length);
  idx.forEach((src, i) => { out[i * 2] = pts[src * 2]; out[i * 2 + 1] = pts[src * 2 + 1]; });
  return out;
}

/** Several shapes side by side in one point set (the results figure draws seven at once). */
export function combine(parts) {
  const total = parts.reduce((s, p) => s + p.pts.length / 2, 0);
  const out = new Float32Array(total * 2);
  let k = 0;
  for (const { pts, x = 0, y = 0, s = 1 } of parts) {
    for (let i = 0; i < pts.length / 2; i++, k++) {
      out[k * 2] = x + pts[i * 2] * s;
      out[k * 2 + 1] = y + pts[i * 2 + 1] * s;
    }
  }
  return out;
}

// ------------------------------------------------------------------ renderer

let liveRenderers = 0;

/** Low-level renderer: give it particle positions and radii in CSS px, it draws the blob. */
export function createRenderer(canvas, { color = '#1F3CFF', fieldScale = 0.5 } = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true, preserveDrawingBuffer: false });
  if (!gl) return null;
  liveRenderers++;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };
  const pPoints = program(VS_POINTS, FS_POINTS);
  const pQuad = program(VS_QUAD, FS_QUAD);
  const aP = gl.getAttribLocation(pPoints, 'a_p');
  const aQ = gl.getAttribLocation(pQuad, 'a_q');
  const uRes = gl.getUniformLocation(pPoints, 'u_res');
  const uScale = gl.getUniformLocation(pPoints, 'u_scale');
  const uField = gl.getUniformLocation(pQuad, 'u_field');
  const uColor = gl.getUniformLocation(pQuad, 'u_color');
  const uAlpha = gl.getUniformLocation(pQuad, 'u_alpha');

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const buf = gl.createBuffer();

  const tex = gl.createTexture();
  const fbo = gl.createFramebuffer();
  let fw = 0;
  let fh = 0;
  let dpr = 1;
  let cw = 0;
  let ch = 0;
  let rgb = hexToRgb(color);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cw = canvas.clientWidth;
    ch = canvas.clientHeight;
    const w = Math.max(1, Math.round(cw * dpr));
    const h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const nfw = Math.max(1, Math.round(w * fieldScale));
    const nfh = Math.max(1, Math.round(h * fieldScale));
    if (nfw !== fw || nfh !== fh) {
      fw = nfw;
      fh = nfh;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }
  resize();

  /** data: Float32Array of [x, y, radius] per particle in CSS px; alpha fades the whole figure. */
  function draw(data, count, alpha = 1) {
    if (gl.isContextLost()) return;
    // 1. Density field.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, fw, fh);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(pPoints);
    gl.uniform2f(uRes, fw, fh);
    gl.uniform1f(uScale, dpr * fieldScale);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aP);
    gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 12, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.disableVertexAttribArray(aP);
    // 2. Threshold into the silhouette.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(pQuad);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uField, 0);
    gl.uniform3f(uColor, rgb[0], rgb[1], rgb[2]);
    gl.uniform1f(uAlpha, alpha);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(aQ);
    gl.vertexAttribPointer(aQ, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(aQ);
  }

  return {
    gl,
    resize,
    draw,
    setColor(hex) { rgb = hexToRgb(hex); },
    get width() { return cw; },
    get height() { return ch; },
    destroy() {
      liveRenderers--;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// ------------------------------------------------------------------ figure

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * A living specimen. Register point sets with addShape(); then tween figure.state:
 *   from, to   indices of the shapes being morphed between
 *   t          morph progress, 0 (from) to 1 (to); particles leave at slightly different times
 *   x, y, size centre and size in CSS px (size is the longer side of the shape)
 *   scatter    how far particles fly out mid-morph (in shape units)
 *   lattice    0 organic, 1 snapped to a machine grid
 *   explode    particles fly outward and fade (0 to 1)
 *   alpha      overall opacity
 *   drift      how much the particles breathe while idle
 */
export class Figure {
  constructor(canvas, { count = 900, radius = 0.032, color = '#1F3CFF', seed = 'figure', fieldScale = 0.5, reduced = false } = {}) {
    this.canvas = canvas;
    this.count = count;
    this.radius = radius;
    this.reduced = reduced;
    this.renderer = createRenderer(canvas, { color, fieldScale });
    this.shapes = [];
    this.data = new Float32Array(count * 3);
    const r = rng(seed);
    this.delay = new Float32Array(count).map(() => r() * 0.35);
    this.dir = new Float32Array(count * 2).map(() => r() * 2 - 1);
    this.phase = new Float32Array(count).map(() => r() * Math.PI * 2);
    this.sizeJ = new Float32Array(count).map(() => 0.75 + r() * 0.5);
    this.state = { from: 0, to: 0, t: 0, x: 0, y: 0, size: 100, scatter: 0.18, lattice: 0, explode: 0, alpha: 1, drift: 1, grid: 0.06, blur: 0 };
    this.trail = new Float32Array(count * 3 * (1 + Figure.GHOSTS));
    this.running = false;
    this.raf = 0;
    this.t0 = performance.now();
    this.onResize = () => { this.renderer?.resize(); this.render(); };
    window.addEventListener('resize', this.onResize);
  }

  get ok() { return !!this.renderer; }

  addShape(points) {
    this.shapes.push(points);
    return this.shapes.length - 1;
  }

  setColor(hex) { this.renderer?.setColor(hex); this.render(); }

  /** Computes particle positions for the current state and draws one frame. */
  render(now = performance.now()) {
    if (!this.renderer || !this.shapes.length) return;
    if (!this.canvas.isConnected) { this.stop(); return; }
    const s = this.state;
    const A = this.shapes[s.from] || this.shapes[0];
    const B = this.shapes[s.to] || A;
    const n = this.count;
    const time = (now - this.t0) / 1000;
    const drift = this.reduced ? 0 : s.drift;
    const rad = this.radius * s.size;
    const d = this.data;
    const span = 0.65;
    for (let i = 0; i < n; i++) {
      const lt = clamp01((s.t - this.delay[i]) / span);
      const e = ease(lt);
      let x = A[i * 2] + (B[i * 2] - A[i * 2]) * e;
      let y = A[i * 2 + 1] + (B[i * 2 + 1] - A[i * 2 + 1]) * e;
      const mid = Math.sin(Math.PI * lt) * s.scatter;
      x += this.dir[i * 2] * mid;
      y += this.dir[i * 2 + 1] * mid;
      if (s.lattice > 0) {
        const g = s.grid;
        x += (Math.round(x / g) * g - x) * s.lattice;
        y += (Math.round(y / g) * g - y) * s.lattice;
      }
      if (s.explode > 0) {
        const f = s.explode * s.explode * 1.6;
        x += this.dir[i * 2] * f;
        y += this.dir[i * 2 + 1] * f + s.explode * 0.3;
      }
      if (drift) {
        const p = this.phase[i];
        x += Math.sin(time * 0.9 + p) * 0.004 * drift;
        y += Math.cos(time * 0.7 + p * 1.3) * 0.004 * drift;
      }
      d[i * 3] = s.x + x * s.size;
      d[i * 3 + 1] = s.y + y * s.size;
      d[i * 3 + 2] = rad * this.sizeJ[i] * (1 - s.explode * 0.7);
    }
    // Motion blur: while falling, each particle leaves fading copies above it, so the scan smears.
    if (s.blur > 0.5) {
      const G = Figure.GHOSTS;
      const t = this.trail;
      t.set(d);
      for (let g = 1; g <= G; g++) {
        const off = n * 3 * g;
        const k = 1 - g / (G + 1.5);
        for (let i = 0; i < n; i++) {
          t[off + i * 3] = d[i * 3];
          t[off + i * 3 + 1] = d[i * 3 + 1] - (s.blur * g) / G;
          t[off + i * 3 + 2] = d[i * 3 + 2] * k;
        }
      }
      this.renderer.draw(t, n * (1 + G), s.alpha);
      return;
    }
    this.renderer.draw(d, n, s.alpha);
  }

  /** Renders every frame on GSAP's ticker (one shared loop for tweens and scans), or on rAF. */
  start() {
    if (this.running || !this.renderer) return this;
    this.running = true;
    const ticker = window.gsap?.ticker;
    if (ticker) {
      this.tick = () => this.render();
      ticker.add(this.tick);
    } else {
      const loop = (now) => {
        if (!this.running) return;
        this.render(now);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    return this;
  }

  stop() {
    this.running = false;
    if (this.tick) window.gsap?.ticker.remove(this.tick);
    this.tick = null;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.renderer?.destroy();
    this.renderer = null;
  }
}

/** Copies drawn behind each particle for motion blur. */
Figure.GHOSTS = 3;

export const rendererCount = () => liveRenderers;
