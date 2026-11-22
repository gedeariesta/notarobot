// The Screening (DESIGN.md, The reveal). The camera flies into your answer until the screen is
// blue, and the answer falls through the gates as a white particle scan that loses its geometry
// with every gate it passes. One GSAP timeline drives everything, so it can be skipped.
import { GATES, LADDER, stampTitle, resultLine } from './scoring.js';
import { SHAPES, LAYER_SHAPE, shapePath } from './shapes.js';
import { Figure, samplePath, sampleGrid, samplePoint, radiusFor } from './specimen.js';
import { dust } from './plate.js';
import { FLOOD_BLOB } from './figures.js';
import { sound, vibrate } from './sound.js';
import { ICONS, esc, pad2, wordLines, fitText } from './ui.js';

const gsap = window.gsap;

const LAYER_NAMES = ['Prompt Zombie', 'Slopper', 'Decision Delegator', 'First-Hand Thinker'];
// The deeper the answer falls, the darker the water: surface blue down to the abyss.
const DEPTH = ['#1F3CFF', '#1A33E2', '#1428BC', '#0E1D92', '#081469', '#030A3B'];
const ABYSS = [0, 0.18, 0.36, 0.56, 0.78, 1];
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';
const HUMAN_TIERS = new Set(['firsthand', 'reserved']);
const N = 420;
// How porous each layer's scan is: the deeper it falls, the more human (and the more holes).
const LAYER_SCAN = [
  { porosity: 0.22, drops: 0.01 },
  { porosity: 0.05, drops: 0 },
  { porosity: 0.14, drops: 0.01 },
  { porosity: 0.2, drops: 0.02 },
  { porosity: 0.27, drops: 0.03 },
  { porosity: 0.3, drops: 0.05 },
];

function scramble(final, progress) {
  const keep = Math.floor(final.length * progress);
  let out = final.slice(0, keep);
  for (let i = keep; i < final.length; i++) out += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
  return out;
}

/** Deterministic randomness, so skipping lands on exactly the same frame. */
function seeded(str) {
  let h = 2166136261;
  for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clips a layer to a liquid surface. p = 0 is empty, 1 is full; amp is in % of height. */
function setWave(node, p, phase, amp) {
  const n = 16;
  const level = (1 - p) * (100 + 2 * amp) - amp;
  let pts = '';
  for (let i = 0; i <= n; i++) {
    const y = level + amp * Math.sin(phase + (i / n) * Math.PI * 2.4);
    pts += `${((i / n) * 100).toFixed(2)}% ${y.toFixed(2)}%,`;
  }
  const v = `polygon(${pts}100% 100%, 0% 100%)`;
  node.style.clipPath = v;
  node.style.webkitClipPath = v;
}
function clearWave(node) {
  node.style.clipPath = '';
  node.style.webkitClipPath = '';
}

/**
 * A porous blob that grows from a point until it covers the screen: flying into the scan. It is
 * redrawn as vectors every frame (an SVG transform, not a scaled bitmap), so it stays sharp.
 */
export function floodBlob(color, origin, holeColor = color === '#FFFFFF' ? '#1F3CFF' : '#FFFFFF') {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const node = document.createElement('div');
  node.className = 'flood';
  node.innerHTML = `<svg width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}" aria-hidden="true"><g>
    <path d="${FLOOD_BLOB.d}" fill="${color}"/>
    <g class="flood-holes">${FLOOD_BLOB.holes.map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${holeColor}"/>`).join('')}</g>
  </g></svg>`;
  const g = node.querySelector('svg > g');
  document.body.appendChild(node);
  // Far enough that the blob's smallest radius (about 38 units) clears the furthest corner.
  const far = Math.hypot(Math.max(origin.x, vw - origin.x), Math.max(origin.y, vh - origin.y));
  const state = { s: 0.6, r: 0 };
  const apply = () => g.setAttribute('transform', `translate(${origin.x} ${origin.y}) rotate(${state.r}) scale(${state.s}) translate(-50 -50)`);
  apply();
  return { node, state, apply, holes: node.querySelector('.flood-holes'), maxScale: (far / 38) * 1.15 };
}

/**
 * Plays the Screening as a full-screen layer over the prompt.
 * opts: { result, aiAnswer, aiRuns, index, prevTotal, reduced, isLast, headerHTML, origin, onLand, onNext }
 * Returns { el, timeline, skip(), drain(), landed }.
 */
export function playScreening(opts) {
  const { result, aiAnswer, index, prevTotal, reduced, isLast, headerHTML } = opts;
  const special = result.special;
  const isNone = special === 'none';
  const isSmash = special === 'smash';
  const isObjector = special === 'objector';
  const isMeat = result.tier === 'meat';
  const stopsAtTop = isNone || isSmash || isMeat || isObjector;
  const target = stopsAtTop ? 0 : LADDER.indexOf(result.tier); // 1 Prompt Zombie ... 5 Human Reserved
  const nn = pad2(index + 1);
  const total = prevTotal + result.points;
  const finalRuns = isMeat ? (result.runs ?? opts.aiRuns ?? 300) : stopsAtTop ? null : result.runs ?? 0;
  const nextLabel = `${isLast ? 'See results' : 'Next verification'} ${ICONS.arrow}`;
  const stampName = isMeat ? 'Meat Proxy' : isSmash ? 'Keyboard Smash' : 'No response';
  const stampRot = isMeat ? -7 : isSmash ? -5 : -6;
  const verdictTitle = stampTitle(result);
  const human = HUMAN_TIERS.has(result.tier);
  const line = resultLine(result);
  // Non-breaking spaces keep the brackets on the same line as the words they hold.
  const calloutText = isNone ? '' : `(&nbsp;${esc(result.input)}&nbsp;)`;
  const human75 = target >= 4; // First-Hand Thinker or deeper: too organic for the machine
  const origin = opts.origin || { x: window.innerWidth / 2, y: window.innerHeight * 0.6 };

  // ---------------------------------------------------------------- DOM
  const root = document.createElement('div');
  root.className = 'scr';
  root.tabIndex = -1;
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', `Screening ${index + 1} of 7`);
  root.innerHTML = `
    ${isObjector ? `
    <div class="scr-paper">
      <div class="scr-inner">
        ${headerHTML(`+${result.points} → ${total} / 700`, { num: true })}
        <div class="scr-col" aria-hidden="true">
          <div class="figcap"><span class="plus">+</span><span class="cap">FIG. ${nn} | Answer, declined</span><span class="plus">+</span></div>
          <div class="paper-spec">
            <svg class="specimen" width="64" height="64" viewBox="0 0 100 100"><path class="sp-body" d="${SHAPES.subject.d}"/></svg>
            <div class="callout static"><svg width="58" height="16"><path d="M0 12 L44 12 L56 2"/><circle cx="0" cy="12" r="3.5"/></svg><span class="callout-text">${calloutText}</span></div>
          </div>
        </div>
        <div class="scr-bottom">
          <div class="scr-stage">
            <div class="verdict shown">
              <div class="mono">[ Verdict ]</div>
              <div class="verdict-name ink-strong">${wordLines(verdictTitle)}</div>
              <div class="mono verdict-line">${esc(line)}</div>
            </div>
          </div>
          <div class="scr-slot"><button class="pill scr-next paper-next" type="button">${nextLabel}</button></div>
        </div>
      </div>
    </div>` : ''}
    <div class="scr-blue on-blue">
      <div class="abyss" aria-hidden="true"></div>
      <div class="snow" aria-hidden="true">${snowDots(`${result.input}|${index}`)}</div>
      <div class="flash" aria-hidden="true"></div>
      <div class="scr-inner">
        ${headerHTML(`Screening ${nn}/07`)}
        <div class="scr-col" data-cap="descending" aria-hidden="true">
          <div class="figcap"><span class="plus">+</span><span class="cap">FIG. ${nn} | Answer,<span class="cap-s" data-c="descending">descending</span><span class="cap-s" data-c="landed">landed</span><span class="cap-s" data-c="normalised">normalised</span><span class="cap-s" data-c="unreadable">unreadable</span><span class="cap-s" data-c="none">not received</span><span class="cap-s" data-c="declined">declined</span></span><span class="plus">+</span></div>
          <div class="ai-row" data-state="sealed">
            <div class="ai-box"><svg class="ai-grid" viewBox="0 0 100 100" aria-hidden="true">${gridRects(5)}</svg>${ICONS.lock}<svg class="xmark" viewBox="0 0 40 40" aria-hidden="true"><path d="M10 10 L30 30"/><path d="M30 10 L10 30"/></svg></div>
            <div class="ai-lines">
              <div><span data-s="sealed">( AI | [SEALED] )</span><span data-s="nomatch">( AI | <s>${esc(aiAnswer)}</s> )</span><span data-s="match">( AI | ${esc(aiAnswer)} )</span><span data-s="smash none">( MODEL CHECK )</span></div>
              <div><span data-s="sealed" class="scan-text">COMPARING WITH MODEL</span><span data-s="nomatch">≠ NOT A MATCH</span><span data-s="match">= MATCH</span><span data-s="smash">? NO WORDS FOUND</span><span data-s="none">– NOTHING TO COMPARE</span></div>
            </div>
          </div>
          ${GATES.map((gate, i) => `
          <div class="gate" data-g="${i}"${result.hinted && i === 1 ? ' data-locked="1"' : ''}>
            <i class="g-half l"></i><i class="g-half r"></i><i class="g-dot"></i>
            <span class="g-pct">${gate.label}<span data-s="ok"> ✓</span><span data-s="broken"> | BROKEN</span><span data-s="locked"> | AI-ASSISTED</span></span>
            <span class="g-name">${LAYER_NAMES[i]}</span>
            ${i === 3 ? '<span class="g-debris"><i></i><i></i><i></i></span>' : ''}
          </div>`).join('')}
          <span class="not-reached">GATES NOT REACHED</span>
          <div class="floor">
            <svg class="floor-liquid" viewBox="0 0 354 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 12 C40 6 70 16 110 10 C150 4 190 16 230 8 C270 2 310 14 354 8 L354 60 L0 60 Z"/></svg>
            <span class="floor-label">Human Reserved | Floor</span>
          </div>
          <div class="scanner"></div>
          <div class="trails">
            ${[1, 2, 3, 4].map((k) => `<svg class="trail" data-k="${k}" viewBox="0 0 100 100"><path vector-effect="non-scaling-stroke" d="${SHAPES[LAYER_SHAPE[k]].d}"/></svg>`).join('')}
            ${isMeat ? `<svg class="trail dashed" data-k="was" viewBox="0 0 100 100"><path vector-effect="non-scaling-stroke" d="${SHAPES.subject.d}"/></svg>` : ''}
          </div>
          <canvas class="scan-canvas"></canvas>
          <div class="debris"></div>
          <svg class="dims" aria-hidden="true"></svg>
          <div class="sq-text"></div>
          ${human75 ? '<div class="organic mono">( Organic matter | Unclassifiable )</div>' : ''}
          ${isNone ? '' : `<div class="callout"><svg width="58" height="16"><path d="M0 12 L44 12 L56 2"/><circle cx="0" cy="12" r="3.5"/></svg><span class="callout-text">${result.hinted ? ICONS.lock : ''}${calloutText}</span></div>`}
        </div>
        <div class="scr-bottom">
          <div class="scr-stage">
            <div class="gauge"${stopsAtTop && !isMeat ? ' style="opacity:0"' : ''}>
              <div class="scalebar mono keep-case"><span>1 gate</span><i class="bar"></i></div>
              <div class="mono">AI runs that said this</div>
              <div class="gauge-row"><span class="gauge-num">300</span><span class="gauge-of">/300</span></div>
            </div>
            ${stopsAtTop && !isObjector ? `
            <div class="stamp">
              <div class="stamp-top">[ Verdict ${nn}/07 ]</div>
              <div class="stamp-name">${wordLines(stampName)}</div>
              <div class="stamp-line">${esc(line)}</div>
            </div>` : `
            <div class="verdict">
              <div class="mono">[ Verdict ]</div>
              <div class="verdict-name${human ? ' ink-strong' : ''}">${wordLines(verdictTitle)}</div>
              <div class="mono verdict-line">${esc(line)}</div>
            </div>`}
          </div>
          <div class="scr-slot">
            <div class="scr-foot mono">¹ Each gate opens slower than the last | Tap to skip</div>
            <button class="pill scr-next blue-next" type="button">${nextLabel}</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);

  const blue = root.querySelector('.scr-blue');
  const $ = (s) => blue.querySelector(s);
  const $$ = (s) => [...blue.querySelectorAll(s)];
  const col = $('.scr-col');
  const aiRow = $('.ai-row');
  const aiBox = $('.ai-box');
  const xPaths = $$('.xmark path');
  const scanText = $('.scan-text');
  const gates = $$('.gate');
  const gNames = $$('.g-name');
  const notReached = $('.not-reached');
  const floor = $('.floor');
  const floorLabel = $('.floor-label');
  const liquid = $('.floor-liquid');
  const scanner = $('.scanner');
  const ghosts = Object.fromEntries($$('.trail').map((n) => [n.dataset.k, n]));
  const canvas = $('.scan-canvas');
  const callout = $('.callout');
  const dims = $('.dims');
  const sqText = $('.sq-text');
  const debris = $('.debris');
  const gaugeEl = $('.gauge');
  const gaugeNum = $('.gauge-num');
  const verdictEl = $('.verdict');
  const stampEl = $('.stamp');
  const foot = $('.scr-foot');
  const hdrRight = $('.hdr-right');
  const nextBtn = root.querySelector(isObjector ? '.paper-next' : '.blue-next');
  const inner = $('.scr-inner');
  const abyss = $('.abyss');
  const snow = $('.snow');
  const flash = $('.flash');
  const organic = $('.organic');
  const tearShift = document.getElementById('tear-shift');
  const tearNoise = document.getElementById('tear-noise');
  gsap.set(blue, { '--depth': DEPTH[0] });
  gsap.set(abyss, { opacity: 0 });

  // ---------------------------------------------------------------- geometry
  const W = col.clientWidth;
  const H = col.clientHeight;
  const AI_BOTTOM = 74;
  const floorH = Math.round(Math.max(56, Math.min(90, H * 0.19)));
  const floorTop = H - floorH;
  const S = (floorTop - 94) / 3.575; // gate spacing: 80 px at full height
  const g = [0, 1, 2, 3].map((i) => Math.round(AI_BOTTOM + 0.575 * S + i * S));
  const size = Math.round(Math.max(40, Math.min(60, S * 0.66)));
  const cx = Math.round(W * 0.42);
  const restCenter = (layer) => (layer <= 4 ? g[layer - 1] - size / 2 - 1 : floorTop + floorH * 0.42);
  const startY = restCenter(1);

  gates.forEach((node, i) => (node.style.top = `${g[i]}px`));
  notReached.style.top = `${g[0] + 7}px`;
  floor.style.height = `${floorH}px`;
  if (callout) callout.querySelector('.callout-text').style.maxWidth = `${Math.max(80, W - (cx + size / 2 - 3) - 60)}px`;
  Object.entries(ghosts).forEach(([k, node]) => {
    node.setAttribute('width', size);
    node.setAttribute('height', size);
    gsap.set(node, { x: cx - size / 2, y: (k === 'was' ? startY : restCenter(Number(k))) - size / 2 });
  });
  gsap.set(liquid, { yPercent: 100 });

  // ---------------------------------------------------------------- the scan
  const fig = new Figure(canvas, { count: N, radius: radiusFor(N, 0.62), color: '#FFFFFF', seed: `${result.input}|${index}`, reduced });
  const shp = {};
  const seedBase = `${index}|${result.input}`;
  LAYER_SHAPE.forEach((name, k) => {
    shp[name] = fig.addShape(samplePath(N, shapePath(name), { box: [0, 0, 100, 100], seed: `${seedBase}|${name}`, holeScale: 6, edge: 0.04, ...LAYER_SCAN[k] }));
  });
  shp.square = fig.addShape(sampleGrid(N, { w: 0.92, h: 0.92 }));
  shp.dot = fig.addShape(samplePoint(N, 0.32, `${seedBase}|dot`));
  shp.dust = fig.addShape(dust(N, `${seedBase}|dust`, 3.2));
  const st = fig.state;
  Object.assign(st, { from: isNone ? shp.dot : shp.subject, to: isNone ? shp.dot : shp.subject, t: 1, x: cx, y: startY, size, scatter: 0.16, alpha: 0, drift: 1 });
  fig.render();
  if (fig.ok) fig.start();
  else canvas.remove();

  const syncCallout = () => {
    if (!callout) return;
    callout.style.left = `${Math.round(st.x + st.size * 0.42)}px`;
    callout.style.top = `${Math.round(st.y - 12)}px`;
  };
  syncCallout();

  // Gauge: "AI runs that said this", counting down from 300 like a depth meter.
  const gauge = { v: 300 };
  const renderGauge = () => {
    const txt = String(Math.max(0, Math.round(gauge.v)));
    if (gaugeNum.textContent !== txt) gaugeNum.textContent = txt;
  };

  // Fit the big words to the column.
  if (verdictEl) fitText(verdictEl.querySelector('.verdict-name'), result.tier === 'reserved' ? 76 : 56, 28);
  const paperVerdict = root.querySelector('.scr-paper .verdict-name');
  if (paperVerdict) fitText(paperVerdict, 76, 28);
  if (stampEl) {
    // The stamp stays inside its own stage, clear of the floor label above it.
    const nameEl = stampEl.querySelector('.stamp-name');
    const stageH = stampEl.parentElement.clientHeight;
    let fs = 52;
    nameEl.style.fontSize = `${fs}px`;
    while ((stampEl.offsetWidth > W - 30 || stampEl.offsetHeight > stageH - 30) && fs > 26) nameEl.style.fontSize = `${(fs -= 2)}px`;
  }

  // Meat Proxy: caught at the model check. The answer snaps to the machine's grid beside the AI's
  // own box, measured, and never reaches the gates.
  const Q = Math.round(Math.max(60, Math.min(80, S * 0.95)));
  const sqX = Math.round(W - Q - 34);
  const sqY = Math.round(Math.max(18, 54 - Q / 2));
  if (isMeat) {
    sqText.textContent = result.input;
    // Small enough that the longest word fits the square whole.
    const longest = Math.max(...String(result.input).split(/\s+/).map((w) => w.length), 1);
    const fs = Math.max(8, Math.min(13, (Q - 12) / (longest * 0.62)));
    Object.assign(sqText.style, { left: `${sqX}px`, top: `${sqY}px`, width: `${Q}px`, height: `${Q}px`, fontSize: `${fs.toFixed(1)}px` });
    aiRow.style.right = `${W - sqX + 10}px`;
    const wasX = cx + size * 0.35;
    const wasY = startY - size * 0.35;
    const by = sqY + Q + 12;
    dims.setAttribute('width', W);
    dims.setAttribute('height', H);
    dims.innerHTML = `
      <g class="f-line">
        <line x1="${sqX}" y1="${by}" x2="${sqX + Q}" y2="${by}"/><line x1="${sqX}" y1="${by - 4}" x2="${sqX}" y2="${by + 4}"/><line x1="${sqX + Q}" y1="${by - 4}" x2="${sqX + Q}" y2="${by + 4}"/>
        <line x1="${sqX + Q + 12}" y1="${sqY}" x2="${sqX + Q + 12}" y2="${sqY + Q}"/><line x1="${sqX + Q + 8}" y1="${sqY}" x2="${sqX + Q + 16}" y2="${sqY}"/><line x1="${sqX + Q + 8}" y1="${sqY + Q}" x2="${sqX + Q + 16}" y2="${sqY + Q}"/>
        <path d="M${sqX} ${sqY + Q * 0.82} L${sqX - 22} ${AI_BOTTOM + 16} L${sqX - 38} ${AI_BOTTOM + 16}"/>
        <path d="M${wasX} ${wasY} L${wasX + 18} ${wasY - 8}"/>
      </g>
      <g class="f-text" font-size="9">
        <text x="${sqX + Q / 2}" y="${by + 14}" text-anchor="middle">${Q} px</text>
        <text x="${sqX + Q + 18}" y="${sqY + Q / 2 + 3}" text-anchor="start" transform="rotate(90 ${sqX + Q + 18} ${sqY + Q / 2})">${Q} px</text>
        <text x="${sqX - 42}" y="${AI_BOTTOM + 19}" font-size="10" text-anchor="end">( CAUGHT )</text>
        <text x="${wasX + 22}" y="${wasY - 6}">( WAS )</text>
      </g>`;
  }

  // Keyboard Smash: loose letters, placed the same way every time.
  const rand = seeded(`${result.input}|${index}`);
  const bits = [];
  if (isSmash) {
    const chars = [...(result.input || '?')].filter((c) => c.trim()).slice(0, 10);
    const yMin = startY + size / 2 + 20;
    const yMax = Math.max(yMin + 20, Math.min(g[2] + S * 0.4, floorTop - 30));
    chars.forEach((ch, i) => {
      const s = document.createElement('span');
      s.textContent = ch;
      debris.appendChild(s);
      bits.push({ el: s, x: 14 + (W - 46) * ((i + 0.5) / chars.length) + (rand() - 0.5) * 30, y: yMin + rand() * (yMax - yMin), r: rand() * 80 - 40 });
    });
  }

  // ---------------------------------------------------------------- timeline
  let skipping = false;
  let landed = false;
  const sfx = (fn) => () => { if (!skipping) fn(); };
  // Nothing renders before its moment, so a skip lands on the same frame as a full play.
  const tl = gsap.timeline({ paused: true, defaults: { immediateRender: false }, onUpdate: syncCallout });
  if (callout) gsap.set(callout, { opacity: 0 });
  /** Morphs the scan from one shape to the next, particle by particle. */
  const morph = (from, to, at, dur, scatter = 0.16) => {
    tl.set(st, { from, to, t: 0, scatter }, at);
    tl.to(st, { t: 1.35, duration: dur, ease: 'none' }, at);
  };
  const dimGates = (at) => {
    tl.to($$('.g-half, .g-dot'), { opacity: 0.25, duration: 0.2 }, at);
    tl.to(gNames, { opacity: 0, duration: 0.2 }, at);
    tl.to(notReached, { opacity: 1, duration: 0.2 }, at + 0.1);
    tl.to(floor, { opacity: 0.12, duration: 0.2 }, at);
    tl.to(floorLabel, { opacity: 0, duration: 0.2 }, at);
  };
  /** The camera shakes: px is the size of the jolt. */
  const shake = (at, px, times = 3) => {
    if (reduced) return;
    tl.to(inner, { x: px, y: px * 0.5, duration: 0.035, yoyo: true, repeat: times, ease: 'none' }, at);
    tl.set(inner, { x: 0, y: 0 }, at + 0.035 * (times + 1));
  };
  /** Sinks the screen one layer deeper: darker water, a heavier vignette, particles rushing up. */
  const sink = (layer, at, dur) => {
    tl.to(blue, { '--depth': DEPTH[layer], duration: dur, ease: 'none' }, at);
    tl.to(abyss, { opacity: ABYSS[layer], duration: dur, ease: 'none' }, at);
    tl.to(snow, { yPercent: -layer * 9, duration: dur, ease: 'power1.in' }, at);
  };
  /**
   * The machine glitches on organic matter: the screen tears sideways, labels scramble, the scan
   * flickers toward the grid and back. strength 1 for First-Hand Thinker, more for Human Reserved.
   */
  const glitch = (at, strength = 1) => {
    if (reduced) return;
    const hdrText = hdrRight?.textContent || '';
    const names = gNames.map((n) => n.textContent);
    tl.call(sfx(sound.glitch), null, at);
    tl.call(() => { if (!skipping) vibrate(strength > 1 ? [30, 40, 60] : [20, 30, 20]); }, null, at);
    tl.set(inner, { filter: 'url(#tear)' }, at);
    const steps = [26, 6, 34, 12, 40, 0].map((v) => v * strength);
    steps.forEach((v, i) => {
      tl.set(tearShift, { attr: { scale: v } }, at + i * 0.07);
      tl.set(tearNoise, { attr: { seed: 3 + i * 7 } }, at + i * 0.07);
      tl.set(inner, { x: i % 2 ? -3 * strength : 4 * strength }, at + i * 0.07);
      tl.set(st, { lattice: i % 2 ? 0 : 0.75, grid: 0.11 }, at + i * 0.07);
      tl.call(() => {
        if (hdrRight) hdrRight.textContent = i === steps.length - 1 ? hdrText : scramble(hdrText, 0.2);
        gNames.forEach((n, k) => { n.textContent = i === steps.length - 1 ? names[k] : scramble(names[k], 0.3); });
      }, null, at + i * 0.07);
    });
    const end = at + steps.length * 0.07;
    tl.set(inner, { x: 0, filter: 'none' }, end);
    tl.set(st, { lattice: 0 }, end);
    tl.fromTo(flash, { opacity: 0 }, { opacity: 0.32 * strength, duration: 0.05, yoyo: true, repeat: 3, ease: 'steps(1)' }, at);
    if (organic) {
      tl.set(organic, { visibility: 'visible' }, at);
      tl.fromTo(organic, { opacity: 0 }, { opacity: 1, duration: 0.05, yoyo: true, repeat: 5, ease: 'steps(1)' }, at);
      tl.to(organic, { opacity: 0.7, duration: 0.1 }, end);
    }
  };

  // 0. The camera flies into the answer until the screen is blue.
  let flood = null;
  const T1 = reduced ? 0 : 0.42;
  if (!reduced) {
    flood = floodBlob('#1F3CFF', origin);
    gsap.set(blue, { opacity: 0 });
    tl.call(sfx(sound.flood), null, 0);
    tl.fromTo(flood.state, { s: 0.6, r: -12 }, { s: flood.maxScale, r: 18, duration: 0.42, ease: 'power3.in', onUpdate: flood.apply }, 0);
    tl.to(flood.holes, { opacity: 0, duration: 0.12 }, 0.3);
    tl.set(blue, { opacity: 1 }, 0.4);
    tl.set(flood.node, { display: 'none' }, 0.42);
  }

  // 1. Lift-off (300 ms): the answer assembles into a white scan with its callout.
  if (isNone) {
    tl.fromTo(st, { y: startY - 70, alpha: 0 }, { y: startY, alpha: 1, duration: 0.3, ease: 'bounce.out' }, T1);
  } else {
    tl.set(st, { from: shp.dust, to: shp.subject, t: 0, alpha: 1, scatter: 0.1 }, T1);
    tl.to(st, { t: 1.35, duration: 0.45, ease: 'power2.out' }, T1);
    tl.fromTo(st, { y: startY - 34 }, { y: startY, duration: 0.3, ease: 'back.out(2)' }, T1);
    tl.fromTo(callout, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.2 }, T1 + 0.12);
  }

  // 2. Model check (600 ms): a scanner sweeps while the mono text scrambles and resolves.
  const T2 = T1 + 0.3;
  if (!isNone) {
    tl.set(scanner, { y: 30, opacity: 1 }, T2);
    tl.to(scanner, { y: startY + size / 2 + 6, duration: 0.27, ease: 'none', yoyo: true, repeat: 1 }, T2);
    tl.set(scanner, { opacity: 0 }, T2 + 0.54);
    const sc = { p: 0 };
    tl.to(sc, { p: 1, duration: 0.55, ease: 'none', onUpdate: () => (scanText.textContent = scramble('COMPARING WITH MODEL', sc.p)) }, T2);
    tl.to(st, { lattice: 0.5, grid: 0.12, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.inOut' }, T2 + 0.1);
    tl.call(sfx(sound.tick), null, T2);
    tl.call(sfx(sound.tick), null, T2 + 0.27);
  }
  const T3 = isNone ? T1 + 0.3 : T2 + 0.6;
  let LAND;

  if (isNone) {
    // An empty answer: a single dot, straight onto the stamp.
    tl.set(aiRow, { attr: { 'data-state': 'none' } }, T1);
    tl.set(col, { attr: { 'data-cap': 'none' } }, T1);
    dimGates(T1 + 0.15);
    LAND = T3;
  } else if (isMeat) {
    // Match: the scan snaps into a perfect grid square. Deliberately abrupt.
    tl.set(aiRow, { attr: { 'data-state': 'match' } }, T3);
    tl.set(col, { attr: { 'data-cap': 'normalised' } }, T3);
    tl.call(sfx(sound.buzz), null, T3);
    tl.fromTo(aiBox, { scale: 1 }, { scale: 1.12, duration: 0.06, yoyo: true, repeat: 1 }, T3);
    tl.to(callout, { opacity: 0, duration: 0.08 }, T3);
    morph(shp.subject, shp.square, T3, 0.14, 0);
    tl.to(st, { x: sqX + Q / 2, y: sqY + Q / 2, size: Q, duration: 0.22, ease: 'expo.out' }, T3 + 0.04);
    tl.to(ghosts.was, { opacity: 0.6, duration: 0.15 }, T3 + 0.08);
    tl.to(sqText, { opacity: 1, duration: 0.1 }, T3 + 0.22);
    tl.to(dims, { opacity: 1, duration: 0.2 }, T3 + 0.22);
    tl.to(gauge, { v: finalRuns, duration: 0.2, ease: 'power2.out', onUpdate: renderGauge }, T3);
    dimGates(T3 + 0.05);
    LAND = T3 + 0.16;
  } else if (isSmash) {
    // Unreadable: the scan glitches and comes apart into loose letters.
    tl.set(aiRow, { attr: { 'data-state': 'smash' } }, T3);
    tl.set(col, { attr: { 'data-cap': 'unreadable' } }, T3);
    tl.call(sfx(sound.glitch), null, T3);
    for (let i = 0; i < 6; i++) tl.set(st, { x: cx + (rand() - 0.5) * 14, lattice: rand() * 0.9, grid: 0.18 }, T3 + i * 0.04);
    tl.set(st, { x: cx, lattice: 0 }, T3 + 0.24);
    tl.to(callout, { opacity: 0, duration: 0.1 }, T3 + 0.2);
    tl.to(st, { explode: 1, alpha: 0, duration: 0.5, ease: 'power2.out' }, T3 + 0.24);
    bits.forEach((b, i) => {
      tl.fromTo(b.el,
        { x: cx - 6, y: startY - 10, rotation: 0, opacity: 1 },
        { x: b.x, y: b.y, rotation: b.r, duration: 0.45, ease: 'power3.out' },
        T3 + 0.24 + i * 0.012);
    });
    dimGates(T3 + 0.3);
    LAND = T3 + 0.72;
  } else {
    // 3. Seal opens (300 ms): the AI's answer, struck through. Not a match.
    tl.set(aiRow, { attr: { 'data-state': 'nomatch' } }, T3);
    tl.fromTo(aiBox, { rotationY: 90 }, { rotationY: 0, transformPerspective: 400, duration: 0.18, ease: 'power2.out' }, T3);
    tl.set($('.xmark'), { opacity: 1 }, T3);
    tl.to(xPaths, { strokeDashoffset: 0, duration: 0.12, stagger: 0.05 }, T3 + 0.06);
    tl.call(sfx(sound.tick), null, T3);
    morph(shp.subject, shp.circle, T3 + 0.05, 0.3, 0.08);
    if (!isObjector) sink(1, T3, 0.3);

    if (isObjector) {
      // The answer refuses to drop. Then the blue drains back to white.
      tl.set(col, { attr: { 'data-cap': 'declined' } }, T3);
      const halves0 = gates[0].querySelectorAll('.g-half');
      tl.to(halves0, { opacity: 0.15, duration: 0.05, yoyo: true, repeat: 5 }, T3 + 0.3);
      tl.to(st, { y: startY - 10, duration: 0.13, ease: 'power2.out', yoyo: true, repeat: 3 }, T3 + 0.3);
      const drain = { p: 1, ph: 0 };
      tl.call(sfx(sound.flood), null, T3 + 0.9);
      tl.to(drain, {
        p: 0, ph: -5, duration: 0.5, ease: 'power2.inOut',
        onUpdate: () => setWave(blue, drain.p, drain.ph, 2.6 * Math.sin(Math.PI * drain.p)),
      }, T3 + 0.9);
      LAND = T3 + 1.4;
    } else {
      // 4. Descent: the first gate takes 250 ms, each next one 1.4 times longer.
      let t = T3 + 0.3;
      let d = 0.25;
      for (let i = 0; i < target - 1; i++) {
        const last = target === 5 && i === 3;
        const halves = gates[i].querySelectorAll('.g-half');
        if (last) {
          // 5. The hang, Human Reserved: the last gate strains twice, then breaks.
          tl.to(st, { y: restCenter(4) + 6, duration: 0.09, yoyo: true, repeat: 3, ease: 'power1.inOut' }, t);
          tl.to(halves, { y: 3, duration: 0.09, yoyo: true, repeat: 3, ease: 'power1.inOut' }, t);
          tl.call(sfx(sound.tick), null, t + 0.1);
          tl.call(sfx(sound.tick), null, t + 0.28);
          t += 0.5;
          // The floor gate breaks, and the machine glitches harder on what falls through.
          glitch(t, 1.6);
          shake(t, 6, 5);
          tl.set(gates[i], { attr: { 'data-broken': '1' } }, t);
          tl.to(halves[0], { rotation: 9, duration: 0.15, ease: 'power2.out' }, t);
          tl.to(halves[1], { rotation: -9, duration: 0.15, ease: 'power2.out' }, t);
          gates[i].querySelectorAll('.g-debris i').forEach((bit, k) => {
            tl.fromTo(bit, { opacity: 1, x: 0, y: 0, rotation: 0 }, { x: (k - 1) * 16, y: -6 - (k % 2) * 4, rotation: 35 - k * 20, duration: 0.3, ease: 'power2.out' }, t);
          });
        } else {
          tl.to(halves, { scaleX: 0.36, duration: Math.min(0.1, d * 0.4), ease: 'power2.out' }, t);
          tl.to(halves, { scaleX: 1, duration: 0.12, ease: 'power2.in' }, t + d * 0.8);
        }
        tl.to(st, { y: restCenter(i + 2), duration: d, ease: 'power1.in' }, t);
        morph(shp[LAYER_SHAPE[i + 1]], shp[LAYER_SHAPE[i + 2]], t + d * 0.1, Math.max(0.3, d * 0.9));
        // Deeper water, a smeared fall, a jolt at the gate.
        sink(i + 2, t, d);
        tl.to(st, { blur: Math.min(30, size * 0.5), duration: d * 0.45, ease: 'power2.in' }, t);
        tl.to(st, { blur: 0, duration: d * 0.4, ease: 'power2.out' }, t + d * 0.6);
        shake(t + d * 0.2, 1 + i * 0.8);
        // Past 1/300 (75 points and deeper) the machine can't classify what's falling.
        if (human75 && i === 2) glitch(t + d * 0.25, 1);
        tl.to(ghosts[i + 1], { opacity: 0.22 + i * 0.07, duration: 0.2 }, t + d * 0.3);
        tl.to(gauge, { v: Math.max(0, GATES[i].runs - 1), duration: d, ease: 'none', onUpdate: renderGauge }, t);
        // Each gate it passes flashes, ticks a check and plays a soft tick.
        tl.set(gates[i], { attr: { 'data-passed': '1' } }, t + d * 0.2);
        tl.call(sfx(sound.tick), null, t + d * 0.2);
        tl.fromTo(gates[i].querySelector('.g-pct'), { opacity: 0.3 }, { opacity: 1, duration: 0.2 }, t + d * 0.2);
        t += d;
        d *= 1.4;
      }
      if (target < 5) {
        // 5. The hang: the scan pauses above the gate it can't pass while the scanner flickers.
        const hg = target - 1;
        const hd = target === 1 ? 0.4 : 0.5;
        tl.set(scanner, { y: g[hg] - 1 }, t);
        tl.to(scanner, { opacity: 1, duration: 0.05, repeat: Math.round(hd / 0.1) - 1, yoyo: true, ease: 'steps(1)' }, t);
        tl.set(scanner, { opacity: 0 }, t + hd);
        tl.to(st, { y: restCenter(target) + 5, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.out' }, t + 0.05);
        tl.to(gauge, { v: finalRuns, duration: 0.3, ease: 'power1.out', onUpdate: renderGauge }, t + hd - 0.3);
        t += hd;
      } else {
        tl.to(gauge, { v: finalRuns, duration: 0.2, ease: 'power1.out', onUpdate: renderGauge }, t - 0.2);
      }
      LAND = t;
    }
  }

  // 6. Landing (300 ms): the gate closes with a clunk, then the stamp or the verdict.
  tl.addLabel('land', LAND);
  const L = LAND + 0.005;
  tl.call(() => land(), null, LAND + 0.01);
  if (!isObjector) {
    shake(LAND, 2 + Math.max(0, target) * 1.2);
    tl.set(col, { attr: { 'data-cap': isMeat ? 'normalised' : isSmash ? 'unreadable' : isNone ? 'none' : 'landed' } }, L);
    if (target >= 1) {
      tl.fromTo(st, { size: size * 1.12 }, { size, duration: 0.32, ease: 'elastic.out(1, 0.45)' }, LAND);
    }
    if (target >= 1 && target <= 4) tl.set(gNames[target - 1], { attr: { 'data-here': '1' } }, L);
    if (target === 5) {
      tl.set(floorLabel, { attr: { 'data-here': '1' } }, L);
      tl.to(liquid, { yPercent: 0, duration: 0.45, ease: 'power2.out' }, LAND - 0.15);
      tl.to(st, { scatter: 0.5, duration: 0.3 }, LAND);
    }
    if (!isMeat) tl.to(gaugeEl, { opacity: 0, y: 8, duration: 0.15 }, LAND);
    else tl.to(gaugeEl, { opacity: 0, y: 8, duration: 0.15 }, LAND + 0.02);
    if (stampEl) {
      tl.set(stampEl, { visibility: 'visible' }, L);
      tl.fromTo(stampEl, { opacity: 0, scale: 2.1, rotation: stampRot - 9 }, { opacity: 1, scale: 1, rotation: stampRot, duration: 0.16, ease: 'power4.in' }, LAND + 0.04);
      tl.to(stampEl, { scale: 1.03, duration: 0.05, yoyo: true, repeat: 1 }, LAND + 0.2);
    } else {
      tl.set(verdictEl, { visibility: 'visible' }, L);
      tl.fromTo(verdictEl, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, LAND + 0.04);
    }
    tl.to(foot, { opacity: 0, duration: 0.15 }, LAND);
  }
  tl.set(nextBtn, { visibility: 'visible' }, LAND + 0.25);
  tl.fromTo(nextBtn, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, LAND + 0.25);
  // 7. Score (400 ms): the points count into the round total.
  tl.call(() => scoreBeat(), null, LAND + 0.3);
  tl.to({}, { duration: 0.45 }, LAND + 0.3);

  function land() {
    landed = true;
    ctrl.landed = true;
    if (!skipping) {
      sound.clunk();
      if (stampEl) setTimeout(() => sound.thud(), 40);
      if (result.tier === 'reserved' || isObjector) setTimeout(() => sound.chime(), 160);
      vibrate(30);
    }
    opts.onLand?.();
    setTimeout(() => nextBtn.focus({ preventScroll: true }), 260);
  }

  function scoreBeat() {
    if (isObjector || !hdrRight) return;
    hdrRight.classList.add('num');
    const c = { n: prevTotal };
    const paint = () => (hdrRight.textContent = `+${result.points} → ${Math.round(c.n)} / 700`);
    if (reduced) { c.n = total; paint(); return; }
    gsap.to(c, { n: total, duration: 0.4, ease: 'power1.out', onUpdate: paint });
  }

  nextBtn.addEventListener('click', () => opts.onNext?.());

  const landAt = tl.labels.land;
  const ctrl = {
    el: root,
    timeline: tl,
    landed: false,
    draining: false,
    /** After the first 600 ms, a tap or Enter skips to the landing. Never changes the result. */
    skip() {
      if (reduced || landed) return false;
      const t = tl.time();
      if (t < 0.6 || t >= landAt) return false;
      skipping = true;
      tl.seek(landAt, false);
      skipping = false;
      scanText.textContent = 'COMPARING WITH MODEL';
      if (finalRuns != null) { gauge.v = finalRuns; renderGauge(); }
      if (isObjector) setWave(blue, 0, 0, 0);
      else clearWave(blue);
      flood?.node.remove();
      syncCallout();
      return true;
    },
    /** A white blob floods the screen back to paper, revealing whatever is now underneath. */
    drain(onDone) {
      if (ctrl.draining) return;
      ctrl.draining = true;
      const finish = () => { root.remove(); fig.destroy(); flood?.node.remove(); onDone?.(); };
      if (reduced || isObjector) {
        gsap.to(root, { opacity: 0, duration: reduced ? 0.15 : 0.3, onComplete: finish });
        return;
      }
      sound.flood();
      const b = nextBtn.getBoundingClientRect();
      const back = floodBlob('#FFFFFF', { x: b.left + b.width / 2, y: b.top + b.height / 2 }, getComputedStyle(blue).getPropertyValue('--depth').trim() || DEPTH[0]);
      gsap.timeline({ onComplete: () => { back.node.remove(); } })
        .fromTo(back.state, { s: 0.6, r: 10 }, { s: back.maxScale, r: -14, duration: 0.42, ease: 'power3.in', onUpdate: back.apply }, 0)
        .to(back.holes, { opacity: 0, duration: 0.12 }, 0.3)
        .call(finish, null, 0.42)
        .to(back.node, { opacity: 0, duration: 0.2 }, 0.42);
    },
  };

  root.focus({ preventScroll: true });
  if (reduced) {
    // Reduced motion: no movement. Jump to the final frame and fade the screen in.
    skipping = true;
    tl.progress(1, false);
    skipping = false;
    syncCallout();
    sound.clunk();
    if (stampEl) sound.thud();
    gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.15 });
  } else {
    tl.play(0);
  }
  return ctrl;
}

/** Loose particles in the water, rising past as the answer sinks (seeded, so a skip matches). */
function snowDots(seed) {
  const r = seeded(seed);
  let out = '';
  for (let i = 0; i < 46; i++) {
    const s = 1 + r() * 2.4;
    out += `<i style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 100).toFixed(1)}%;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;opacity:${(0.12 + r() * 0.4).toFixed(2)}"></i>`;
  }
  return out;
}

function gridRects(n) {
  const step = 100 / n;
  let out = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out += `<rect x="${x * step + 2}" y="${y * step + 2}" width="${step - 4}" height="${step - 4}"/>`;
  return out;
}
