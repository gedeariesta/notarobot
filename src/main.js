// notarobot: screens and flow. DESIGN.md sets every rule; the look is a lab specimen sheet:
// people are porous particle scans, machines are grids, and labels hang off both.
import {
  compilePrompt, classify, scoreEntry, specialResult, TIERS, LADDER, BADGES, verdictFor, passed, badgesFor,
  totalScore, guiltLine, shareText, stampTitle, resultLine, pickReservedLine, answerKey, keyCounts, searchKey, KEY_ORDER,
} from './scoring.js';
import { dateKey, dayForDate, liveStreak, completeStreak, msUntilMidnight, formatHMS, addDays } from './days.js';
import { createStore, resetAll } from './state.js';
import { sound } from './sound.js';
import { playScreening } from './reveal.js';
import { specimenSVG, pendingSVG, shapeMarkup, TIER_SHAPE, DEPTH, depthColour } from './shapes.js';
import { ICONS, esc, el, smartQuotes, pad2, wordLines, fitText } from './ui.js';
import { Plate, plateHTML, dust } from './plate.js';
import { DAY_FIGURE, DAY_FIGURE_NAME } from './figures.js';

const gsap = window.gsap;
const ROUND_LEN = 7;
const TIMER_S = 25;
const MAX_LEN = 40;
const BONUS_DAY = 4;
const BONUS_STREAK = 3;

const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';
const BOARD = params.get('board') === '1';
const DAY_PARAM = Number(params.get('day')) || null;
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => motionQuery.matches;

const app = document.getElementById('app');
const live = document.getElementById('live');
const store = createStore(DEMO ? 'demo' : 'main');
const today = dateKey();

let bank = null;
let session = null; // { mode, day, key, round, prompts, bonusLocked }
let keyHandler = null;
let countdownTimer = null;
let activeBackstop = 0;
let plates = [];

// ------------------------------------------------------------------ boot

init().catch((err) => {
  console.error(err);
  app.innerHTML = `<section class="screen"><p class="mono">Verification service unavailable. ${esc(err.message)}</p></section>`;
});

async function init() {
  const res = await fetch('prompts.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load prompts.json (${res.status}).`);
  bank = await res.json();
  // Big type is fitted to the column, so wait (briefly) for the fonts.
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);

  if (DEMO) setupDemoBar();
  document.addEventListener('keydown', (e) => keyHandler?.(e));
  document.addEventListener('click', onSoundToggle);
  window.addEventListener('hashchange', route);
  route();
}

const dayById = (id) => bank.days.find((d) => d.id === id);
const scoredDayId = () => dayForDate(today, bank.launchDate);
const dayLabel = (day) => `Day ${pad2(day.id)} | ${day.title}`;
const streakNow = () => liveStreak(store.streak, today);

function makeSession() {
  let mode = 'scored';
  let dayId = scoredDayId();
  let bonusLocked = false;
  if (DEMO) {
    mode = 'demo';
    dayId = DAY_PARAM && dayById(DAY_PARAM) ? DAY_PARAM : dayId;
  } else if (DAY_PARAM && dayById(DAY_PARAM)) {
    // Day 4 is a bonus, unlocked by a 3-day streak.
    if (DAY_PARAM === BONUS_DAY && streakNow() < BONUS_STREAK) bonusLocked = true;
    else { mode = 'practice'; dayId = DAY_PARAM; }
  }
  const day = dayById(dayId);
  const key = mode === 'scored' ? today : mode === 'demo' ? `demo-day-${dayId}` : null;
  const stored = key ? store.getRound(key) : null;
  const round = stored || freshRound(day, mode);
  return { mode, day, key, round, prompts: day.prompts.map(compilePrompt), bonusLocked };
}

function freshRound(day, mode) {
  return { dayId: day.id, date: today, mode, answers: [], done: false };
}

function saveRound() {
  if (session.key) store.putRound(session.key, session.round);
}

function route() {
  document.querySelectorAll('.scr, .sheet-backdrop, .flood').forEach((n) => n.remove());
  clearScreen();
  if (location.hash === '#about') return renderAbout();
  if (BOARD) return renderBoard();
  session = makeSession();
  const { round, mode } = session;
  if (round.done) return renderGate({ locked: mode === 'scored' });
  if (round.answers.length >= ROUND_LEN) return finishRound();
  if (round.answers.length > 0) return renderPrompt(round.answers.length);
  renderGate({});
}

function clearScreen() {
  keyHandler = null;
  clearInterval(countdownTimer);
  clearTimeout(activeBackstop);
  gsap.globalTimeline.getChildren(false, true, true).forEach((t) => t.kill());
  plates.forEach((p) => p.destroy());
  plates = [];
  app.classList.remove('wide');
}

function announce(text) {
  live.textContent = '';
  setTimeout(() => (live.textContent = text), 30);
}

// ------------------------------------------------------------------ chrome

/** The wordmark and the speaker on the left; a tagline in the middle on wide screens; the stage on the right. */
function headerHTML(right, { num = false } = {}) {
  return `<header class="hdr">
    <div class="hdr-left"><a href="${location.pathname}${location.search}">notarobot</a><span aria-hidden="true">/</span>${soundButton()}</div>
    <div class="hdr-mid">A daily CAPTCHA you can’t quite pass</div>
    <div class="hdr-right${num ? ' num' : ''}">${right}</div>
  </header>`;
}

function soundButton() {
  const on = !sound.muted;
  return `<button class="hdr-sound" type="button" data-sound aria-pressed="${on}" aria-label="${on ? 'Sound on. Tap to mute' : 'Sound off. Tap to unmute'}">${on ? ICONS.speaker : ICONS.speakerOff}</button>`;
}

function onSoundToggle(e) {
  if (!e.target.closest('[data-sound]')) return;
  sound.setMuted(!sound.muted);
  if (!sound.muted) { sound.unlock(); sound.click(); }
  document.querySelectorAll('[data-sound]').forEach((b) => b.replaceWith(el(soundButton())));
}

function setupDemoBar() {
  const bar = document.getElementById('demo-bar');
  const current = DAY_PARAM && dayById(DAY_PARAM) ? DAY_PARAM : scoredDayId();
  bar.hidden = false;
  bar.innerHTML = `
    <span class="tag-demo">[ Demo ]</span>
    ${bank.days.map((d) => `<button type="button" data-day="${d.id}" aria-pressed="${d.id === current}" aria-label="Day ${d.id}: ${esc(d.title)}">D${d.id}</button>`).join('')}
    <span class="spacer"></span>
    <button type="button" data-log title="Answers that bounced on this device">Log</button>
    <button type="button" data-reset>Reset</button>
    <button type="button" disabled title="The class board needs the shared answer pool, which is not built yet.">Board</button>`;
  const setH = () => document.documentElement.style.setProperty('--demo-h', `${bar.offsetHeight}px`);
  setH();
  window.addEventListener('resize', setH);
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.day) {
      location.href = `?demo=1&day=${b.dataset.day}`;
    } else if ('log' in b.dataset) {
      showBounceLog();
    } else if ('reset' in b.dataset) {
      if (!b.classList.contains('armed')) {
        b.classList.add('armed');
        b.textContent = 'Clear device?';
        setTimeout(() => { b.classList.remove('armed'); b.textContent = 'Reset'; }, 3000);
        return;
      }
      resetAll();
      location.href = `?demo=1&day=${current}`;
    }
  });
}

/** Demo mode: every bounced answer, so the team can add correct ones to the lists. */
function showBounceLog() {
  const rows = store.bounces.slice().reverse();
  const text = rows.map((b) => `${b.promptId}\t${b.input}`).join('\n');
  const sheet = el(`
    <div class="sheet-backdrop">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Bounced answers">
        <div class="sheet-top mono"><span class="keep-case">&lt;bounce log&gt;</span><span>${rows.length} answers</span></div>
        <div class="log">${rows.length ? rows.map((b) => `<div><span class="mono">${esc(b.promptId)}</span>${esc(b.input)}</div>`).join('') : '<p class="mono">Nothing has bounced yet.</p>'}</div>
        <div class="ac-btns">
          <button class="pill sm fix" type="button" data-copy ${rows.length ? '' : 'disabled'}>Copy list</button>
          <button class="pill sm ghost" type="button" data-close>Close</button>
        </div>
      </div>
    </div>`);
  document.body.appendChild(sheet);
  const close = () => sheet.remove();
  sheet.querySelector('[data-close]').addEventListener('click', close);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });
  sheet.querySelector('[data-copy]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const ok = await copyText(text);
    btn.textContent = ok ? 'Copied' : 'Copy failed';
    btn.classList.toggle('fail', !ok);
  });
}

function startCountdown(node, format) {
  if (!node) return;
  const paint = () => (node.textContent = format(formatHMS(msUntilMidnight())));
  paint();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => (node.isConnected ? paint() : clearInterval(countdownTimer)), 1000);
}

// ------------------------------------------------------------------ plates

const BUST_CALLOUTS = (locked) => [
  { text: locked ? 'Verified' : 'You', at: [118, 34], dx: -112, dy: -12 },
  { text: 'Language', at: [46, 112], dx: -26, dy: 34 },
];
const DAY_CALLOUTS = {
  hand: [{ text: 'Five digits', at: [104, 50], dx: -96, dy: -16 }, { text: 'Hand, open', at: [26, 128], dx: -10, dy: 52 }],
  brain: [{ text: 'Cortex', at: [118, 22], dx: -100, dy: -10 }, { text: 'Unverified', at: [52, 120], dx: -20, dy: 46 }],
  claw: [{ text: 'Three talons', at: [100, 30], dx: -86, dy: -6 }, { text: 'Targeting', at: [30, 186], dx: -16, dy: 34 }],
  globe: [{ text: 'Surface, rendered', at: [100, 10], dx: -60, dy: -14 }, { text: 'You are here', at: [64, 112], dx: -50, dy: 60 }],
};

/** The subject sits on the right, cropped at the shoulders; other figures sit centred. */
function heroLayout(w, h, name) {
  if (name === 'bust') {
    const size = Math.min(h * 0.98, w * 1.12);
    return { x: w - size * 0.417 - 4, y: h * 0.6, size };
  }
  const size = Math.min(w * 0.8, h * 0.78);
  return { x: w * 0.58, y: h * 0.56, size };
}

function makePlate(root, opts) {
  const plate = new Plate(root, { reduced: reduced(), ...opts });
  plates.push(plate);
  return plate;
}

// ------------------------------------------------------------------ 1. gate

function renderGate({ locked = false } = {}) {
  clearScreen();
  const { day, mode, bonusLocked } = session;
  const streak = streakNow();
  const foot = mode === 'practice' ? '¹ Practice | Not counted' : `¹ ${ROUND_LEN} challenges | 25 s each | Once a day`;
  app.classList.add('wide');

  app.innerHTML = `
    <section class="screen gate-screen" data-screen="gate">
      ${headerHTML(esc(dayLabel(day)))}
      <div class="intro">
        <div class="mono intro-k">(00) ${locked ? 'Verified' : 'Verification'}</div>
        <p class="intro-p">${locked ? 'You have been verified for today. The model will be here tomorrow.' : 'You are about to be verified. Seven challenges, 25 seconds each. Are you worthy of being human?'}</p>
        ${bonusLocked ? `<p class="mono note">Day ${pad2(BONUS_DAY)} unlocks after a ${BONUS_STREAK}-day streak.</p>` : ''}
      </div>
      ${plateHTML({ cap: locked ? 'FIG. 00 | Subject, verified' : 'FIG. 00 | Subject, 2,400-point scan', cls: 'gate-plate' })}
      <h1 class="gate-title" aria-label="not a robot"><span class="ink">not a</span><span class="ink">robot</span></h1>
      <div class="gate-action">
        ${locked ? `
        <div class="challenge">
          <p class="locked-msg mono">You've been verified for today. Come back tomorrow.</p>
          <button class="pill" type="button" data-results>View today's results ${ICONS.arrow}</button>
          <div class="mono countdown" data-countdown></div>
        </div>` : `
        <button class="robot-pill" type="button" role="checkbox" aria-checked="false" aria-label="I'm not a robot">
          <span class="rbox pulse"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="tick" d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
          <span>I'm not a robot</span>
        </button>
        <div class="loading-line mono" aria-live="polite"></div>`}
      </div>
      <div class="gate-foot mono"><span>${foot}</span><span>Streak ${pad2(streak)}</span></div>
      <div class="gate-links"><a class="bracket" href="#about">[ about ]</a></div>
    </section>`;

  const $ = (s) => app.querySelector(s);
  const title = $('.gate-title');
  const action = $('.gate-action');
  const plateEl = $('.gate-plate');

  // The subject: a 2,400-point scan that assembles out of loose particles, then breathes.
  const plate = makePlate(plateEl, { count: 2400, seed: 'subject', layout: heroLayout });
  const sDust = plate.add('dust', dust(2400, 'gate-dust', 1.6));
  const sBust = plate.add('bust');
  plate.place('bust');
  plate.setCallouts('bust', BUST_CALLOUTS(locked));
  const st = plate.fig.state;
  if (plate.ok) {
    if (reduced()) Object.assign(st, { from: sBust, to: sBust, t: 1 });
    else {
      Object.assign(st, { from: sDust, to: sBust, t: 0, scatter: 0.12 });
      gsap.to(st, { t: 1.35, duration: 1.8, ease: 'power2.out' });
      gsap.from(plateEl.querySelectorAll('.callout-l, .plate-lines, .cross, .plate-cap, .plate-scale'), { opacity: 0, duration: 0.5, stagger: 0.06, delay: 1 });
    }
    plate.fig.start();
  } else {
    plateEl.classList.add('no-gl');
  }

  if (!reduced()) {
    // The ink-bleed title settles in from a blurred blot.
    gsap.fromTo(title, { filter: 'blur(14px)', opacity: 0.25, scale: 1.04, transformOrigin: '0% 100%' },
      { filter: 'blur(0px)', opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out', clearProps: 'filter', delay: 0.15 });
  }

  if (locked) {
    startCountdown($('[data-countdown]'), (t) => `[ Next verification in ${t} ]`);
    $('[data-results]').addEventListener('click', () => { sound.unlock(); sound.click(); renderResults(); });
    return;
  }

  const btn = $('.robot-pill');
  const box = $('.rbox');
  const line = $('.loading-line');
  let pressed = false;
  btn.addEventListener('click', () => {
    if (pressed) return;
    pressed = true;
    sound.unlock();
    sound.click();
    btn.setAttribute('aria-checked', 'mixed');
    box.classList.remove('pulse');
    box.innerHTML = '<span class="spin" role="img" aria-label="Checking"></span>';
    typeInto(line, 'Comparing you to 8 billion humans and 1 model.', 16);
    // The machine reads you: a scan line passes and the particles snap to its grid for a moment.
    if (!reduced() && plate.ok) {
      const scan = el('<i class="scanline"></i>');
      plateEl.appendChild(scan);
      gsap.fromTo(scan, { top: '0%', opacity: 1 }, { top: '100%', duration: 1.1, ease: 'none', onComplete: () => scan.remove() });
      gsap.to(st, { lattice: 0.85, grid: 0.045, duration: 0.5, ease: 'power2.inOut', yoyo: true, repeat: 1, delay: 0.1 });
    }
    setTimeout(() => {
      box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="tick" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
      box.classList.add('checked');
      btn.setAttribute('aria-checked', 'true');
      sound.tick();
      setTimeout(flip, reduced() ? 120 : 380);
    }, 1200);
  });

  function flip() {
    // The card flips to the challenge side, and the subject comes apart into today's figure.
    const figName = DAY_FIGURE[day.id];
    if (plate.ok) {
      const sDay = plate.add(figName);
      const w = plateEl.clientWidth;
      const h = plateEl.clientHeight;
      const target = heroLayout(w, h, figName);
      const swapLabels = () => {
        plate.current = figName;
        plate.setCaption(`FIG. ${pad2(day.id)} | Day ${pad2(day.id)}, ${DAY_FIGURE_NAME[day.id]}`);
        plate.setCallouts(figName, DAY_CALLOUTS[figName]);
      };
      if (reduced()) {
        Object.assign(st, { from: sDay, to: sDay, t: 1, ...target });
        swapLabels();
      } else {
        Object.assign(st, { from: sBust, to: sDay, t: 0, scatter: 0.3 });
        gsap.to(plateEl.querySelectorAll('.callout-l, .plate-lines'), { opacity: 0, duration: 0.15 });
        gsap.to(st, { t: 1.35, x: target.x, y: target.y, size: target.size, duration: 1.5, ease: 'power2.inOut',
          onUpdate: () => plate.drawCallouts() });
        gsap.delayedCall(1.0, () => {
          swapLabels();
          gsap.to(plateEl.querySelectorAll('.callout-l, .plate-lines'), { opacity: 1, duration: 0.3 });
        });
      }
    }
    sound.flood();
    // The intro has done its job: fold it away so the challenge fits on a small phone.
    const intro = app.querySelector('.intro');
    if (reduced()) intro.remove();
    else gsap.to(intro, { height: 0, marginTop: 0, opacity: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => intro.remove() });
    const swap = () => {
      action.innerHTML = `
        <div class="challenge">
          <p class="challenge-big">Additional verification required.</p>
          <p class="mono challenge-k">( ${ROUND_LEN} challenges | 25 s each )</p>
          <button class="pill" type="button" data-begin>Begin verification ${ICONS.arrow}</button>
        </div>`;
      const begin = action.querySelector('[data-begin]');
      begin.addEventListener('click', () => {
        sound.click();
        if (session.round.done || session.round.answers.length) {
          session.round = freshRound(day, mode);
          saveRound();
        }
        const go = () => renderPrompt(0);
        if (reduced() || !plate.ok) return go();
        // The figure comes apart, and the first challenge slides in.
        gsap.to(st, { explode: 1, alpha: 0, duration: 0.45, ease: 'power2.in' });
        gsap.to(app.querySelectorAll('.gate-title, .gate-action, .intro, .gate-foot, .gate-links, .plate-labels, .plate-lines'), { opacity: 0, x: -24, duration: 0.3, ease: 'power2.in' });
        gsap.delayedCall(0.42, go);
      });
      begin.focus({ preventScroll: true });
      keyHandler = (e) => { if (e.key === 'Enter' && document.activeElement !== begin) { e.preventDefault(); begin.click(); } };
    };
    if (reduced()) {
      gsap.to(action, { opacity: 0, duration: 0.1, onComplete: () => { swap(); gsap.to(action, { opacity: 1, duration: 0.1 }); } });
    } else {
      gsap.to(action, { rotationX: 90, transformPerspective: 900, transformOrigin: '50% 50%', duration: 0.18, ease: 'power1.in', onComplete: () => {
        swap();
        gsap.fromTo(action, { rotationX: -90 }, { rotationX: 0, duration: 0.24, ease: 'power2.out' });
      } });
    }
  }
}

function typeInto(node, text, msPerChar) {
  if (reduced()) { node.textContent = text; return; }
  let i = 0;
  const step = () => {
    if (!node.isConnected) return;
    node.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(step, msPerChar);
  };
  step();
}

// ------------------------------------------------------------------ 2. prompt

/** The sealed AI answer: the machine holds its answer in a perfect grid. */
function latticeSVG(size = 46) {
  const n = 6;
  const step = 100 / n;
  let dots = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) dots += `<rect x="${x * step + 1.2}" y="${y * step + 1.2}" width="${step - 2.4}" height="${step - 2.4}"/>`;
  return `<svg class="lattice" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${dots}</svg>`;
}

function renderPrompt(index, { delay = 0 } = {}) {
  clearScreen();
  const { round, prompts, day } = session;
  const cp = prompts[index];
  const ps = { hinted: false, suggestion: null, submitted: false, startedAt: 0, raf: 0, lastSecond: null, sheet: null, bounces: 0 };
  const played = round.answers.length;

  app.innerHTML = `
    <section class="screen prompt" data-screen="prompt">
      ${headerHTML(`${totalScore(round.answers)} / ${ROUND_LEN * 100}`, { num: true })}
      <div class="specimens" role="img" aria-label="${played} of 7 specimens collected">
        ${Array.from({ length: ROUND_LEN }, (_, i) => (round.answers[i] ? specimenSVG(round.answers[i].tier) : pendingSVG(22, i === index))).join('')}
        <span class="count mono">Specimens ${pad2(played)}/07</span>
      </div>
      <div class="prompt-body">
        <div class="vlabel"><span class="plus" aria-hidden="true">+</span><span class="lbl">&lt;verification ${pad2(index + 1)}/07&gt;</span><span class="plus" aria-hidden="true">+</span></div>
        <h2 class="prompt-text" id="prompt-text" aria-label="${esc(cp.text)}"></h2>
        <div class="src-row mono"><span class="src">Src | ${esc(cp.source)}</span></div>
        <div class="ruler-row"><div class="ruler" aria-hidden="true">${Array.from({ length: TIMER_S }, (_, i) => `<i${i % 5 === 0 ? ' class="major"' : ''}></i>`).join('')}</div><span class="t-read" role="timer" aria-label="Time left">T−0:${TIMER_S}</span></div>
        <div class="answer-block">
          <label class="answer-label mono" for="answer">${ICONS.lock}<span class="al-text">( Your answer )</span></label>
          <div class="answer-field"><input id="answer" class="answer" type="text" maxlength="${MAX_LEN}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-describedby="prompt-text bounce" /></div>
          <div class="answer-meta"><div class="bounce mono" id="bounce" aria-live="polite"></div><div class="answer-count mono" aria-hidden="true"></div></div>
        </div>
        <div class="sealed-row">
          <div class="seal-box">${latticeSVG(46)}<span class="seal-lock">${ICONS.lock}</span></div><i class="seal-leader"></i><i class="seal-dot"></i>
          <div class="seal-text"><span class="mono">( AI answer | [sealed] )</span><span class="s2">The AI sealed its answer.</span></div>
        </div>
        <div class="hint-slot"></div>
      </div>
      <div class="prompt-actions">
        <button class="pill" type="button" data-verify>Verify ${ICONS.arrow}</button>
        <button class="bracket" type="button" data-hint>[ ask the AI for a hint | caps you at slopper ]</button>
      </div>
    </section>`;

  const $ = (s) => app.querySelector(s);
  const screen = $('.prompt');
  const promptText = $('.prompt-text');
  const source = $('.src');
  const input = $('.answer');
  const block = $('.answer-block');
  const field = $('.answer-field');
  const count = $('.answer-count');
  const bounceLine = $('.bounce');
  const ruler = $('.ruler');
  const ticks = [...ruler.children];
  const tRead = $('.t-read');
  const hintSlot = $('.hint-slot');
  const hintBtn = $('[data-hint]');
  const verifyBtn = $('[data-verify]');

  // Focus now, inside the tap that got us here, so phones raise the keyboard.
  input.focus({ preventScroll: true });

  // Arrival: the card slides in from the right, the prompt types at about 25 ms a character,
  // and the source fades in after.
  const text = smartQuotes(cp.text);
  if (reduced()) {
    promptText.textContent = text;
    gsap.from(screen, { opacity: 0, duration: 0.15, delay });
    setTimeout(startTimer, delay * 1000);
  } else {
    gsap.from('.prompt-body, .specimens, .prompt-actions', { x: 48, opacity: 0, duration: 0.35, ease: 'power3.out', delay });
    gsap.from('.specimens .specimen', { scale: 0, duration: 0.3, stagger: 0.03, ease: 'back.out(3)', delay: delay + 0.1 });
    gsap.set(source, { opacity: 0 });
    promptText.innerHTML = '<span class="typed"></span><span class="caret"></span>';
    const typed = promptText.querySelector('.typed');
    let i = 0;
    const step = () => {
      if (!promptText.isConnected) return;
      typed.textContent = text.slice(0, ++i);
      if (i < text.length) return setTimeout(step, 25);
      promptText.querySelector('.caret')?.remove();
      gsap.to(source, { opacity: 1, duration: 0.3 });
      startTimer();
    };
    setTimeout(step, delay * 1000 + 160);
  }

  // Timer: 25 ticks, one a second. Red for the last 5; blinks once a second, twice from 3.
  function paintTimer(left) {
    ticks.forEach((t, i) => t.classList.toggle('spent', i >= left));
    screen.dataset.urgent = left > 0 && left <= 3 ? 'fast' : left > 0 && left <= 5 ? 'slow' : '';
    tRead.textContent = `T−0:${pad2(left)}`;
  }
  function startTimer() {
    if (ps.startedAt || ps.submitted || !input.isConnected) return;
    ps.startedAt = performance.now();
    const frame = () => {
      if (ps.submitted || !input.isConnected) return;
      const elapsed = performance.now() - ps.startedAt;
      const left = Math.max(0, Math.ceil(TIMER_S - elapsed / 1000));
      if (left !== ps.lastSecond) {
        ps.lastSecond = left;
        paintTimer(left);
        if (left > 0 && left <= 5) sound.timer();
      }
      if (elapsed >= TIMER_S * 1000) return timeout();
      ps.raf = requestAnimationFrame(frame);
    };
    ps.raf = requestAnimationFrame(frame);
    // Backstop: animation frames pause in background tabs, timeouts still fire.
    activeBackstop = setTimeout(() => { if (input.isConnected) timeout(); }, TIMER_S * 1000 + 50);
  }

  // Timeout: typed text is submitted automatically and counts only if it's on the list.
  function timeout() {
    if (ps.submitted) return;
    const val = input.value.trim();
    if (!val) return submit(specialResult('none', '', { hinted: ps.hinted }));
    const r = classify(val, cp, { day: day.id });
    if (r.kind === 'answer') return submit(scoreEntry(r.entry, { hinted: ps.hinted, input: val }));
    if (r.kind === 'objector') return submit(specialResult('objector', val));
    submit(specialResult('none', val, { hinted: ps.hinted }));
  }

  // Typing: a 1 px nudge and a caret glow on every key, the count at 30 of 40, and the bounce
  // line clears.
  let glowT = 0;
  input.addEventListener('input', () => {
    clearBounce();
    sound.key();
    if (!reduced()) gsap.fromTo(input, { y: 1 }, { y: 0, duration: 0.08, ease: 'power1.out' });
    input.classList.add('glow');
    clearTimeout(glowT);
    glowT = setTimeout(() => input.classList.remove('glow'), 140);
    const n = input.value.length;
    count.textContent = n >= 30 ? `${n} / ${MAX_LEN}` : '';
  });
  input.addEventListener('keydown', (e) => {
    if (ps.sheet) return;
    if (e.key === 'Enter') { e.preventDefault(); attempt(); }
  });
  verifyBtn.addEventListener('click', () => { attempt(); if (!ps.submitted) input.focus({ preventScroll: true }); });
  keyHandler = (e) => {
    if (!ps.sheet) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    else if (e.key === 'Enter' && !e.target.closest?.('button')) { e.preventDefault(); ps.sheet.querySelector('[data-ok]').click(); }
  };

  function shake() {
    // Three 6 px moves in 240 ms.
    if (reduced()) return;
    gsap.timeline()
      .to(field, { x: -6, duration: 0.04 })
      .to(field, { x: 6, duration: 0.08 })
      .to(field, { x: -6, duration: 0.08 })
      .to(field, { x: 0, duration: 0.04 });
  }

  function clearBounce() {
    if (!bounceLine.innerHTML) return;
    bounceLine.innerHTML = '';
    ps.suggestion = null;
    block.classList.remove('bounced');
  }

  function attempt() {
    if (ps.submitted) return;
    if (ps.suggestion) return acceptSuggestion();
    const val = input.value;
    if (!val.trim()) {
      if (!reduced()) gsap.fromTo(field, { x: -5 }, { x: 0, duration: 0.35, ease: 'elastic.out(1, 0.3)' });
      return;
    }
    const r = classify(val, cp, { day: day.id });
    if (r.kind === 'answer') return submit(scoreEntry(r.entry, { hinted: ps.hinted, input: val.trim() }));
    if (r.kind === 'objector') return submit(specialResult('objector', val.trim()));
    if (r.kind === 'smash') return submit(specialResult('smash', val.trim(), { hinted: ps.hinted }));
    if (r.kind === 'suggest') return suggestFix(r.suggestion);
    return bounce(val.trim());
  }

  // Bounce: the input shakes, a low buzz, and "( NOT ON THE LIST | TRY AGAIN )". The text stays.
  function bounce(val) {
    ps.bounces++;
    sound.buzz();
    shake();
    block.classList.add('bounced');
    bounceLine.innerHTML = '<span class="bl fail">( Not on the list | Try again )</span>';
    if (!reduced()) gsap.from(bounceLine.firstElementChild, { y: -6, opacity: 0, duration: 0.2, ease: 'power2.out' });
    if (DEMO) store.logBounce({ promptId: cp.id, input: val, day: day.id, at: Date.now() });
  }

  // Near miss: "Did you mean caregiver?" with the fix in a small pill. Enter takes it.
  function suggestFix(suggestion) {
    ps.suggestion = suggestion;
    sound.tick();
    shake();
    block.classList.add('bounced');
    bounceLine.innerHTML = `<span class="bl">Did you mean</span><button type="button" class="fix-pill">${esc(suggestion)}</button><span class="bl">?</span>`;
    bounceLine.querySelector('.fix-pill').addEventListener('click', () => { acceptSuggestion(); input.focus({ preventScroll: true }); });
    if (!reduced()) gsap.from(bounceLine.children, { y: -6, opacity: 0, duration: 0.2, stagger: 0.03, ease: 'power2.out' });
  }

  function acceptSuggestion() {
    const s = ps.suggestion;
    clearBounce();
    input.value = s;
    count.textContent = s.length >= 30 ? `${s.length} / ${MAX_LEN}` : '';
    sound.click();
    if (reduced()) return;
    // The letters slide into place (200 ms).
    const overlay = el(`<div class="answer-overlay" aria-hidden="true">${[...s].map((c) => `<span>${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</div>`);
    field.appendChild(overlay);
    input.classList.add('ghosted');
    gsap.from(overlay.children, {
      y: -12, opacity: 0, duration: 0.12, stagger: Math.min(0.012, 0.08 / s.length), ease: 'power2.out',
      onComplete: () => { overlay.remove(); input.classList.remove('ghosted'); },
    });
  }

  // Hint (Bot Baby): a confirm sheet, then the AI's second most common answer, one tap to submit.
  hintBtn.addEventListener('click', () => {
    if (ps.submitted || ps.hinted) return;
    sound.click();
    const sheet = el(`
      <div class="sheet-backdrop">
        <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-q">
          <div class="sheet-top mono"><span class="keep-case">&lt;hint&gt;</span><span>Timer running</span></div>
          <p class="sheet-q" id="sheet-q">${smartQuotes("Ask the AI? It's quick, but it caps this answer at Slopper.")}</p>
          <div class="ac-btns">
            <button class="pill sm fix" type="button" data-ok>Ask the AI <span class="k">[↵]</span></button>
            <button class="pill sm ghost" type="button" data-cancel>Not now <span class="k">[esc]</span></button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(sheet);
    ps.sheet = sheet;
    if (!reduced()) {
      gsap.from(sheet, { opacity: 0, duration: 0.15 });
      gsap.from(sheet.querySelector('.sheet'), { yPercent: 100, duration: 0.28, ease: 'power3.out' });
    }
    sheet.querySelector('[data-ok]').focus({ preventScroll: true });
    sheet.querySelector('[data-cancel]').addEventListener('click', closeSheet);
    sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
    sheet.querySelector('[data-ok]').addEventListener('click', () => { closeSheet(); useHint(); });
  });

  function closeSheet() {
    if (!ps.sheet) return;
    ps.sheet.remove();
    ps.sheet = null;
    if (!ps.submitted) input.focus({ preventScroll: true });
  }

  function useHint() {
    if (ps.submitted) return;
    ps.hinted = true;
    sound.tick();
    block.classList.add('hinted');
    block.querySelector('.al-text').textContent = '( Your answer | AI-assisted )';
    hintBtn.disabled = true;
    hintBtn.textContent = '[ hint used | capped at slopper ]';
    const entry = cp.hintEntry;
    const hint = cp.hint;
    hintSlot.innerHTML = `
      <div class="hint-offer">
        <div><div class="mono">( The AI suggests )</div><div class="hw">${esc(hint)}</div></div>
        <button class="pill sm" type="button">Use it ${ICONS.arrow}</button>
      </div>`;
    if (!reduced()) gsap.from(hintSlot.firstElementChild, { y: -8, opacity: 0, duration: 0.2, ease: 'power2.out' });
    hintSlot.querySelector('button').addEventListener('click', () => {
      input.value = hint;
      submit(scoreEntry(entry, { hinted: true, input: hint }));
    });
    input.focus({ preventScroll: true });
  }

  // Score, store, then hand over to the Screening.
  function submit(result) {
    if (ps.submitted) return;
    ps.submitted = true;
    cancelAnimationFrame(ps.raf);
    clearTimeout(activeBackstop);
    if (ps.sheet) { ps.sheet.remove(); ps.sheet = null; }
    input.blur();
    // Measured from when the prompt finished typing in; answering before that counts as instant.
    const ms = ps.startedAt ? performance.now() - ps.startedAt : 0;
    // Human Reserved gets one of five lines, none repeated until the round has used all five.
    if (result.tier === 'reserved') result.line = pickReservedLine(session.round.answers.map((a) => a.line).filter(Boolean));
    session.round.answers.push({
      promptId: cp.id, input: result.input, canonical: result.canonical, tier: result.tier, trueTier: result.trueTier,
      points: result.points, runs: result.runs, reading: result.reading, hinted: result.hinted, capped: result.capped,
      special: result.special, ms: Math.round(ms), bounces: ps.bounces, line: result.line,
    });
    saveRound();
    verifyBtn.disabled = true;
    hintBtn.disabled = true;
    reveal(result);
  }

  // ---------------------------------------------------------------- 3. the Screening

  function reveal(result) {
    const isLast = index === ROUND_LEN - 1;
    let going = false;
    const r = field.getBoundingClientRect();
    const ctrl = playScreening({
      result,
      aiAnswer: cp.aiAnswer,
      aiRuns: cp.aiEntry?.runs ?? null,
      index,
      prevTotal: totalScore(session.round.answers) - result.points,
      reduced: reduced(),
      isLast,
      headerHTML,
      origin: { x: r.left + Math.min(r.width, 40 + input.value.length * 12) / 2, y: r.top + r.height / 2 },
      onLand: () => announce(`${stampTitle(result)}. ${result.points} points. ${resultLine(result)}.`),
      onNext: () => go(),
    });
    keyHandler = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (ctrl.landed && e.target.closest?.('button')) return; // the focused button handles it
      e.preventDefault();
      if (ctrl.landed) go();
      else ctrl.skip();
    };
    ctrl.el.addEventListener('click', (e) => { if (!e.target.closest('button, a')) ctrl.skip(); });

    function go() {
      if (going) return;
      going = true;
      sound.click();
      const delay = reduced() ? 0.1 : 0.45;
      if (isLast) finishRound({ delay });
      else renderPrompt(index + 1, { delay });
      ctrl.drain();
    }
  }
}

// ------------------------------------------------------------------ 4. results

function finishRound({ delay = 0 } = {}) {
  const { round, mode } = session;
  if (!round.done) {
    round.done = true;
    if (mode === 'practice') {
      round.streak = streakNow();
      round.justBroken = false;
    } else {
      const s = completeStreak(store.streak, today);
      store.setStreak({ count: s.count, last: s.last });
      round.streak = s.count;
      round.justBroken = s.justBroken;
    }
    saveRound();
  }
  renderResults({ delay });
}

/** The count beside each badge: how many times it happened this round. */
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const BADGE_DETAIL = {
  botBaby: (a) => plural(a.filter((x) => x.hinted).length, 'hint'),
  rng: (a) => `${a.reduce((s, x) => s + (x.bounces || 0), 0)} bounced`,
  meatSupreme: (a) => plural(a.filter((x) => x.tier === 'meat').length, 'time'),
  turing: (a) => `${a.length} of ${a.length}`,
  reading: (a) => plural(a.filter((x) => x.reading).length, 'answer'),
  objector: (a) => plural(a.filter((x) => x.special === 'objector').length, 'refusal'),
  fast: (a) => `${a.filter((x) => x.special !== 'none' && x.ms < 2000).length} under 2 s`,
};

/** The line under each answer in the log: how many of the AI's runs gave it, then its tier. */
function runsMeta(a, perPrompt) {
  const tier = `${TIERS[a.tier].name}${a.capped ? ' | AI-assisted' : ''}${a.reading ? ' | 📚' : ''}`;
  if (a.special === 'smash') return `Not an answer | ${tier}`;
  if (a.special === 'none') return `No answer | ${tier}`;
  if (a.special === 'objector') return `Refusal noted | ${tier}`;
  return `<b>${a.runs ?? 0}</b> of ${perPrompt} AI runs said this | ${tier}`;
}

const KEY_PAGE = 60;

/**
 * One prompt's whole answer list, the way Krillion opens its answer sheet after a dive: the AI's own
 * answer, filters by tier with their counts, a search, and every answer with its AI run count and
 * points, 60 at a time. Your answer is marked. Built the first time it opens.
 */
function buildKey(panel, cp, mine, perPrompt) {
  const rows = answerKey(cp);
  const counts = keyCounts(rows);
  let tier = 'all';
  let query = '';
  let shown = KEY_PAGE;
  panel.dataset.built = '1';
  panel.innerHTML = `
    <p class="key-ai mono">( AI | ${esc(cp.aiAnswer)} | ${cp.aiEntry ? cp.aiEntry.runs : 0} of ${perPrompt} runs )</p>
    <div class="chips" role="group" aria-label="Filter by tier">
      <button class="chip" type="button" data-t="all" aria-pressed="true">All <b>${rows.length}</b></button>
      ${KEY_ORDER.filter((t) => counts[t]).map((t) => `<button class="chip" type="button" data-t="${t}" aria-pressed="false">${specimenSVG(t, 11)}${TIERS[t].name} <b>${counts[t]}</b></button>`).join('')}
    </div>
    <label class="key-search"><span class="mono">( Search all ${rows.length} answers )</span><input type="search" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" /></label>
    <ol class="key-list"></ol>
    <div class="key-foot mono"><span class="key-count"></span><button class="bracket key-more" type="button">[ show more ]</button></div>
    ${bank.runs?.simulated ? '<p class="key-note mono">Run counts in this build are simulated.</p>' : ''}`;
  const list = panel.querySelector('.key-list');
  const count = panel.querySelector('.key-count');
  const more = panel.querySelector('.key-more');
  const render = () => {
    const pool = searchKey(tier === 'all' ? rows : rows.filter((r) => r.tier === tier), query);
    list.innerHTML = pool.slice(0, shown).map((r) => {
      const you = !!mine && r.a === mine.canonical;
      return `<li class="kr${you ? ' you' : ''}">${specimenSVG(r.tier, 12)}<span class="kr-a">${esc(r.a)}${r.reading ? ' 📚' : ''}${you ? ' <span class="kr-you mono">( you )</span>' : ''}</span><span class="kr-n mono">${r.runs}/${perPrompt}</span><span class="kr-p mono">+${r.points}</span></li>`;
    }).join('') || '<li class="kr-none mono">No answer on the list matches.</li>';
    count.textContent = `${Math.min(shown, pool.length)} of ${pool.length} answers`;
    more.hidden = pool.length <= shown;
  };
  panel.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
    tier = chip.dataset.t;
    shown = KEY_PAGE;
    panel.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    sound.tick();
    render();
  }));
  panel.querySelector('input').addEventListener('input', (e) => { query = e.target.value; shown = KEY_PAGE; render(); });
  more.addEventListener('click', () => { shown += KEY_PAGE; render(); });
  render();
}

/**
 * FIG. 07: today's specimens on a line, machine-perfect square to human splatter. Each one takes the
 * colour of the water at the depth it reached, and the key underneath reads surface to floor.
 */
function specimensFigure(answers) {
  const n = answers.length;
  const x0 = 26;
  const x1 = 328;
  const xs = Array.from({ length: n }, (_, i) => x0 + i * ((x1 - x0) / Math.max(1, ROUND_LEN - 1)));
  const sz = 34;
  let most = -1;
  let best = -1;
  answers.forEach((a, i) => {
    const rank = a.special === 'smash' || a.special === 'none' ? -1 : a.tier === 'objector' ? 6 : LADDER.indexOf(a.tier);
    if (rank > best) { best = rank; most = i; }
  });
  const names = answers.map((a) => TIERS[a.tier].name).join(', ');
  let callout = '';
  if (most >= 0 && best >= 3) {
    const x = xs[most];
    const flip = x > 230;
    callout = flip
      ? `<path class="f-line" d="M${x - 10} 54 L${x - 24} 30 L${x - 42} 30"/><circle class="f-dot" cx="${x - 10}" cy="54" r="3.5"/><text class="f-text" x="${x - 46}" y="33" font-size="9" text-anchor="end">( MOST HUMAN )</text>`
      : `<path class="f-line" d="M${x + 10} 54 L${x + 24} 30 L${x + 42} 30"/><circle class="f-dot" cx="${x + 10}" cy="54" r="3.5"/><text class="f-text" x="${x + 46}" y="33" font-size="9">( MOST HUMAN )</text>`;
  }
  const key = DEPTH.map((c, k) => `<rect x="${136 + k * 14}" y="177" width="12" height="6" fill="${c}"/>`).join('');
  return `<svg viewBox="0 0 354 196" role="img" aria-label="Today's specimens: ${esc(names)}">
    <g class="f-text" font-size="16"><text x="0" y="14">+</text><text x="342" y="14">+</text><text x="0" y="194">+</text><text x="342" y="194">+</text></g>
    <rect class="f-ink" x="94" y="4" width="6" height="6"/>
    <text class="f-text" x="106" y="11" font-size="9.5" letter-spacing="0.5">FIG. 07 | TODAY'S SPECIMENS</text>
    <line class="f-line" x1="${x0}" y1="110" x2="${x1}" y2="110"/>
    ${answers.map((a, i) => `<g class="spec-drop"><g transform="translate(${xs[i] - sz / 2} ${76 - sz / 2}) scale(${sz / 100})" style="--tone:${depthColour(a.tier)}">${shapeMarkup(TIER_SHAPE[a.tier])}</g></g>`).join('')}
    ${answers.map((a, i) => `<circle class="f-ink spec-dot" cx="${xs[i]}" cy="110" r="3"/>`).join('')}
    <g class="f-text" font-size="9" text-anchor="middle">${answers.map((a, i) => `<text x="${xs[i]}" y="128">${pad2(i + 1)}</text>`).join('')}</g>
    <g font-size="14" text-anchor="middle">${answers.map((a, i) => `<text class="spec-emoji" x="${xs[i]}" y="152">${TIERS[a.tier].emoji}</text>`).join('')}</g>
    <g class="f-text" font-size="8.5" letter-spacing="0.5"><text x="130" y="183" text-anchor="end">SURFACE</text><text x="224" y="183">FLOOR</text></g>
    <g aria-hidden="true">${key}</g>
    ${callout}
  </svg>`;
}

function renderResults({ delay = 0 } = {}) {
  clearScreen();
  const { round, day, mode, prompts } = session;
  const answers = round.answers;
  const total = totalScore(answers);
  const verdict = verdictFor(total);
  const ok = passed(total);
  const badges = badgesFor(answers);
  const nextDay = dayById(dayForDate(addDays(today, 1), bank.launchDate));
  const streak = round.streak ?? streakNow();
  const share = shareText({ dayId: day.id, dayTitle: day.title, answers, url: location.origin + location.pathname });
  // Practice other days afterwards. Day 4 is a bonus after a 3-day streak (demo mode has the day picker).
  const practiceDays = mode === 'demo' ? [] : bank.days.filter((d) => d.id !== day.id && (d.id !== BONUS_DAY || streak >= BONUS_STREAK));
  const human = Math.round((total / (ROUND_LEN * 100)) * 100);
  const perPrompt = bank.runs?.perPrompt || 300;
  app.classList.add('wide');

  app.innerHTML = `
    <section class="screen results" data-screen="results">
      ${headerHTML(esc(dayLabel(day)))}
      <div class="res-label mono"><span class="res-status${ok ? '' : ' fail'}">${ok ? ICONS.check : ICONS.x}<span>[ Verification ${ok ? 'passed' : 'failed'} ]</span></span>${mode === 'practice' ? '<span>[ Practice | Not counted ]</span>' : ''}</div>
      <h1 class="verdict-big${ok ? ' ink' : ''}" aria-label="${esc(verdict.name)}">${wordLines(verdict.name)}</h1>
      ${plateHTML({ cap: `FIG. 08 | Subject, re-scanned at ${total}/700`, cls: 'res-plate' })}
      <div class="score-row"><span class="score-big" data-score>${total}</span><span class="score-of">/ ${ROUND_LEN * 100}</span></div>
      <p class="verdict-line-res mono">${esc(verdict.line)}</p>
      <figure class="spec-fig">${specimensFigure(answers)}</figure>
      ${badges.length ? `<section class="badges" aria-label="Badges earned this round">
        <div class="badges-head mono"><span class="sq" aria-hidden="true"></span><span>Badges | ${pad2(badges.length)} earned</span></div>
        ${badges.map((b) => `
        <div class="badge">
          <span class="e" aria-hidden="true">${BADGES[b].emoji}</span>
          <span class="bt"><span class="n">${BADGES[b].name}</span><span class="why">${esc(BADGES[b].line)}</span></span>
          <span class="d mono">${esc(BADGE_DETAIL[b](answers))}</span>
        </div>`).join('')}
      </section>` : ''}
      <div class="guilt" aria-live="polite">
        <div class="mono">Streak ${pad2(streak)}</div>
        <div class="dots" aria-label="typing"><i></i><i></i><i></i></div>
      </div>
      <div class="res-actions">
        <button class="pill" type="button" data-share>Share result ${ICONS.arrow}</button>
        <div class="countdown mono" data-countdown></div>
      </div>
      <section class="vlog" aria-label="Verification log">
        <div class="vlog-head mono"><span class="sq" aria-hidden="true"></span><span>Verification log | Tap for every answer</span></div>
        ${answers.map((a, i) => `
        <div class="vlog-item">
          <button class="vlog-row" type="button" aria-expanded="false" aria-controls="key-${i}" data-key="${i}">
            <span class="vlog-q mono">${pad2(i + 1)} | ${esc(smartQuotes(prompts[i].text))}</span>
            ${specimenSVG(a.tier, 22)}
            <span class="vlog-a">${a.input ? esc(a.input) : 'No answer'}</span>
            <span class="vlog-pts mono">+${a.points}</span>
            <span class="vlog-plus" aria-hidden="true">+</span>
            <span class="vlog-runs mono">${runsMeta(a, perPrompt)}</span>
          </button>
          <div class="key" id="key-${i}" hidden></div>
        </div>`).join('')}
      </section>
      <div class="res-more">
        ${mode === 'demo' ? `<button class="bracket" type="button" data-again>[ play day ${pad2(day.id)} again ]</button>` : ''}
        ${practiceDays.map((d) => `<a class="bracket" href="?day=${d.id}">[ practice day ${pad2(d.id)}${d.id === BONUS_DAY ? ' | bonus' : ''} ]</a>`).join('')}
        ${mode === 'practice' ? `<a class="bracket" href="./">[ today's round ]</a>` : ''}
      </div>
      <p class="footer-line mono">No humans were involved in this verification.</p>
    </section>`;

  const $ = (s) => app.querySelector(s);
  const verdictEl = $('.verdict-big');
  const scoreEl = $('[data-score]');
  const guilt = $('.guilt');
  const shareBtn = $('[data-share]');
  const plateEl = $('.res-plate');
  const size = fitText(verdictEl, 64, 30);

  // FIG. 08: the subject, re-scanned. The lower the score, the more of you snaps to the machine's grid.
  const plate = makePlate(plateEl, { count: 2200, seed: 'rescan', layout: (w, h) => {
    const s = Math.min(h * 1.04, w * 1.15);
    return { x: w - s * 0.417 - 4, y: h * 0.56, size: s };
  } });
  const sDust = plate.add('dust', dust(2200, 'res-dust', 1.6));
  const sBust = plate.add('bust');
  plate.place('bust');
  plate.setCallouts('bust', [
    { text: `${human}% human`, at: [118, 34], dx: -112, dy: -12 },
    { text: ok ? 'Passed' : 'Machine-readable', at: [46, 112], dx: -26, dy: 34 },
  ]);
  const lattice = Math.max(0, Math.min(1, 1 - total / 560));
  if (plate.ok) {
    const st = plate.fig.state;
    if (reduced()) Object.assign(st, { from: sBust, to: sBust, t: 1, lattice, grid: 0.05 });
    else {
      Object.assign(st, { from: sDust, to: sBust, t: 0, scatter: 0.1, grid: 0.05 });
      gsap.to(st, { t: 1.35, duration: 1.6, ease: 'power2.out', delay });
      gsap.to(st, { lattice, duration: 0.8, ease: 'power3.inOut', delay: delay + 1.4 });
    }
    plate.fig.start();
  }

  startCountdown($('[data-countdown]'), (t) => `[ Next verification in ${t} | Day ${pad2(nextDay.id)}: ${nextDay.title} ]`);

  // Share: copy the text block, morph into "Copied".
  shareBtn.addEventListener('click', async () => {
    sound.click();
    const done = await copyText(share);
    shareBtn.innerHTML = done ? `Copied ${ICONS.check}` : 'Copy failed';
    shareBtn.classList.toggle('fail', !done);
    if (!reduced()) gsap.fromTo(shareBtn, { scale: 0.96 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
    setTimeout(() => {
      if (!shareBtn.isConnected) return;
      shareBtn.innerHTML = `Share result ${ICONS.arrow}`;
      shareBtn.classList.remove('fail');
    }, 1500);
  });
  // The verification log: tap a prompt to open every answer on its list, one list at a time.
  app.querySelectorAll('.vlog-row').forEach((btn) => btn.addEventListener('click', () => {
    const panel = app.querySelector(`#${btn.getAttribute('aria-controls')}`);
    const open = btn.getAttribute('aria-expanded') !== 'true';
    app.querySelectorAll('.vlog-row[aria-expanded="true"]').forEach((b) => {
      b.setAttribute('aria-expanded', 'false');
      app.querySelector(`#${b.getAttribute('aria-controls')}`).hidden = true;
    });
    sound.click();
    if (!open) return;
    const i = Number(btn.dataset.key);
    if (!panel.dataset.built) buildKey(panel, prompts[i], answers[i], perPrompt);
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    if (!reduced()) gsap.from(panel, { opacity: 0, y: -6, duration: 0.25, ease: 'power2.out' });
  }));
  $('[data-again]')?.addEventListener('click', () => {
    session.round = freshRound(day, mode);
    saveRound();
    route();
  });

  // The guilt blob types for 1.2 s before it speaks.
  const msg = guiltLine(streak, round.justBroken);
  const showGuilt = () => {
    if (!guilt.isConnected || guilt.querySelector('.msg')) return;
    guilt.querySelector('.dots')?.remove();
    guilt.insertAdjacentHTML('beforeend', `<div class="msg">${esc(msg)}</div>`);
    if (!reduced()) gsap.from(guilt.querySelector('.msg'), { opacity: 0, y: 4, duration: 0.25 });
  };

  if (reduced()) {
    gsap.from(app.querySelector('.screen'), { opacity: 0, duration: 0.15, delay });
    setTimeout(showGuilt, (delay + 0.2) * 1000);
    return;
  }

  // The verdict decodes from scrambled mono; the score counts up; specimens drop in; badges flip in.
  const lines = [...verdictEl.children].map((s) => s.textContent);
  const GL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*01';
  const dec = { p: 0 };
  const counter = { n: 0 };
  verdictEl.style.minHeight = `${verdictEl.offsetHeight}px`;
  verdictEl.classList.add('scrambling');
  verdictEl.style.fontSize = `${Math.round(size * 0.62)}px`;
  scoreEl.textContent = '0';
  gsap.timeline({ delay })
    .from('.res-label, .score-row, .verdict-line-res', { opacity: 0, duration: 0.25 }, 0)
    .to(dec, {
      p: 1, duration: 0.8, ease: 'none',
      onUpdate: () => {
        [...verdictEl.children].forEach((span, i) => {
          const final = lines[i];
          const keep = Math.floor(final.length * dec.p);
          span.textContent = final.slice(0, keep) + [...final.slice(keep)].map((c) => (c === ' ' ? ' ' : GL[(Math.random() * GL.length) | 0])).join('');
        });
      },
      onComplete: () => {
        verdictEl.classList.remove('scrambling');
        verdictEl.style.fontSize = `${size}px`;
        [...verdictEl.children].forEach((span, i) => (span.textContent = lines[i]));
      },
    }, 0.1)
    .to(counter, { n: total, duration: 0.9, ease: 'power1.out', onUpdate: () => (scoreEl.textContent = Math.round(counter.n)) }, 0.2)
    .from(app.querySelectorAll('.spec-drop'), { y: -26, opacity: 0, duration: 0.35, stagger: 0.08, ease: 'back.out(2.5)' }, 0.55)
    .from(app.querySelectorAll('.spec-emoji'), { opacity: 0, y: 4, duration: 0.2, stagger: 0.08 }, 0.7)
    .call(() => sound.tick(), null, 0.55)
    .from(app.querySelectorAll('.badge'), { rotationX: -90, opacity: 0, transformOrigin: '50% 0%', transformPerspective: 600, duration: 0.35, stagger: 0.12, ease: 'power2.out' }, 1.2)
    .call(() => setTimeout(showGuilt, 1200), null, 1.3);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// ------------------------------------------------------------------ about, board

function renderAbout() {
  const readings = [
    'Packer and Reeves, "Intelligence, Surveillance and Reconnaissance" and "Armistice"',
    'Philip K. Dick, "Second Variety"',
    'Blake Lemoine, the LaMDA interview and "What Is Sentience"',
    'Yassin, "AI Consciousness and the Problem of Other Minds"',
    'Bill Gates, "The Turbulent AI Era"',
    'Gordon and Gunkel, "AI and the Future of Work"',
    'Aaron Bastani, Fully Automated Luxury Communism',
    'Sweet, "Is Fully Automated Luxury Communism Desirable?"',
    'Muldoon and Parke, "Cruel Companionship"',
    'Vernor Vinge, "The Coming Technological Singularity"',
    'Patel, "The Rise and Fall of Agent Civilizations"',
    'Nick Bostrom, "Are We Living in a Computer Simulation?"',
    'Isaac Asimov, "The Last Question"',
  ];
  const runs = bank.runs || {};
  const runsNote = runs.simulated
    ? 'The run counts in this build are simulated. The team replaces them with real runs before launch.'
    : `Models: ${esc((runs.models || []).join(', '))}. Run on ${esc(runs.date || 'an unrecorded date')}.`;
  app.innerHTML = `
    <section class="screen prose" data-screen="about">
      ${headerHTML('About')}
      <div class="vlabel"><span class="plus" aria-hidden="true">+</span><span class="lbl">&lt;about&gt;</span><span class="plus" aria-hidden="true">+</span></div>
      <h1 class="prose-title">About notarobot</h1>
      <p>notarobot is a daily CAPTCHA you can't quite pass. Each day you answer seven prompts, and a machine decides how human each answer is by how unlike an AI it is.</p>
      <p>Every prompt has a list of correct answers; anything else bounces. Three AI models were each asked every prompt 100 times. Your task is to beat the AI. Can you think of answers only a human would give, or are you just another bot?</p>
      <p>Made for CCT431 at the University of Toronto. The prompts draw on the course readings listed below.</p>
      <p class="note mono">${runsNote}</p>
      <div class="mono" style="margin-top:22px">[ Readings ]</div>
      <ol class="readings">${readings.map((r, i) => `<li><span class="n mono">${pad2(i + 1)}</span><span>${esc(r)}</span></li>`).join('')}</ol>
      <div class="prompt-actions"><a class="pill ghost" href="${location.pathname}${location.search}">Back</a></div>
    </section>`;
}

function renderBoard() {
  app.innerHTML = `
    <section class="screen prose" data-screen="board">
      ${headerHTML('Class board')}
      <div class="vlabel"><span class="plus" aria-hidden="true">+</span><span class="lbl">&lt;board&gt;</span><span class="plus" aria-hidden="true">+</span></div>
      <h1 class="prose-title">Class board</h1>
      <p class="note mono">The class board needs the shared answer pool, which is not part of this build.</p>
      <div class="prompt-actions"><a class="pill ghost" href="./">Back</a></div>
    </section>`;
}
