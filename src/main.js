// notarobot: screens and flow. DESIGN.md sets every rule here; the v2 Specimen page of the
// design pack sets the look.
import {
  compilePrompt, scoreAnswer, suggestDetail, TIERS, LADDER, BADGES, verdictFor, passed,
  badgesFor, totalScore, guiltLine, shareText, stampTitle, resultLine,
} from './scoring.js';
import { dateKey, dayForDate, liveStreak, completeStreak, msUntilMidnight, formatHMS, addDays } from './days.js';
import { createStore, resetAll } from './state.js';
import { sound } from './sound.js';
import { playScreening } from './reveal.js';
import { specimenSVG, pendingSVG, shapeMarkup, TIER_SHAPE } from './shapes.js';
import { ICONS, esc, el, casual, smartQuotes, pad2, wordLines, fitText, markChanges } from './ui.js';

const gsap = window.gsap;
const ROUND_LEN = 7;
const TIMER_S = 25;
const MAX_LEN = 40;

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
let session = null; // { mode, day, key, round, prompts }
let keyHandler = null;
let countdownTimer = null;
let activeBackstop = 0;

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
  if (DEMO) {
    mode = 'demo';
    dayId = DAY_PARAM && dayById(DAY_PARAM) ? DAY_PARAM : dayId;
  } else if (DAY_PARAM && dayById(DAY_PARAM)) {
    mode = 'practice';
    dayId = DAY_PARAM;
  }
  const day = dayById(dayId);
  const key = mode === 'scored' ? today : mode === 'demo' ? `demo-day-${dayId}` : null;
  const stored = key ? store.getRound(key) : null;
  const round = stored || freshRound(day, mode);
  return { mode, day, key, round, prompts: day.prompts.map(compilePrompt) };
}

function freshRound(day, mode) {
  return { dayId: day.id, date: today, mode, answers: [], done: false };
}

function saveRound() {
  if (session.key) store.putRound(session.key, session.round);
}

function route() {
  document.querySelectorAll('.scr, .sheet-backdrop').forEach((n) => n.remove());
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
}

function announce(text) {
  live.textContent = '';
  setTimeout(() => (live.textContent = text), 30);
}

// ------------------------------------------------------------------ chrome

/** "notarobot / Sound on" on the left; the day, the score or the stage on the right. */
function headerHTML(right, { num = false } = {}) {
  return `<header class="hdr">
    <div class="hdr-left"><a href="${location.pathname}${location.search}">notarobot</a><span aria-hidden="true">/</span><button class="hdr-sound" type="button" data-sound aria-pressed="${!sound.muted}">${sound.muted ? 'Sound off' : 'Sound on'}</button></div>
    <div class="hdr-right${num ? ' num' : ''}">${right}</div>
  </header>`;
}

function onSoundToggle(e) {
  if (!e.target.closest('[data-sound]')) return;
  sound.setMuted(!sound.muted);
  if (!sound.muted) { sound.unlock(); sound.click(); }
  document.querySelectorAll('[data-sound]').forEach((b) => {
    b.textContent = sound.muted ? 'Sound off' : 'Sound on';
    b.setAttribute('aria-pressed', String(!sound.muted));
  });
}

function setupDemoBar() {
  const bar = document.getElementById('demo-bar');
  const current = DAY_PARAM && dayById(DAY_PARAM) ? DAY_PARAM : scoredDayId();
  bar.hidden = false;
  bar.innerHTML = `
    <span class="tag-demo">[ Demo ]</span>
    ${bank.days.map((d) => `<button type="button" data-day="${d.id}" aria-pressed="${d.id === current}" aria-label="Day ${d.id}: ${esc(d.title)}">D${d.id}</button>`).join('')}
    <span class="spacer"></span>
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

function startCountdown(node, format) {
  if (!node) return;
  const paint = () => (node.textContent = format(formatHMS(msUntilMidnight())));
  paint();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => (node.isConnected ? paint() : clearInterval(countdownTimer)), 1000);
}

// ------------------------------------------------------------------ 1. gate

function gateFigure(locked) {
  return `<svg viewBox="0 0 354 380" role="img" aria-label="An organic blue blob labelled you, surrounded by small particles">
    <g class="f-text" font-size="16"><text x="0" y="22">+</text><text x="342" y="22">+</text><text x="0" y="376">+</text><text x="342" y="376">+</text></g>
    <rect class="f-ink" x="74" y="12" width="6" height="6"/>
    <text class="f-text" x="86" y="19" font-size="9.5" letter-spacing="0.5">FIG. 00 | SUBJECT, ${locked ? 'VERIFIED' : 'UNVERIFIED'}</text>
    <g class="gate-blob">
      <path class="f-ink" d="M176 58 C214 54 250 80 260 116 C268 146 284 164 276 194 C268 222 284 244 262 270 C240 294 206 294 180 292 C150 290 122 300 98 280 C74 260 86 234 76 208 C66 182 58 156 72 128 C86 98 108 76 136 66 C150 61 162 59 176 58Z"/>
      <path class="f-paper" d="M132 118 C140 112 152 116 150 126 C148 136 134 134 132 128 Z"/>
      <path class="f-paper" d="M196 104 C204 102 210 108 206 114 C202 120 192 116 196 104 Z"/>
      <path class="f-paper" d="M150 176 C162 170 176 178 170 190 C166 200 154 202 148 194 C142 186 144 180 150 176 Z"/>
      <ellipse class="f-paper" cx="224" cy="160" rx="7" ry="4" transform="rotate(-30 224 160)"/>
      <ellipse class="f-paper" cx="112" cy="222" rx="3" ry="5"/>
      <ellipse class="f-paper" cx="210" cy="238" rx="9" ry="5" transform="rotate(20 210 238)"/>
    </g>
    <g class="f-ink gate-particles"><circle cx="40" cy="120" r="2.5"/><circle cx="58" cy="96" r="1.5"/><circle cx="300" cy="86" r="3"/><circle cx="318" cy="150" r="1.5"/><circle cx="296" cy="300" r="2"/><circle cx="44" cy="292" r="3.5"/><circle cx="30" cy="210" r="1.5"/><circle cx="268" cy="330" r="1.5"/><circle cx="122" cy="332" r="2.5"/><circle cx="318" cy="236" r="2.5"/></g>
    <g class="f-line"><path d="M262 132 L300 112 L312 112"/><path d="M44 292 L44 320 L26 320"/></g>
    <circle class="f-dot" cx="262" cy="132" r="4"/>
    <text class="f-text" x="266" y="105" font-size="10">( YOU )</text>
    <text class="f-text" x="0" y="336" font-size="10">( 8 BILLION OTHERS )</text>
    <g class="f-line"><line x1="270" y1="356" x2="330" y2="356"/><line x1="270" y1="352" x2="270" y2="360"/><line x1="330" y1="352" x2="330" y2="360"/></g>
    <text class="f-text" x="300" y="347" text-anchor="middle" font-size="9">1 human</text>
  </svg>`;
}

function renderGate({ locked = false } = {}) {
  clearScreen();
  const { day, mode } = session;
  const streak = streakNow();
  const foot = mode === 'practice' ? '¹ Practice | Not counted' : `¹ ${ROUND_LEN} challenges | 25 s each | Once a day`;

  app.innerHTML = `
    <section class="screen gate-screen" data-screen="gate">
      ${headerHTML(esc(dayLabel(day)))}
      <div class="tag" style="margin-top:14px">Best played with sound</div>
      <figure class="gate-fig">${gateFigure(locked)}</figure>
      <div class="gate-action">
        ${locked ? `
        <div class="challenge">
          <p class="locked-msg mono">You've been verified for today. Come back tomorrow.</p>
          <button class="pill" type="button" data-results>View today's results ${ICONS.arrow}</button>
          <div class="mono" data-countdown></div>
        </div>` : `
        <button class="robot-pill" type="button" role="checkbox" aria-checked="false" aria-label="I'm not a robot">
          <span class="rbox pulse"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="tick" d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
          <span>I'm not a robot</span>
        </button>
        <div class="loading-line mono" aria-live="polite"></div>`}
      </div>
      <h1 class="gate-title" aria-label="not a robot"><span class="ink">not a</span><span class="ink">robot</span></h1>
      <div class="gate-foot mono"><span>${foot}</span><span>Streak ${pad2(streak)}</span></div>
      <div class="gate-links"><a class="bracket" href="#about">[ about ]</a></div>
    </section>`;

  const $ = (s) => app.querySelector(s);
  const title = $('.gate-title');
  const action = $('.gate-action');

  if (!reduced()) {
    // The ink-bleed title settles in from a blurred blot; particles drift; the blob breathes.
    gsap.fromTo(title, { filter: 'blur(14px)', opacity: 0.25, scale: 1.04, transformOrigin: '0% 100%' },
      { filter: 'blur(0px)', opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out', clearProps: 'filter' });
    gsap.to('.gate-blob', { scale: 1.025, transformOrigin: '50% 50%', duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    app.querySelectorAll('.gate-particles circle').forEach((c) => {
      gsap.to(c, { x: gsap.utils.random(-9, 9), y: gsap.utils.random(-9, 9), duration: gsap.utils.random(2.2, 4.4), yoyo: true, repeat: -1, ease: 'sine.inOut' });
    });
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
    setTimeout(() => {
      box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="tick" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
      box.classList.add('checked');
      btn.setAttribute('aria-checked', 'true');
      sound.tick();
      setTimeout(flip, reduced() ? 120 : 380);
    }, 1200);
  });

  function flip() {
    const swap = () => {
      action.innerHTML = `
        <div class="challenge">
          <p class="mono" style="margin:0;font-size:11px">Additional verification required. ${ROUND_LEN} challenges.</p>
          <div class="challenge-theme">Day ${pad2(day.id)}: ${esc(day.title)}</div>
          <button class="pill" type="button" data-begin>Begin verification ${ICONS.arrow}</button>
        </div>`;
      const begin = action.querySelector('[data-begin]');
      begin.addEventListener('click', () => {
        sound.click();
        if (session.round.done || session.round.answers.length) {
          session.round = freshRound(day, mode);
          saveRound();
        }
        renderPrompt(0);
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

function renderPrompt(index, { delay = 0 } = {}) {
  clearScreen();
  const { round, prompts, day } = session;
  const cp = prompts[index];
  const ps = { hinted: false, popover: null, suppressSuggest: false, submitted: false, startedAt: 0, raf: 0, lastSecond: null, sheet: null };
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
        <div class="src-row mono"><span class="src">Src | ${esc(cp.raw.source)}</span><span class="t-inline" aria-hidden="true">T−0:${TIMER_S}</span></div>
        <div class="ruler-row"><div class="ruler" aria-hidden="true">${Array.from({ length: TIMER_S }, (_, i) => `<i${i % 5 === 0 ? ' class="major"' : ''}></i>`).join('')}</div><span class="t-read" role="timer" aria-label="Time left">T−0:${TIMER_S}</span></div>
        <div class="ac-slot"></div>
        <div class="answer-block">
          <label class="answer-label mono" for="answer">${ICONS.lock}<span class="al-text">( Your answer )</span></label>
          <div class="answer-field"><input id="answer" class="answer" type="text" maxlength="${MAX_LEN}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-describedby="prompt-text" /></div>
          <div class="answer-count mono" aria-hidden="true"></div>
        </div>
        <p class="ac-notes mono">¹ Enter to fix it, enter again to submit.<br>² The timer keeps running.</p>
        <div class="sealed-row">
          <div class="seal-box">${ICONS.lock}</div><i class="seal-leader"></i><i class="seal-dot"></i>
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
  const ruler = $('.ruler');
  const ticks = [...ruler.children];
  const tRead = $('.t-read');
  const tInline = $('.t-inline');
  const acSlot = $('.ac-slot');
  const hintSlot = $('.hint-slot');
  const hintBtn = $('[data-hint]');
  const verifyBtn = $('[data-verify]');

  // Focus now, inside the tap that got us here, so phones raise the keyboard.
  input.focus({ preventScroll: true });

  // Arrival: slide in from the right, type the prompt at about 25 ms a character, fade the source in.
  const text = smartQuotes(cp.text);
  if (reduced()) {
    promptText.textContent = text;
    gsap.from(screen, { opacity: 0, duration: 0.15, delay });
    setTimeout(startTimer, delay * 1000);
  } else {
    gsap.from('.prompt-body, .specimens, .prompt-actions', { x: 40, opacity: 0, duration: 0.35, ease: 'power3.out', delay });
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

  // Timer: a 25-tick ruler that empties one tick a second. The last 5 pulse and tick.
  function paintTimer(left) {
    ticks.forEach((t, i) => t.classList.toggle('spent', i >= left));
    ruler.classList.toggle('urgent', left > 0 && left <= 5);
    const txt = `T−0:${pad2(left)}`;
    tRead.textContent = txt;
    tInline.textContent = txt;
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
  function timeout() {
    // Typed but not submitted text goes in as typed; nothing typed is No response.
    submit(input.value);
  }

  // Typing: a 1 px nudge and a glow on every key; the count appears at 30 of 40.
  let glowT = 0;
  input.addEventListener('input', () => {
    if (ps.popover) closePopover();
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
    else if (e.key === 'Escape' && ps.popover) { e.preventDefault(); closePopover(); }
  });
  verifyBtn.addEventListener('click', () => { attempt(); if (!ps.submitted) input.focus({ preventScroll: true }); });
  keyHandler = (e) => {
    if (!ps.sheet) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    else if (e.key === 'Enter' && !e.target.closest?.('button')) { e.preventDefault(); ps.sheet.querySelector('[data-ok]').click(); }
  };

  function nudgeEmpty() {
    if (!reduced()) gsap.fromTo(field, { x: -5 }, { x: 0, duration: 0.35, ease: 'elastic.out(1, 0.3)' });
  }

  // Autocorrect: the first Enter suggests, the second accepts, the third submits.
  function attempt() {
    if (ps.submitted) return;
    const val = input.value;
    if (ps.popover) return acceptSuggestion();
    if (!val.trim()) return nudgeEmpty();
    if (!ps.suppressSuggest) {
      const s = suggestDetail(val, cp);
      if (s && s.text !== val.trim()) return showPopover(s);
    }
    submit(val);
  }

  function showPopover({ text: suggestion, edits }) {
    sound.tick();
    screen.classList.add('has-popover');
    input.classList.add('wavy');
    acSlot.innerHTML = `
      <div class="ac-card" role="dialog" aria-label="Did you mean ${esc(suggestion)}?">
        <div class="ac-top mono"><span class="keep-case">&lt;autocorrect&gt;</span><span>${edits} ${edits === 1 ? 'edit' : 'edits'} away</span></div>
        <div class="ac-q">Did you mean<br>${markChanges(input.value.trim(), suggestion)}?</div>
        <div class="ac-btns">
          <button class="pill sm fix" type="button">Fix it <span class="k">[↵]</span></button>
          <button class="pill sm ghost" type="button" data-keep>Keep mine <span class="k">[esc]</span></button>
        </div>
      </div>
      <div class="ac-connector" aria-hidden="true"><i></i></div>`;
    ps.popover = { suggestion };
    acSlot.querySelector('.fix').addEventListener('click', () => { acceptSuggestion(); input.focus({ preventScroll: true }); });
    acSlot.querySelector('[data-keep]').addEventListener('click', () => { closePopover(); input.focus({ preventScroll: true }); });
    if (!reduced()) {
      gsap.fromTo(acSlot.querySelector('.ac-card'), { y: 14, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' });
      gsap.fromTo(acSlot.querySelector('.ac-connector i'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.2, ease: 'power2.out' });
    }
  }

  function closePopover() {
    ps.popover = null;
    ps.suppressSuggest = true; // Esc, Keep mine or typing: the next Enter submits as typed.
    acSlot.innerHTML = '';
    screen.classList.remove('has-popover');
    input.classList.remove('wavy');
  }

  function acceptSuggestion() {
    const s = ps.popover.suggestion;
    closePopover();
    input.value = s;
    sound.click();
    if (reduced()) return;
    // The letters slide into the corrected word (200 ms).
    const overlay = el(`<div class="answer-overlay" aria-hidden="true">${[...s].map((c) => `<span>${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</div>`);
    field.appendChild(overlay);
    input.classList.add('ghosted');
    gsap.from(overlay.children, {
      y: -12, opacity: 0, duration: 0.12, stagger: Math.min(0.012, 0.08 / s.length), ease: 'power2.out',
      onComplete: () => { overlay.remove(); input.classList.remove('ghosted'); },
    });
  }

  // Hint (Bot Baby): a confirm sheet, then the second most common human answer.
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
    const hint = casual(cp.hint);
    hintSlot.innerHTML = `
      <div class="hint-offer">
        <div><div class="mono">( The AI suggests )</div><div class="hw">${esc(hint)}</div></div>
        <button class="pill sm" type="button">Use this ${ICONS.arrow}</button>
      </div>`;
    if (!reduced()) gsap.from(hintSlot.firstElementChild, { y: -8, opacity: 0, duration: 0.2, ease: 'power2.out' });
    hintSlot.querySelector('button').addEventListener('click', () => { input.value = hint; submit(hint); });
    input.focus({ preventScroll: true });
  }

  // Submit and score, then hand over to the Screening.
  function submit(raw) {
    if (ps.submitted) return;
    ps.submitted = true;
    cancelAnimationFrame(ps.raf);
    clearTimeout(activeBackstop);
    if (ps.sheet) { ps.sheet.remove(); ps.sheet = null; }
    if (ps.popover) closePopover();
    input.blur();
    // Measured from when the prompt finished typing in; answering before that counts as instant.
    const ms = ps.startedAt ? performance.now() - ps.startedAt : 0;
    const result = scoreAnswer(raw, cp, { day: day.id, hinted: ps.hinted, pool: store.poolFor(cp.id) });
    session.round.answers.push({
      promptId: cp.id, input: result.input, tier: result.tier, points: result.points, share: result.share,
      hinted: result.hinted, capped: result.capped, special: result.special, isNew: result.isNew,
      canonical: result.canonical, ms: Math.round(ms),
    });
    // Practice rounds never touch the answer pool. Rejected answers are not answers.
    if (session.mode !== 'practice' && result.special !== 'smash' && result.special !== 'none') {
      store.addToPool(cp.id, result.canonical);
    }
    saveRound();
    verifyBtn.disabled = true;
    hintBtn.disabled = true;
    reveal(result);
  }

  // ---------------------------------------------------------------- 3. the Screening

  function reveal(result) {
    const isLast = index === ROUND_LEN - 1;
    let going = false;
    const ctrl = playScreening({
      result,
      aiAnswer: casual(cp.aiAnswer),
      index,
      prevTotal: totalScore(session.round.answers) - result.points,
      reduced: reduced(),
      isLast,
      headerHTML,
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

const BADGE_DETAIL = {
  botBaby: (a) => `Asked the AI × ${a.filter((x) => x.hinted).length}`,
  rng: (a) => `${a.filter((x) => x.isNew && !x.special && x.tier !== 'meat').length} answers nobody gave`,
  meatSupreme: (a) => `Matched the model × ${a.filter((x) => x.tier === 'meat').length}`,
  turing: () => 'No model matches',
  objector: () => 'Refusal noted',
  fast: (a) => `${a.filter((x) => x.special !== 'none' && x.ms < 2000).length} answers under 2 s`,
};

/** FIG. 07: today's specimens, from machine-perfect square to human splatter. */
function specimensFigure(answers) {
  const n = answers.length;
  const xs = Array.from({ length: n }, (_, i) => 31 + i * ((342 - 31 - 20) / Math.max(1, ROUND_LEN - 1)));
  const sz = 36;
  let most = -1;
  let best = 0;
  answers.forEach((a, i) => {
    const r = a.special === 'smash' || a.special === 'none' ? -1 : LADDER.indexOf(a.tier);
    if (r > best) { best = r; most = i; }
  });
  const names = answers.map((a) => TIERS[a.tier].name).join(', ');
  let callout = '';
  if (most >= 0) {
    const x = xs[most];
    const flip = x > 230;
    callout = flip
      ? `<path class="f-line" d="M${x - 12} 62 L${x - 26} 36 L${x - 44} 36"/><circle class="f-dot" cx="${x - 12}" cy="62" r="3.5"/><text class="f-text" x="${x - 48}" y="39" font-size="9" text-anchor="end">( MOST HUMAN )</text>`
      : `<path class="f-line" d="M${x + 12} 62 L${x + 26} 36 L${x + 44} 36"/><circle class="f-dot" cx="${x + 12}" cy="62" r="3.5"/><text class="f-text" x="${x + 48}" y="39" font-size="9">( MOST HUMAN )</text>`;
  }
  return `<svg viewBox="0 0 354 170" role="img" aria-label="Today's specimens: ${esc(names)}">
    <g class="f-text" font-size="16"><text x="0" y="16">+</text><text x="342" y="16">+</text><text x="0" y="168">+</text><text x="342" y="168">+</text></g>
    <rect class="f-ink" x="86" y="6" width="6" height="6"/>
    <text class="f-text" x="98" y="13" font-size="9.5" letter-spacing="0.5">FIG. 07 | TODAY'S SPECIMENS</text>
    ${answers.map((a, i) => `<g class="spec-drop"><g transform="translate(${xs[i] - sz / 2} ${83 - sz / 2}) scale(${sz / 100})">${shapeMarkup(TIER_SHAPE[a.tier])}</g></g>`).join('')}
    <g class="f-text" font-size="9" text-anchor="middle">${answers.map((a, i) => `<text x="${xs[i]}" y="122">${pad2(i + 1)}</text>`).join('')}</g>
    <g font-size="13" text-anchor="middle">${answers.map((a, i) => `<text x="${xs[i]}" y="143">${TIERS[a.tier].emoji}</text>`).join('')}</g>
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
  const practiceDays = mode === 'demo' ? [] : bank.days.filter((d) => d.id !== day.id && (!d.bonus || streak >= 3));

  app.innerHTML = `
    <section class="screen results" data-screen="results">
      ${headerHTML(esc(dayLabel(day)))}
      <div class="res-label mono">${ok ? ICONS.check : ICONS.x}<span>[ Verification ${ok ? 'passed' : 'failed'} ]</span>${mode === 'practice' ? '<span>[ Practice | Not counted ]</span>' : ''}</div>
      <h1 class="verdict-big${ok ? ' ink' : ''}" aria-label="${esc(verdict.name)}">${wordLines(verdict.name)}</h1>
      <div class="score-row"><span class="score-big" data-score>${total}</span><span class="score-of">/ ${ROUND_LEN * 100}</span></div>
      <p class="verdict-line-res mono">${esc(verdict.line)}</p>
      <figure class="spec-fig">${specimensFigure(answers)}</figure>
      ${badges.length ? `<div class="badges">${badges.map((b) => `
        <div class="badge"><span class="e" aria-hidden="true">${BADGES[b].emoji}</span><span class="n">${BADGES[b].name}</span><span class="d mono">${esc(BADGE_DETAIL[b](answers))}</span></div>`).join('')}</div>` : ''}
      <div class="guilt" aria-live="polite">
        <div class="mono">Streak ${pad2(streak)}</div>
        <div class="dots" aria-label="typing"><i></i><i></i><i></i></div>
      </div>
      <div class="res-actions">
        <button class="pill" type="button" data-share>Share specimens ${ICONS.arrow}</button>
        <div class="countdown mono" data-countdown></div>
      </div>
      <details class="review">
        <summary class="bracket">[ review answers ]</summary>
        <ol>${answers.map((a, i) => `
          <li>${specimenSVG(a.tier, 20)}<span class="a">${a.input ? esc(a.input) : 'No answer'}</span><span class="mono">+${a.points}</span>
          <span class="q mono">${pad2(i + 1)} | ${esc(TIERS[a.tier].name)} | AI: ${esc(casual(prompts[i].aiAnswer))}</span></li>`).join('')}</ol>
      </details>
      <div class="res-more">
        ${mode === 'demo' ? `<button class="bracket" type="button" data-again>[ play day ${pad2(day.id)} again ]</button>` : ''}
        ${practiceDays.map((d) => `<a class="bracket" href="?day=${d.id}">[ practice day ${pad2(d.id)}${d.bonus ? ' | bonus' : ''} ]</a>`).join('')}
        ${mode === 'practice' ? `<a class="bracket" href="./">[ today's round ]</a>` : ''}
      </div>
      <p class="footer-line mono">No humans were involved in this verification.</p>
    </section>`;

  const $ = (s) => app.querySelector(s);
  const verdictEl = $('.verdict-big');
  const scoreEl = $('[data-score]');
  const guilt = $('.guilt');
  const shareBtn = $('[data-share]');
  const size = fitText(verdictEl, 56, 30);

  startCountdown($('[data-countdown]'), (t) => `[ Next verification in ${t} | Day ${pad2(nextDay.id)}: ${nextDay.title} ]`);

  // Share: copy the text block, morph into "Copied".
  shareBtn.addEventListener('click', async () => {
    sound.click();
    const done = await copyText(share);
    shareBtn.innerHTML = done ? `Copied ${ICONS.check}` : 'Copy failed';
    if (!reduced()) gsap.fromTo(shareBtn, { scale: 0.96 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
    setTimeout(() => { if (shareBtn.isConnected) shareBtn.innerHTML = `Share specimens ${ICONS.arrow}`; }, 1500);
  });
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
    .to(counter, { n: total, duration: 0.8, ease: 'power1.out', onUpdate: () => (scoreEl.textContent = Math.round(counter.n)) }, 0.2)
    .from(app.querySelectorAll('.spec-drop'), { y: -26, opacity: 0, duration: 0.35, stagger: 0.08, ease: 'back.out(2.5)' }, 0.55)
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
  const model = bank.aiModel ? `${esc(bank.aiModel)}, ${esc(bank.aiGeneratedOn || '')}` : 'not yet recorded. The answers in this build are drafts';
  app.innerHTML = `
    <section class="screen prose" data-screen="about">
      ${headerHTML('About')}
      <div class="vlabel"><span class="plus" aria-hidden="true">+</span><span class="lbl">&lt;about&gt;</span><span class="plus" aria-hidden="true">+</span></div>
      <h1 class="prose-title">About notarobot</h1>
      <p>notarobot is a daily CAPTCHA you can't quite pass. Each day you answer seven open prompts, and a machine decides how human each answer is by how unlike an AI it is.</p>
      <p>Before you answer, an AI has already sealed its own answer. Match it and you score nothing. Otherwise, the fewer people who gave your answer, the more points it earns, up to 100 a prompt and 700 a round. Early percentages come from a seeded sample of 100 answers per prompt, written by the team, plus the answers given on this device. The AI's answers were generated once and stored; the game never calls a model while you play.</p>
      <p>Made for CCT431 at the University of Toronto Mississauga. The prompts draw on the course readings listed below.</p>
      <p class="note mono">Model used for the sealed answers: ${model}.</p>
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
