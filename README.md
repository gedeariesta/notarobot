# notarobot

A daily CAPTCHA you can't quite pass. CCT431 final project. The rules are in [DESIGN.md](DESIGN.md). The look is a lab specimen sheet in two colours: people are porous particle scans, machines are grids, and mono labels hang off both.

Play it at **https://gedeariesta.github.io/notarobot/**. The QR code for the class is in [qr/](qr/), as a PNG and an SVG.

## Run it

```bash
npm install
npm start      # http://localhost:5173
npm test       # scoring, lookups, the answer lists, day rotation and copy checks
```

Opening `index.html` straight from disk won't work, because the game fetches `prompts.json`. It's a static site. GitHub Pages serves it from the `main` branch, so pushing to `main` updates the live game within a minute or two.

## The question bank

Every prompt has a list of correct answers. Anything not on the list bounces, and each answer's tier comes from how often AI models gave it in 300 runs (DESIGN.md, Scoring).

- `bank/day1-work.json` to `bank/day4-simulation.json` are the source. Each prompt lists the sealed AI answer (`ai`), the other answers the AI gave with their run counts (`runs`), the team's Human Reserved picks (`reserved`), every other correct answer (`list`), spellings (`aliases`), answers from the reading (`reading`) and review notes.
- **The run counts are simulated.** They are a judgement of what current chat models answer, not real runs. Before launch, run each prompt 100 times on three models, paste the real counts into `runs`, and rebuild.
- `node scripts/build-bank.mjs` checks the bank (runs sum to 300, the sealed answer is the most common, no two answers read the same after normalization) and writes `prompts.json` and [bank/QUESTION_BANK.md](bank/QUESTION_BANK.md), a review sheet for the team.
- Answers that aren't on the list bounce. A near miss gets "Did you mean": either a spelling fix, or a related answer ("nuclear" suggests "nuclear war"), preferring what the AI said most. Keyboard Smash is only for runs along a keyboard row, answers with no vowel, and one letter repeated four times.

## URL options

| URL | Effect |
| --- | --- |
| `?day=2` | Practice that day (not counted toward the streak) |
| `?day=4` | The bonus day, once you have a 3-day streak |
| `?demo=1` | Demo mode: no daily lock, day picker D1 to D4, Reset, and a Log of bounced answers |
| `?demo=1&day=3` | Demo mode on Day 3 |
| `?board=1` | Class board placeholder (not built) |

## Files

- `src/scoring.js`: normalization, list lookups (plurals and "my"/"the" variants included), "Did you mean" (spelling and related answers), the Keyboard Smash rule, tiers, verdicts, badges and the share text. Pure code; the tests and the build script run it too.
- `src/specimen.js`: the particle scans. Hundreds to thousands of particles splat a density field in WebGL, which a second pass thresholds into one porous silhouette. A `Figure` moves the same particles between shapes, driven by GSAP.
- `src/figures.js`: the drawings the scans are sampled from (the subject's bust, the hand, brain, claw and globe for Days 1 to 4).
- `src/plate.js`: a figure plus its annotations (callouts on leader lines, crosshairs, FIG caption).
- `src/reveal.js`: the Screening, one GSAP timeline so it can be skipped. The water darkens with every gate; past 1/300 the screen glitches on what it can't classify.
- `src/main.js`: the screens and the flow. `src/days.js` handles day rotation and streaks, `src/state.js` localStorage, `src/sound.js` Web Audio.
- `src/shapes.js`: the tier shapes from the design pack.
- `dev/specimens.html`: the specimen sheet, every figure as drawn and as scanned. Not linked from the game.
- `vendor/`: GSAP 3.13 and its MorphSVG plugin, free under GSAP's standard no-charge license.

Fonts are Inter Tight and JetBrains Mono from Google Fonts. Two colours, #1F3CFF and white, with two exceptions: red #FF3B30 for the last five seconds of the timer, and the Screening's water, which darkens from #1F3CFF toward #030A3B as answers sink.
