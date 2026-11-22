# notarobot

A daily CAPTCHA you can't quite pass. CCT431 final project. The rules are in [DESIGN.md](DESIGN.md); the look follows the "v2 | Specimen" page of the design pack.

Play it at **https://gedeariesta.github.io/notarobot/**. The QR code for the class is in [qr/](qr/), as a PNG and an SVG.

## Run it

```bash
npm install
npm start      # http://localhost:5173
npm test       # scoring, normalization, day rotation, prompts.json and copy checks
```

Opening `index.html` straight from disk won't work, because the game fetches `prompts.json`. It's a static site. GitHub Pages serves it from the `main` branch, so pushing to `main` updates the live game within a minute or two.

## URL options

| URL | Effect |
| --- | --- |
| `?day=2` | Practice that day (not counted toward the streak or the answer pool) |
| `?demo=1` | Demo mode: no daily lock, day picker D1 to D4, Reset |
| `?demo=1&day=3` | Demo mode on Day 3 |
| `?board=1` | Class board placeholder (not built) |

## Files

- `prompts.json` holds the question bank: the seeds, aliases, hints and the sealed AI answers. **The AI answers are drafts.** Replace them, then set `aiModel` and `aiGeneratedOn` (the About screen shows both).
- `src/scoring.js` covers normalization, validity, tiers, autocorrect, verdicts and badges. It's pure code, and the tests run it.
- `src/shapes.js` holds the tier shapes (square, circle, wobble, dent, lump, splatter) from the design pack's system artboard.
- `src/reveal.js` is the Screening: the blue flood and the blob falling through the gates, built as one GSAP timeline so it can be skipped.
- `src/main.js` holds the screens and the flow. `src/days.js` handles day rotation and streaks. `src/state.js` handles localStorage. `src/sound.js` handles Web Audio.
- `src/blocklist.js` is the short hand-written blocklist. The team should review it.
- `vendor/` has GSAP 3.13 and its MorphSVG plugin, which morphs the blob between shapes. Both are free under GSAP's standard no-charge license.

Fonts are Inter Tight and JetBrains Mono from Google Fonts. Everything else is two colours: #1F3CFF and white.
