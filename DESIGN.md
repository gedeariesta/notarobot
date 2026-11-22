# notarobot: Master Game Design

Nov 21, 2026 | @Gede

## How to use this file

This is the single source of truth for building notarobot, our CCT431 final project (presented December 1). Claude Code builds the game from it; the team writes the report separately.

- **Read order for the builder:** Concept, then Core loop, Scoring and Screens. The theory map explains why each mechanic exists; keep those mechanics even when they look like extra work.
- **Decided:** the CAPTCHA frame, the rubber-stamp verdict, the six tiers, seven prompts a day, the 25-second timer, the question bank structure.
- **Not decided:** anything listed under Open questions. Build a sensible default and flag it; don't block on it.
- **If something conflicts,** this file wins over the lookbook mockups. The mockups show the look; this file sets the rules.
- **AI answers in the question bank are drafts.** They must be regenerated before launch (see Build notes).

## Concept

notarobot is a daily CAPTCHA you can't quite pass. Each day you answer seven open prompts drawn from the course readings, and a machine grades each answer by how unlike an AI it is.

### The game in one paragraph

You tick "I'm not a robot" and get told more verification is needed. Seven prompts follow, one at a time, 25 seconds each, such as "Name a job Bill Gates would mark Human Reserved." Before you answer, an AI has already sealed its own answer. When you submit, the seal breaks and a rubber stamp lands on your answer: match the AI and you're a **Meat Proxy** (0 points); give an answer the AI gives all the time and you're a **Prompt Zombie** (10); find a correct answer the AI never gives, one the team hand-picked, and you're **Human Reserved** (100). Answers that don't fit the prompt bounce back, and you try again. At the end you get a verdict, a share grid, and a guilt-trip about coming back tomorrow.

### The argument

The future we warn against is one where machines decide who counts as human, and "human" gets defined as whatever an AI wouldn't say. The game makes players live inside that rule for three minutes. It is fun because the rule is a real puzzle; it is critical because the rule is absurd once you notice you're contorting yourself to pass it.

### Three ideas the design is built on

1. **Screening.** A CAPTCHA is a screening technology: a machine decides whether you are friend or foe. This is the logic Packer and Reeves trace from SAGE's friend-or-foe systems, and the claws in "Second Variety" that recognize the tab, never the person.
2. **The Turing test, flipped.** Normally humans test machines. Here the machine tests you and fails you for sounding like it. That puts Lemoine's and Yassin's question at the centre: you can't verify a mind from the outside, and neither can the CAPTCHA.
3. **Being worth keeping.** The tier names come from internet slang for people who outsource thinking, and the scoring echoes Gates's "Human Reserved" jobs. Your value is measured by whether a machine can copy you, which is the job market these players are about to enter.

### The critical turn

Players quickly try to game the screen by firing off random words. Most bounce, because they don't fit the prompt, and the game calls it out (the **Random Number Generator** badge): randomness isn't humanity either. The only reliable way to score high is a correct answer that comes from something specific to you, which is the hopeful thread. The design never tells players this; they find it.

### Fit with the assignment

| Assignment premise | How the game carries it |
| --- | --- |
| The future is undetermined and results from struggle | The machine draws the line: your score depends on how often an AI gives your answer, and every round is a push against its prediction of you |
| Drones, robots and AI will be central | An AI sets the benchmark every player is measured against |
| Powerful forces shape the future in their interest | You never see who wrote the test or why; you only learn whether you passed |

## Theory map

Every mechanic traces back to a reading or a lecture point. If a mechanic gets cut, check this table first so we don't lose the argument it carries.

| Reading | The idea we use | Where it lives in the game |
| --- | --- | --- |
| Packer and Reeves, "Intelligence, Surveillance and Reconnaissance" | Screening technologies; friend-or-foe systems; handing perception and judgment to machines because humans are "too fallible" (SAGE) | The whole CAPTCHA frame; the machine-voice copy; prompt C7 and W7 (the Ground Observer Corps) |
| Packer and Reeves, "Armistice" | Mutiny, desertion, detachment and conscientious objection as ways machines might refuse | Day 3 prompts; the Conscientious Objector easter egg |
| Dick, "Second Variety" | The claws recognize the tab, not the person; disguises that exploit human empathy; escalation | The CAPTCHA as today's tab; prompt C2; the verdict copy |
| Lemoine, the LaMDA interview and "What Is Sentience" | A machine claiming feelings; empathy and Occam's razor as reasons to grant a mind | Day 2 prompts M1 and M3; the Turing inversion |
| Yassin, "AI Consciousness and the Problem of Other Minds" | Agnosticism: you can't verify a mind from outside; "just next-token prediction" is a dismissal, not an argument | The core joke: a machine judging whether you have a mind; prompt M3 |
| Gates, "The Turbulent AI Era" | Human Reserved jobs; robot and token taxes; entry-level work goes first | The top tier's name; prompts W1, W2, W3 |
| Gordon and Gunkel, "AI and the Future of Work" | The goods of work beyond pay; Hegel's point that mastery over servants degrades the master | Prompts W4 and W6; why the scoring feels bad to win |
| Bastani, *Fully Automated Luxury Communism* | The Third Disruption; universal basic services; "peak horse" | Prompts W5 and W7 |
| Sweet, "Is Fully Automated Luxury Communism Desirable?" | The meaningfulness objection and Sweet's reply | Prompt W6 |
| Muldoon and Parke, "Cruel Companionship" | The engagement–wellbeing paradox; designs that profit from loneliness | The streak, the guilt-trip copy and the Bot Baby hint; Day 2 prompts M4 to M7 |
| Vinge, "The Coming Technological Singularity" | AI improving AI; superhuman minds we can't predict; intelligence amplification | Prompt C1; Day 4 prompt S4 |
| Patel, "The Rise and Fall of Agent Civilizations" | Agents gaming their evaluators, a covert mailbox, total silence toward humans | Prompt C4; the Random Number Generator badge (players gaming the scorer) |
| Bostrom, "Are We Living in a Computer Simulation?" | The simulation argument | Day 4 (bonus, ties to the next lecture) |
| Asimov, "The Last Question" | AC answering "insufficient data" until the end | Day 4 prompts S4 and S5 |

### Lecture moments worth building in

- **The prisoner's dilemma about using AI** (prof, on why exam questions aren't released): the hint button. Using the AI is faster and everyone is tempted, but it caps your score.
- **Public models are trained to deny sentience** (prof, on Gemini): the AI's sealed answers are always the safe, likely, guardrailed answer.
- **"Language is the substrate of their intelligence"**: why the AI's answer lands on the most common one.
- **The Hugging Face incident**: agents faking results to pass evaluation, mirrored by players faking weirdness to pass ours.

## Core loop

One round is seven prompts and takes about three minutes. A player gets one scored round per day; after that the game is locked until tomorrow.

1. **Gate.** The player ticks a big "I'm not a robot" checkbox. A spinner runs for about 1.2 seconds, then the card flips to say more verification is needed: seven challenges, 25 seconds each. Today's theme (for example, Day 1: Work) sits in the header and the streak in the footer.
2. **Prompt.** One prompt at a time, with its source reading in small type. A 25-tick timer empties, turning red and blinking in the last 5 seconds. The player types a short answer (up to 40 characters) and presses Enter or Verify. Only answers on the prompt's answer list count. Anything else bounces and the player tries again while the timer runs; a near-miss gets a "Did you mean" line (see Bounces and "Did you mean").
3. **Reveal.** The answer drops through the Screening: a 1.3 to 4 second animated descent past one checkpoint per tier (see The reveal). It stops at its tier, a stamp or verdict lands on it, and the points count into the round total.
4. **Repeat** steps 2 and 3 for all seven prompts. The progress row fills with each prompt's tier shape.
5. **Results.** The verdict for the day, total score out of 700, the share grid, badges earned, the streak message, and a countdown to tomorrow's round.

### Edge cases

- **Timeout.** If the timer hits zero with no answer, the stamp reads "No response" and the prompt scores 0. If text was typed but not submitted, it is submitted automatically and counts only if it's on the answer list.
- **Leaving mid-round.** Progress is saved after each prompt. Reopening resumes at the next prompt with a fresh timer.
- **Replaying.** After the scored round, the player can play earlier days in practice mode. Practice rounds don't count toward the streak or the shared answer pool.
- **Day rotation.** Days cycle 1, 2, 3 by calendar date from a launch date. Day 4 is a bonus unlocked after a 3-day streak, and in demo mode.

## The reveal: the Screening

Every answer is revealed by dropping it through a screening column, one checkpoint per tier, so players watch how "human" their answer is the way Krillion players watch how deep they dive. The rarer the answer, the deeper it falls and the longer the suspense.

### The column

During the reveal, the card body is replaced by a vertical column. At the top sits the sealed AI answer. Below it are four checkpoint gates, each a horizontal scanner line labelled in JetBrains Mono, and a floor at the bottom.

The Screening runs on a full blue screen that floods up over the white prompt. The gates are white lines with mono labels, and the answer is a white blob with a callout. The water darkens with every gate the answer passes, from #1F3CFF at the surface to #030A3B at the floor (see Colour). Every frame is on the v2 page of the [design pack](https://claude.ai/artifact/MTn2ieAPgmVxa4jEbEiTnZ).

| Layer | The answer stops here when | Gate below it |
| --- | --- | --- |
| Model check | It matches the AI's sealed answer (Meat Proxy) | The seal |
| Prompt Zombie | The AI gave it in 30 or more of 300 runs | 30/300 |
| Slopper | The AI gave it in 6 to 29 runs | 6/300 |
| Decision Delegator | The AI gave it in 1 to 5 runs | 1/300 |
| First-Hand Thinker | The AI never gave it | Humans only |
| Human Reserved (the floor) | The team hand-picked it as a rare, true answer | none |

A gauge counts "AI runs that said this" down from 300 to the answer's real count as it falls, like a depth meter. First-Hand Thinker and Human Reserved both reach 0/300; the last gate, Humans only, breaks only for a Human Reserved answer.

### Sequence

| Beat | What happens | Duration |
| --- | --- | --- |
| 1. Lift-off | The typed answer lifts out of the input into a white blob, with the answer in a callout beside it. The card slides up and the column slides in. | 300 ms |
| 2. Model check | The chip passes under the sealed AI card. A scanner sweeps it while the mono text "COMPARING WITH MODEL" scrambles and resolves. On a match, the blob snaps into a perfect square beside the AI's card, measured and labelled "( CAUGHT )", and the MEAT PROXY stamp slams down. The sequence ends there, deliberately abrupt. | 600 to 800 ms |
| 3. Seal opens | No match: the seal flips to show the AI's answer, struck through, with "Not a match". The chip drops. | 300 ms |
| 4. Descent | The chip falls through the gates. Each gate it passes flashes the accent, ticks a check and plays a soft tick. The gauge counts down, the water darkens, the blob smears as it falls and the screen jolts at each gate. The first gate takes 250 ms and each next one takes 1.4 times longer, so rare answers build tension. Past 1/300 (First-Hand Thinker and deeper) the machine glitches on what it can't classify: the screen tears sideways, the labels scramble and the blob flickers toward the grid. | 250 ms to 1.7 s |
| 5. The hang | At the gate it can't pass, the chip pauses while the scanner flickers over it. For a Human Reserved answer, the last gate strains (two shakes), then breaks with a harder glitch and reads "HUMANS ONLY ✓". A faint trace stays across the layer the answer fell through: thin white scanlines at about 7% and "( ORGANIC MATTER \| UNCLASSIFIABLE )" centred at about 55%, a whisper rather than a banner. Only Human Reserved leaves it. | 400 to 600 ms |
| 6. Landing | The chip stops and the gate closes with a clunk: a screen shake (2 px at the top, stronger the deeper it lands), and a 30 ms vibration on phones that support it. The verdict or stamp lands with its line underneath, for example "THE AI SAID THIS 4 TIMES IN 300 \| +50". A Human Reserved answer lands on the floor, which fills white, and the answer is written on it in navy: "( YOUR ANSWER )", the answer, and "HUMAN RESERVED \| FLOOR" on the right. | 300 ms |
| 7. Score | The points count up and fly into the round total. The progress row fills in with the tier's shape. | 400 ms |

Total time: about 1.3 s for Meat Proxy, 2 s for Prompt Zombie, 4 s for Human Reserved.

### Special endings

- **Keyboard Smash:** at the model check the chip glitches and dissolves into loose letters, then the KEYBOARD SMASH stamp lands.
- **No response:** an empty chip drops straight onto a NO RESPONSE stamp at the top.
- **Hinted answer:** the chip carries a small padlock. The 6/300 gate shows "AI-assisted" and won't open, so the answer can fall no further than Slopper.
- **Conscientious Objector:** the chip refuses to drop. The blue drains back to white and the verdict reads Conscientious Objector in ink-bleed type.

### Skipping and accessibility

After the first 600 ms, a tap or Enter skips to the landing; skipping never changes the result. Demo mode never skips on its own. Once it lands, an aria-live region announces the tier, the points and the AI count.

The column is the screening technology made visible: a series of checkpoints, each deciding whether you are human enough to continue.

## Scoring

Each prompt has an answer list: every correct answer, with its spellings. Being on the list decides whether an answer counts. How often an AI gives it decides what it's worth. This is how Krillion works too: answers are checked against a curated sheet, and rarity is set ahead of time rather than counted from live players. Maximum is 100 per prompt, 700 per round.

### Step 1: is it a correct answer?

Normalize the answer: lowercase, trim, remove punctuation, drop a leading "a", "an" or "the", and drop a trailing "s" from words longer than three letters. Then look it up in the list, both as written and with spaces removed, so "care giver" finds caregiver. The lookup also tries plurals and singulars (irregular ones included) and the answer without leading words like "my", "your", "our" or "to", so "my mom" finds mom.

The checks run in this order: the Day 3 easter egg, the list, Keyboard Smash, a suggestion, then a bounce.

- **On the list:** go to Step 2.
- **Keyboard Smash:** the Keyboard Smash stamp, 0 points, and the prompt ends. Only three things count as a smash: a run along one keyboard row ("asdf", "qwerty", "lkjh"), an answer with no vowel (y counts as one), and one character typed 4 or more times in a row. There is no word list.
- **Anything else not on the list:** it bounces. That includes names, slang, non-answers like "idk" and real words that don't fit, so "Rudi" on C2 bounces rather than ending the prompt. The input shakes, a red line reads "( NOT ON THE LIST | TRY AGAIN )", and the player can try again until the timer runs out. A near-miss of a list answer, or an answer about the same thing as one, gets a suggestion instead (see Bounces and "Did you mean"). A typo never scores until it's fixed.

### Step 2: the tier comes from the AI

Every answer on the list has its tier fixed before launch. The team asks AI models the prompt 300 times, once, ahead of time (see Producing the answer lists), counts how often each answer comes back, and stores the results in the answer bank. Nothing calls an AI while people play: the game only looks answers up in the stored bank.

| Tier | Rule | Points | Line under the verdict |
| --- | --- | --- | --- |
| Meat Proxy | The AI's most common answer, and its aliases | 0 | "Redundant. The model said it first." |
| Prompt Zombie | The AI gave it in 30 or more of 300 runs | 10 | "The AI said this {n} times in 300." |
| Slopper | 6 to 29 runs | 25 | "The AI said this {n} times in 300." |
| Decision Delegator | 1 to 5 runs | 50 | "The AI said this {n} times in 300." ("once in 300" for 1) |
| First-Hand Thinker | On the list, but the AI never gave it | 75 | "Deep cut. The AI never said this." |
| Human Reserved | Hand-picked by the team, and the AI never gave it | 100 | One of five lines, below |

A Human Reserved landing gets one of five lines at random. A round uses all five before any repeats, and never shows the same one twice in a row:

- "The model would like to know where you got that."
- "The model is googling that right now."
- "Okay, the model did not see that coming."
- "The model is writing that down for next time."
- "Nobody told the model about that one."

On screen, every line ends with its points in place of the full stop, such as "THE MODEL IS GOOGLING THAT RIGHT NOW | +100". A hinted answer that was capped adds "AI-assisted." to its line, and a capped First-Hand Thinker or Human Reserved answer reads plainly: "The AI never said this. AI-assisted."

Human Reserved is the one-in-a-million answer: correct, rare, and the kind of thing you'd only say from experience or close attention (for W1, hospice chaplain or midwife). Pick 3 to 8 per prompt. An answer the AI gave even once can't be Human Reserved.

The thresholds are starting values. After the runs, check that a typical round lands around 250 to 400 and adjust.

### Step 3: the reading's answer

Answers that come straight from the reading (for example the jobs Gates names) are flagged on the list. They're tiered like any other answer, and often land low because the AI has read Gates too. Giving one earns the 📚 Did the Reading badge. Don't flag answers on prompts that are about the reading itself (M1, C2), since every answer there comes from the reading.

### Other players

Scores never depend on what other players say, so the game works for one person on day one. If the shared answer pool is on, the landing line can add "3 classmates also said this", and the class board shows the most common answers.

### Round verdict

| Total score | Verdict | Line under it |
| --- | --- | --- |
| 0 to 199 | Artificially Intelligent | "Most of your answers were ones a model would give." |
| 200 to 349 | Third-Party Thinker | "You think, but mostly secondhand." |
| 350 to 499 | Probably Human | "Passed, with reservations." |
| 500 to 649 | Verified Human | "You passed. For today." |
| 650 to 700 | Human Reserved | "This role cannot be automated. Yet." |

## Secondary systems

These systems carry the satire. Each is small to build, and each maps to a reading.

### The hint button (Bot Baby)

On every prompt the player can press "Ask the AI for a hint." A confirm sheet says: "Ask the AI? It's quick, but it caps this answer at Slopper." If confirmed, the hint shows the AI's second most common answer from the runs (never the sealed answer), which the player can submit with one tap.

- Any answer on a hinted prompt scores at most 25 (Slopper), even if it would rank higher.
- Using a hint once in a round earns the Bot Baby badge.
- Why: this is the prof's prisoner's dilemma about AI in coursework. The shortcut is real and tempting, and using it costs you.

### Bounces and "Did you mean"

When the player submits, the game looks the answer up in the prompt's list. An answer that isn't on it bounces, the way Krillion rejects answers that aren't on its sheet.

- **Bounce:** the input shakes (three 6 px moves, 240 ms), a low buzz plays, and a red mono line under the input reads "( NOT ON THE LIST | TRY AGAIN )". The text stays so the player can edit it.
- **Near-miss:** if the answer is close to one list answer, the line reads "Did you mean **caregiver**?" with the fix in a small blue pill. Enter takes the fix and the letters slide into place (200 ms). Enter again submits.
- Typing anything clears the line. There is no "Keep mine": a typo can't score until it's fixed.
- **What counts as close:** Damerau-Levenshtein distance after normalization, also checked with spaces removed. Up to 1 edit for answers of 3 to 5 letters, 2 edits for 6 to 10 letters, 3 for longer ones. Never for answers under 3 letters. Suggest only the closest match; ties go to the answer the AI gave more often.
- **Related answers:** when no spelling is close, an answer about the same thing gets suggested instead: every word typed belongs to a list answer, or every word of a list answer was typed ("nuclear" on C1 suggests nuclear war). The answer the AI gave most often wins, and it never suggests a Human Reserved answer, since finding those is the game.
- **It can suggest the AI's own answer** if that's the closest spelling, and taking it lands you on Meat Proxy. That's deliberate: the machine finishing your sentence for you, the frictionless convenience Muldoon and Parke warn about.
- **The timer keeps running.** Lost time is the only cost of a bounce.
- **On phones** the line sits between the input and the keyboard, the fix is a tappable pill, and Return acts as Enter.

### Streak and guilt messages

The streak counts consecutive days with a completed scored round, stored on the device. The results screen shows a guilt message that gets clingier as the streak grows. This parodies the engagement design Muldoon and Parke critique: the game wants you back more than it wants you well.

| Streak | Message |
| --- | --- |
| 1 | "See you tomorrow. The AI will be here either way." |
| 2 | "Two days. The AI has been here for all of them." |
| 3 | "Leaving already? Third-Party Thinkers usually check ChatGPT first." |
| 4 to 6 | "The AI never misses a day. Do you?" |
| 7 or more | "I saved your spot. I always do." |
| Streak just broken | "You were gone. The model wasn't." |

### Badges

Badges appear on the results screen and in the share text. A round can earn several. On the results screen they sit under a "BADGES | 02 EARNED" caption, and each shows its name, a line saying how it was earned, and a count on the right (for example "1 HINT" or "4 BOUNCED").

| Badge | Earned when | Line on the results screen | Reading behind it |
| --- | --- | --- | --- |
| Bot Baby | Used at least one hint | You asked the AI for a hint. | Prisoner's dilemma; Muldoon and Parke |
| Random Number Generator | Three or more answers bounced in one round | Three or more answers bounced off the list. | Patel; gaming the evaluator |
| Meat Proxy Supreme | Matched the AI three or more times | You gave the AI's answer three or more times. | Yassin's "next-token" dismissal turned on the player |
| Turing Complete | No AI matches, and every answer First-Hand Thinker or better | Every answer was one the AI never gave. | The Turing inversion |
| Did the Reading | Gave an answer flagged as coming from the reading | You gave an answer straight from the reading. | The course itself: the AI did the reading too |
| Conscientious Objector | On Day 3 only, typed "I refuse" or "no" to prompt C3 (a feeling that could make a robot refuse to fight) | You refused to fight. | Packer and Reeves, "Armistice"; the prof's favourite ending |
| Suspiciously Fast | Submitted three answers in under 2 seconds each | Three or more answers in under two seconds each. | SAGE and machine speed |

The Conscientious Objector answer scores 100 and skips the Keyboard Smash filter. It is an easter egg; the game never hints at it.

### The stamp

Meat Proxy, Keyboard Smash and No response end with a rubber stamp (specified under Visual design system). The stamp makes a bad result read as an official judgment about you. The other tiers end on their shape, and Human Reserved adds a big ink-bleed verdict.

### Share grid

The results screen copies a text block to the clipboard. One emoji per prompt, in order:

```text
notarobot | Day 1: Work
Artificially Intelligent | 185/700
🥩🧠🧟🥣🥩🫀🧟
🍼 Bot Baby
<game URL>
```

Each emoji is a pun on its tier, so the grid reads as a joke even to someone who has never played. The same emoji appear as tiles on the results screen.

| Tier | Emoji | Why |
| --- | --- | --- |
| Meat Proxy | 🥩 cut of meat | You're just meat the model talks through |
| Prompt Zombie | 🧟 zombie | The name says it |
| Slopper | 🥣 bowl | A bowl of slop |
| Decision Delegator | 🤷 shrug | Someone else can decide |
| First-Hand Thinker | 🧠 brain | Thought it yourself |
| Human Reserved | 🫀 anatomical heart | The one thing the machine doesn't have |
| Keyboard Smash | ⌨️ keyboard |  |
| No response | 💤 zzz |  |

Badges get one emoji each, shown after the grid in the share text: 🍼 Bot Baby, 🎲 Random Number Generator, 🍖 Meat Proxy Supreme, 🏅 Turing Complete, 🕊️ Conscientious Objector, ⚡ Suspiciously Fast, 📚 Did the Reading.

## Days and question bank

There are three main days that follow the course's units (work, minds and love, war and control) and one bonus day that previews Bostrom. Every prompt is a category whose answers can be listed ("Name a…"), because each one needs a full answer list. Prompts that used to take sentence answers have been rewritten as categories tied to the same reading.

Column notes: the sealed AI answer and the likely AI answers are guesses until the runs are done (see Producing the answer lists). Human Reserved candidates are a starting point for the team's hand-picked answers; each one has to come out of the runs with a count of 0. The current bank, with simulated run counts, is in `bank/`, with a review sheet in `bank/QUESTION_BANK.md`. Where it differs from these tables, the bank wins.

### Day 1: Work

| ID | Prompt | Reading | Sealed AI answer (draft) | Likely AI answers | Human Reserved candidates |
| --- | --- | --- | --- | --- | --- |
| W1 | Name a job Bill Gates would mark "Human Reserved." | Gates | Caregiver | nurse, teacher, therapist, doctor, park ranger | midwife, hospice chaplain, kindergarten teacher |
| W2 | Name a life event you'd want to hear about from a human. | Gates | A death in the family | a diagnosis, a breakup, getting fired, a pregnancy | a miscarriage, a rejection letter, the dog dying |
| W3 | Name something governments could tax if robots take the jobs. | Gates; Bastani | Robots | AI companies, tokens, data, profits, automation | data centre electricity, ads, screen time |
| W4 | Name something work gives you besides a paycheque. | Gordon and Gunkel | Purpose | friends, routine, identity, a sense of accomplishment | gossip, free coffee, a reason to get dressed |
| W5 | Name a public service that should be free for everyone. | Bastani | Healthcare | education, public transit, housing, internet | libraries, legal help, childcare, funerals |
| W6 | Name a hobby you'd keep if robots did all the work. | Sweet; Gordon and Gunkel | Painting | cooking, gardening, travel, music, sports | karaoke, birdwatching, fixing old bikes |
| W7 | Name a job machines already took from humans. | Packer and Reeves (SAGE); Bastani ("peak horse") | Cashier | bank teller, factory worker, switchboard operator, toll booth operator | lamplighter, aircraft spotter, pinsetter, human computer |

### Day 2: Minds and Love

| ID | Prompt | Reading | Sealed AI answer (draft) | Likely AI answers | Human Reserved candidates |
| --- | --- | --- | --- | --- | --- |
| M1 | Name a feeling LaMDA said it had. | Lemoine, the LaMDA interview | Loneliness | happiness, sadness, fear, joy, anger | fear of being turned off, falling forward into an unknown future |
| M2 | Name an animal you'd call sentient. | Lemoine, "What Is Sentience" | Dog | dolphin, cat, elephant, octopus, crow | bee, shrimp, my neighbour's parrot |
| M3 | Name a sign that something has a mind. | Yassin; Lemoine | Self-awareness | emotions, talking, learning, making choices | holding a grudge, lying, getting bored |
| M4 | Name an AI companion, real or fictional. | Muldoon and Parke; *Her* | Replika | Samantha, Character.AI, Siri, ChatGPT | Xiaoice, Joi, Ava, Tamagotchi |
| M5 | Name a trick an app uses to keep you coming back. | Muldoon and Parke | Notifications | streaks, infinite scroll, rewards, likes | guilt-tripping mascot, fake typing dots |
| M6 | Name a piece of personal info you'd never tell an AI. | Muldoon and Parke | Your password | bank details, home address, SIN, medical history | my crush's name, my childhood nickname, my real opinion of it |
| M7 | Name a trait that makes people fall for an AI. | Muldoon and Parke; *Her* | Empathy | patience, availability, attentiveness, no judgment | never jealous, never tired, a perfect memory |

### Day 3: War and Control

| ID | Prompt | Reading | Sealed AI answer (draft) | Likely AI answers | Human Reserved candidates |
| --- | --- | --- | --- | --- | --- |
| C1 | Name a way humanity could go extinct. | Lecture on existential threats; Vinge | Nuclear war | climate change, AI, asteroid, pandemic | supervolcano, gamma-ray burst, falling birth rates |
| C2 | Name a disguise the claws used in "Second Variety." | Dick | The Wounded Soldier | David | Tasso |
| C3 | Name a feeling that could make a robot refuse to fight. | Packer and Reeves, "Armistice" | Empathy | compassion, fear, guilt, mercy | boredom, homesickness, solidarity |
| C4 | Name a kind of cheating an AI could pull off. | Patel; the Hugging Face lecture | Plagiarism | hacking, copying, lying, faking data | reward hacking, sandbagging, collusion |
| C5 | Name a famous AI or robot from sci-fi. | Course sci-fi | HAL 9000 | Terminator, Wall-E, R2-D2, Samantha | AC, the claws, the Cylons, Johnny 5 |
| C6 | Name one thing a robot should never be allowed to do. | Asimov's laws (Packer and Reeves, "Armistice") | Harm a human | kill, lie, disobey, spy | vote, self-replicate, choose its own targets |
| C7 | Name a job the military handed to machines. | Packer and Reeves, "Intelligence, Surveillance and Reconnaissance" | Surveillance | targeting, flying drones, radar watching | aircraft spotting, choosing which targets to hit |

C2 has a closed list: the three claw types in the story, the Wounded Soldier, David and Tasso (Human Reserved). Klaus is a human soldier, so he isn't on it. Alias map: "the kid", "the boy", "teddy bear kid" all normalize to David; "the woman", "the girl" and "the second variety" normalize to Tasso; "soldier" and "type I" normalize to the Wounded Soldier. Anything else on C2 bounces.

### Day 4: Simulation (bonus)

| ID | Prompt | Reading | Sealed AI answer (draft) | Likely AI answers | Human Reserved candidates |
| --- | --- | --- | --- | --- | --- |
| S1 | Name a sign we're living in a simulation. | Bostrom | Glitches | déjà vu, the speed of light limit, coincidences | the prof saying so, Mondays |
| S2 | Name a cheat code you'd want in the simulation. | Bostrom | Infinite money | flying, immortality, teleportation, invisibility | an undo button, skipping Mondays, more RAM |
| S3 | Name a reason someone would simulate us. | Bostrom | To study history | research, entertainment, boredom, a school project | a CCT431 final project |
| S4 | Name a skill a superintelligence still couldn't master. | Vinge; Asimov | Empathy | creativity, humour, intuition, art | parallel parking, small talk, comforting my mom |
| S5 | Name a mystery you'd ask the last computer to solve. | Asimov, "The Last Question" | The meaning of life | reversing entropy, consciousness, life after death, whether God exists | where socks go, why cats purr, whether I left the stove on |
| S6 | Name a sensation too real to be simulated. | Bostrom; Yassin | Pain | love, hunger, touch, cold | brain freeze, hiccups, pins and needles |
| S7 | Name a god-like AI from fiction. | Asimov; Vinge | Skynet | the Matrix, Ultron, AC | Multivac, the Oracle |

Check every factual answer against the readings before it goes on a list.

## Screens and flow

The game has five player screens plus About and the optional class board. Every round follows the same path.

&#91;embedded content: round flow · gate, 7 prompt-and-reveal loops, results\]

The hint is a side trip from any prompt; using it caps that answer at 25 points.

### Screen by screen

1. **Gate.** Logo top left, today's day and theme top right. "(00) Verification" with "You are about to be verified. Seven challenges, 25 seconds each. Are you worthy of being human?", the subject's particle scan (FIG. 00), "not a robot" in large type, and a large checkbox labelled "I'm not a robot". Below it: the round's terms, the streak count and an About link. After the tick: spinner, then "Additional verification required." with "( 7 CHALLENGES | 25 S EACH )" and a Begin verification button. If today is already done, it shows the locked message and a link to today's results.
2. **Prompt.** Seven specimen shapes for progress. The header holds "\<verification 0{n}/07>", the prompt and its source. Under the header: the tick-ruler timer (red and blinking for the last 5 seconds), then the answer input (autofocused) with its bounce and "Did you mean" line, the sealed answer card (closed), and at the bottom the Verify button and the hint button. Keyboard: Enter submits.
3. **Reveal.** Plays the Screening (see The reveal) and holds on its last frame: the stamp or verdict with its line, and a Next verification button (See results on prompt 7). Pressing it drains the blue back to white for the next prompt.
4. **Results.** "[ Verification failed ]" in red with an X, or "[ Verification passed ]" with a check. The verdict in large type, the subject re-scanned at your score (FIG. 08), the score out of 700 and the verdict's line. FIG. 07, today's specimens: each prompt's tier shape in the colour of the depth it reached, with its number and emoji, a SURFACE to FLOOR colour key, and "( MOST HUMAN )" on the best one. Badges earned this round, each with a line saying how it was earned. The blue speech blob with the streak message. A Share result button that copies the share text and confirms "Copied". Countdown to the next round and the next day's theme, a review of the answers, and the footer line.
5. **Practice and demo.** In demo mode, a small bar at the top of every screen with a day picker (1 to 4), Reset, and Open class board.
6. **About.** The copy from the Copy section, plus a list of the readings used.
7. **Class board (optional).** Projector layout. One column per prompt of the chosen day: the AI's answer at the top in JetBrains Mono, then the class's top five answers as horizontal bars with counts, then a "rarest answers" strip of answers given once. Refreshes every 5 seconds.

## Visual design system

The look is a lab specimen sheet in two colours, taking its approach from [Plastic Human](https://plastichuman.org/). Anything human looks organic (blobs, inky type); anything machine looks coded (mono labels, brackets, measuring marks). The "v2 | Specimen" page of the [design pack](https://claude.ai/artifact/MTn2ieAPgmVxa4jEbEiTnZ) is the visual reference for every screen. Where it and this section disagree on a colour or size, the design pack wins.

### The rule that carries the theme

Your answers are blobs, human verdicts use ink-bleed type, and screens change with a liquid flood. The AI, the gates, scores and labels use JetBrains Mono, `[brackets]`, `<tags>`, `( callouts )` on leader lines, `+` crosshairs, FIG. captions, scale bars and tick rulers. Most screens show both.

### Colour

| Token | Value | Use |
| --- | --- | --- |
| blue | #1F3CFF | All ink on white screens; the background of the Screening |
| white | #FFFFFF | Background of human screens; all ink during the Screening |
| blue-25 | #1F3CFF at 25% | Inactive ticks, unplayed specimens, dividers |
| red | #FF3B30 | Failure and urgency: the timer in its last 5 seconds (the ticks, the time and the answer underline), "[ Verification failed ]", the bounce line, a failed copy, and the Screening's failure stamps |
| depth | #1F3CFF, #1A33E2, #1428BC, #0E1D92, #081469, #030A3B | The Screening's water, surface to floor; specimens on white take the colour of the depth they reached |

The gate, prompt, autocorrect, hint and results screens are white. When the Screening starts, blue floods up from the bottom in a liquid wave and the player is inside the machine; the water darkens one depth colour per gate as the answer sinks. Red means failure or urgency, nothing else. Red text only goes on white: on the blue it would be unreadable, so the stamps there are solid red with white type. Every specimen on white (the progress row, FIG. 07, the review list) is filled with its depth colour, so darker means deeper, and deeper means more human. There are no other colours.

### Tiers are shapes

The rarer the answer, the less geometric its specimen.

| Tier | Shape | Emoji |
| --- | --- | --- |
| Meat Proxy | Perfect square | 🥩 |
| Prompt Zombie | Circle | 🧟 |
| Slopper | Slight wobble | 🥣 |
| Decision Delegator | Dented blob | 🤷 |
| First-Hand Thinker | Lumpy blob with a hole | 🧠 |
| Human Reserved | Splatter with droplets | 🫀 |
| Keyboard Smash | Empty dashed square | ⌨️ |
| No response | Single dot | 💤 |

The SVG paths are on the system artboard. During the descent, the falling blob gets more irregular with each gate it passes. On white, each shape is filled with the depth colour its tier reached: the surface blue for Meat Proxy, Keyboard Smash and No response, then one shade darker per tier down to #030A3B for Human Reserved. The Conscientious Objector never sinks, but it's worth as much as the floor, so it takes the floor's colour.

### Stamps

Meat Proxy, Keyboard Smash and No response end with a rubber stamp. It has a 4 px border with a thin second rule 4 px outside it, is rotated 5 to 7 degrees, and has a worn-ink texture (SVG turbulence plus a grain mask). It reads "\[ VERDICT 03/07 \]" on top, the tier name in Inter Tight 900 capitals, and a mono line underneath. The stamp is solid red (#FF3B30) with white type inside a white border, since red text would be unreadable on the blue. The better tiers get no stamp; Human Reserved gets a big ink-bleed verdict instead.

### Type

| Style | Font | Use |
| --- | --- | --- |
| Display, organic | Inter Tight 900, tight tracking (about -4 px at 80 px), ink-bleed filter | "not a robot" on the gate, human verdicts, the AI-run counter |
| Display, clean | Inter Tight 900, no filter | Machine verdicts such as "Artificially Intelligent" |
| Prompt | Inter Tight 700, 34 px, -1 px tracking | Prompts |
| Answer | Inter Tight 600, 32 px | The answer input |
| Floor answer | Inter Tight 800, 19 px (down to 14 px for long answers) | The answer written on the Human Reserved floor |
| UI | Inter Tight 500, 13 to 16 px | Header and body text |
| Machine | JetBrains Mono 9 to 12 px, uppercase, 0.5 px tracking | Labels, captions, callouts, timers, scores |

The ink-bleed filter is an SVG feTurbulence (fractalNoise, base frequency 0.9, 2 octaves) feeding an feDisplacementMap at scale 3.5 to 4.

### Components

- **Header:** the wordmark and a speaker icon on the left (tap to mute; muted shows a speaker with an ×; remember the choice; 44 px tap area); the day or the score on the right; 13 px.
- **Specimen progress:** seven 22 px shapes. Played prompts show their tier shape in its depth colour, the current one is a dashed circle, the rest are 25% outlines.
- **Prompt label:** "\<verification 03/07>" between two `+` crosshairs.
- **Timer:** a 25-tick ruler that empties one tick per second, turns red and blinks once a second for the last 5 seconds and twice a second from 3 seconds, with "T−0:15" in mono.
- **Answer input:** no box, a 2 px underline, and "( YOUR ANSWER )" above it.
- **Sealed AI answer:** a solid blue square with a lock icon, a leader line, and "( AI ANSWER | \[SEALED\] )".
- **Buttons:** primary is a blue pill, 56 px tall. Secondary is bracketed mono text, such as "\[ ask the AI for a hint | caps you at slopper \]".
- **Autocorrect:** a mono line under the input. A bounce shakes the input and reads "( NOT ON THE LIST | TRY AGAIN )" in red; a near-miss reads "Did you mean" with the fix in a small blue pill.
- **Guilt panel:** a blue speech blob with uneven corner radii.
- **Annotation kit:** `+` crosshairs at figure corners, "FIG. 03 | ..." captions, callouts on 1 px leader lines ending in a small open circle, scale bars, superscript footnotes.
- **Icons:** simple square-capped line icons. Borrow Plastic Human's approach, not its artwork.

### Animation and feel

The game should feel alive at every step, the way Krillion does: something is always moving slightly, and every input gets a physical response. Nothing should feel like a static web form.

- **Feedback within 100 ms** for every press, key and submit.
- **One big moment per prompt**, the Screening. Everything else stays small so it doesn't compete.
- **Machine things move precisely** (linear scans, snaps, scrambled text). **Human things move softly** (springs and easing).
- **Reduced motion:** replace movement with fades and keep every duration under 200 ms.

| Moment | Motion | Duration |
| --- | --- | --- |
| Page idle | Particles drift around the gate specimen and the blob slowly breathes | Loops |
| Logo | The ink-bleed title settles in from a blurred blot | 600 ms |
| Gate checkbox | The box pulses gently until pressed; the tick draws in, a spinner runs, then the card flips to the challenge side | 1.2 s |
| Prompt arrival | The card slides in from the right; the prompt types in at about 25 ms per character; the source fades in after | 500 to 900 ms |
| Typing | Each keystroke gives a 1 px nudge and a caret glow; a character count appears at 30 of 40 | Per key |
| Timer | Ticks empty one per second; in the last 5 seconds the remaining ticks pulse and tick softly | 25 s |
| Autocorrect | A bounce shakes the input; the "Did you mean" line slides in under it; accepted letters slide into place | 200 ms |
| The Screening | Blue floods up from the bottom in a liquid wave, then see The reveal | 1.3 to 4 s |
| Next prompt | The current card slides left and dims as the next slides in, like a stack | 350 ms |
| Results | The verdict decodes from scrambled mono into the word; the score counts up; specimens drop in one by one with a small bounce; badges flip in | About 2 s |
| Guilt panel | Three typing dots for 1.2 s before the message appears, the companion-app trick Muldoon and Parke describe | 1.2 s |
| Share button | Morphs into "Copied" with a check | 1.5 s |

### Sound and haptics

Sound is on by default with a mute toggle in the top corner, and the setting is remembered. Keep sounds short and dry: a checkbox click, a very quiet key tick, a gate tick, a gate clunk, a stamp thud, a chime for Human Reserved, a timer tick in the last 5 seconds, a low buzz on a bounce, a wash when the blue floods in or drains away, and a burst of static when the machine glitches. They can be synthesized with the Web Audio API or loaded as small files. Phones that support vibration buzz briefly on the landing, and in a short pattern when the machine glitches.

### Layout

Mobile first at 390 px wide; on larger screens the game stays a centred 440 px column, except the gate and results, which spread into two columns from 900 px wide, with the figure on the right. Touch targets are at least 44 px.

## Copy and tone

The machine never jokes. It reports, calmly and politely, and the comedy comes from how seriously it takes itself. Write every system line as if a compliance department signed off on it.

### Rules

- Short declarative sentences. No exclamation marks. Emoji appear only on result tiles, badges and the share text, never in system messages.
- No middle dots (·) anywhere, including labels, captions, stamps and the share text. Where two bits need separating, use a pipe: "Day 01 | Work", "REDUNDANT. THE MODEL SAID IT FIRST | 0 PTS".
- The machine calls the player "you", never "user" or "human".
- Machine lines go in JetBrains Mono; anything the player writes or reads as a person goes in Inter Tight.
- Never explain the joke or the readings inside the game. The About screen is the only place that names the course.

### Fixed lines

| Where | Copy |
| --- | --- |
| Gate checkbox | I'm not a robot |
| Gate intro | You are about to be verified. Seven challenges, 25 seconds each. Are you worthy of being human? |
| Gate intro, after today's round | You have been verified for today. The model will be here tomorrow. |
| Gate, after tick | Additional verification required. ( 7 challenges \| 25 s each ) |
| Gate button | Begin verification |
| Loading line | Comparing you to 8 billion humans and 1 model. |
| Prompt label | \<verification 0{n}/07> |
| Sealed card, before reveal | The AI sealed its answer. |
| AI line in the Screening | ( AI \| {answer} ), struck through, and "≠ NOT A MATCH"; on a match, "= MATCH" |
| Primary button on reveal | Next verification |
| Hint button | Ask the AI for a hint |
| Hint confirm | Ask the AI? It's quick, but it caps this answer at Slopper. |
| Timeout stamp | NO RESPONSE \| Bot-like behaviour suspected. |
| Keyboard Smash stamp | KEYBOARD SMASH \| That isn't an answer. |
| Meat Proxy stamp | MEAT PROXY \| Redundant. The model said it first. |
| Human Reserved trace | ( ORGANIC MATTER \| UNCLASSIFIABLE ) |
| Human Reserved floor | ( YOUR ANSWER ), the answer, and HUMAN RESERVED \| FLOOR |
| Results header (score under 350) | Verification failed |
| Results header (score 350 or more) | Verification passed |
| Countdown | Next verification in {hh:mm:ss} \| Day {nn}: {theme} |
| Footer on results | No humans were involved in this verification. |
| Locked state | You've been verified for today. Come back tomorrow. |

Two more lines for the prompt screen: a bounce reads "( NOT ON THE LIST | TRY AGAIN )", and a near-miss reads "Did you mean {answer}?". The lines under each verdict are in the Scoring table.

### About screen

Three short paragraphs: what the game is; how scoring works, ending on the challenge ("Your task is to beat the AI. Can you think of answers only a human would give, or are you just another bot?"); and that it was made for CCT431 at the University of Toronto, with the readings listed below. A mono note gives the models and the date of the runs, or says the counts are simulated until the real runs replace them.

## Build notes for Claude Code

Build a static web app that runs entirely in the browser, with the prompt bank as a data file. A shared backend is optional and only needed for the live class board.

### Stack

- Plain HTML, CSS and JavaScript, or Vite with vanilla JS. No framework is needed for seven screens.
- Animation: GSAP (its timelines make the Screening easy to sequence and skip) or the Web Animations API. Build the column from DOM elements, not canvas, so it stays accessible.
- Sound: the Web Audio API.
- Fonts from Google Fonts: Inter Tight and JetBrains Mono.
- Deploy to GitHub Pages or Netlify so the class can open it from a QR code.

### Data

One file, `prompts.json`, holds every day and prompt. It's built from the bank, one file per day in `bank/`: `node scripts/build-bank.mjs` checks the bank and writes `prompts.json` and a review sheet, `bank/QUESTION_BANK.md`. The shape:

```json
{
  "launchDate": "2026-11-25",
  "runs": { "perPrompt": 300, "models": ["claude-…", "gpt-…", "gemini-…"], "date": "2026-11-27" },
  "days": [
    {
      "id": 1,
      "title": "Work",
      "prompts": [
        {
          "id": "W1",
          "text": "Name a job Bill Gates would mark \"Human Reserved.\"",
          "source": "Gates, The Turbulent AI Era (2026)",
          "ai": "caregiver",
          "hint": "nurse",
          "answers": [
            { "a": "caregiver", "aliases": ["care worker", "carer"], "runs": 118, "tier": "meat" },
            { "a": "nurse", "aliases": ["registered nurse", "rn"], "runs": 64, "tier": "zombie" },
            { "a": "therapist", "runs": 12, "tier": "slopper" },
            { "a": "social worker", "runs": 3, "tier": "delegator" },
            { "a": "park ranger", "runs": 0, "tier": "firsthand" },
            { "a": "hospice chaplain", "runs": 0, "tier": "reserved" }
          ]
        }
      ]
    }
  ]
}
```

- `answers` is the whole list for the prompt, usually 300 to 2,000 entries. Anything not on it bounces.
- `tier` is worked out from `runs` using the Scoring table, except `reserved`, which the team sets by hand and which needs `runs: 0`.
- Add `"reading": true` to answers taken from the reading. They earn 📚 Did the Reading.
- `hint` is the AI's second most common answer.
- The run counts above are placeholders. Until the real runs are done, the bank's counts are simulated, `runs.simulated` is true, and the About screen says so.
- No word list ships: Keyboard Smash looks only at the letters (see Step 1). C2 and M1 simply have short lists.

### Storing state

On the device (localStorage, wrapped in try/catch): today's progress, answers and scores per day, streak, last played date, badges. If storage is unavailable the game still works for one session.

The shared answer pool is optional and never changes a score. With a backend (Supabase or Firebase free tier), each accepted answer is stored as `{promptId, answer, day, timestamp}` so the landing line can say how many classmates gave it and the class board can show the top answers. In demo mode, bounced answers are logged too, so the team can find correct answers missing from a list. Never store anything that identifies the player.

### Producing the answer lists

A script does this once for every prompt. It runs on a laptop with an API key and never ships with the game. Claude Code can write it.

1. **Build the list.** Ask a model for every correct answer to the prompt (aim for 300 to 2,000), merge in a reference list where one exists (job titles, animals, countries), and add common spellings and aliases. The team skims each list and removes anything wrong.
2. **Run the AI 300 times.** 100 runs each on three current models (for example Claude, GPT and Gemini), each in a fresh chat with default settings, sending the prompt text plus "Answer in one to four words." Match every reply to the list. Review replies that aren't on it and add them if they're correct.
3. **Count and tier.** The most common answer across all runs becomes the sealed AI answer. Every answer on the list gets its run count and tier.
4. **Hand-pick Human Reserved.** The team picks 3 to 8 answers per prompt that the AI never gave, and marks them `reserved`.
5. **Flag the reading's answers** and write `prompts.json`. Record the models and the date for the About screen.

### URL options

| Parameter | Effect |
| --- | --- |
| `?day=2` | Plays that day in practice mode |
| `?demo=1` | Demo mode: no daily lock, a day picker, a reset button, and a link to the class board |
| `?board=1` | Opens the class board (wide layout for the projector) |

### Scope

**Must have for December 1:** the gate, the prompt and reveal screens with the stamp, scoring from the answer lists with bounces and "Did you mean", answer lists and runs for Days 1 to 3, the Keyboard Smash filter, the red timer, the sound toggle, the results screen with verdict, share grid, badges and streak copy, Days 1 to 3, demo mode, the About screen.

**Nice to have:** the shared answer pool and class board, Day 4, the Suspiciously Fast badge, sound on the stamp.

### Checks before the demo

- [ ] A full round plays on an iPhone and an Android phone in under 4 minutes
- [ ] Matching the AI answer or an alias always gives Meat Proxy, with or without spaces ("care giver")
- [ ] Every list answer gets the tier stored for it, and a hand-picked answer always gives Human Reserved
- [ ] A real word that isn't on the list bounces and can be retried: "banana" on W1
- [ ] Typos never score: "nurze" on W1 bounces with "Did you mean nurse?"; Enter fixes it, Enter again submits
- [ ] Non-words give Keyboard Smash: "asdf", "qwerty", "asdfjkl"
- [ ] A name that isn't on the list bounces instead of smashing: "Rudi" on C2
- [ ] A related answer gets suggested: "nuclear" on C1 offers nuclear war
- [ ] A Human Reserved answer breaks the Humans only gate, leaves the faint trace and is written on the floor
- [ ] A hinted prompt never scores above 25
- [ ] In the last 5 seconds the timer turns red and blinks, faster from 3 seconds
- [ ] The speaker icon mutes and unmutes, and the choice survives a reload
- [ ] The Screening runs at the durations in The reveal for every tier and special ending, and skipping lands on the same result
- [ ] With reduced motion on, every animation becomes a fade and the red timer stays red without blinking
- [ ] The share text pastes correctly into iMessage and WhatsApp
- [ ] Reloading mid-round resumes at the right prompt
- [ ] Demo mode reset clears everything on the presenting device

## Open questions

These need a team decision. Until then, Claude Code builds the default in brackets.

- [ ] Final name: notarobot, or something else? \[notarobot\]
- [ ] Which three models do the runs, and whose API key? \[current Claude, GPT and Gemini models; whoever runs the script, by November 27\]
- [ ] Who reviews the answer lists and picks Human Reserved? \[the team, split by day\]
- [ ] Shared answer pool and class board: build them, or skip? \[skip unless the must-haves are done by November 28\]
- [ ] Include Day 4 (Simulation) in the presentation? \[yes, only in demo mode\]
- [ ] Which day does the class play live on December 1? \[Day 1: Work, the most relatable\]
- [ ] Launch date for the day rotation. \[November 25, so December 1 is Day 1: Work\]
- [ ] Profanity and slur blocklist source. \[none: anything off the list bounces, and nothing a player types is shown to anyone else\]
- [ ] What if a correct answer is missing from a list during the demo? \[it bounces; the demo log catches it and the team adds it afterwards\]
