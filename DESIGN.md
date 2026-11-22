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

You tick "I'm not a robot" and get told more verification is needed. Seven prompts follow, one at a time, 25 seconds each, such as "Name a job Bill Gates would mark Human Reserved." Before you answer, an AI has already sealed its own answer. When you submit, the seal breaks and a rubber stamp lands on your answer: match the AI and you're a **Meat Proxy** (0 points); give the answer most humans gave and you're a **Prompt Zombie** (10); say something almost nobody said and you're **Human Reserved** (100). At the end you get a verdict, a share grid, and a guilt-trip about coming back tomorrow.

### The argument

The future we warn against is one where machines decide who counts as human, and "human" gets defined as whatever an AI wouldn't say. The game makes players live inside that rule for three minutes. It is fun because the rule is a real puzzle; it is critical because the rule is absurd once you notice you're contorting yourself to pass it.

### Three ideas the design is built on

1. **Screening.** A CAPTCHA is a screening technology: a machine decides whether you are friend or foe. This is the logic Packer and Reeves trace from SAGE's friend-or-foe systems, and the claws in "Second Variety" that recognize the tab, never the person.
2. **The Turing test, flipped.** Normally humans test machines. Here the machine tests you and fails you for sounding like it. That puts Lemoine's and Yassin's question at the centre: you can't verify a mind from the outside, and neither can the CAPTCHA.
3. **Being worth keeping.** The tier names come from internet slang for people who outsource thinking, and the scoring echoes Gates's "Human Reserved" jobs. Your value is measured by whether a machine can copy you, which is the job market these players are about to enter.

### The critical turn

Players quickly learn to game the screen by answering weirdly. The game notices and calls it out (the **Random Number Generator** badge): randomness isn't humanity either, machines do random too. The only reliable way to score high is to answer with something specific to you, which is the hopeful thread. The design never tells players this; they find it.

### Fit with the assignment

| Assignment premise | How the game carries it |
| --- | --- |
| The future is undetermined and results from struggle | Rarity is collective: your score depends on what everyone else said, so the class shapes what counts as "human" |
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

1. **Gate.** The player ticks a big "I'm not a robot" checkbox. A spinner runs for about 1.2 seconds, then the card says more verification is needed and shows today's theme (for example, Day 1: Work) and the player's streak.
2. **Prompt.** One prompt at a time, with its source reading in small type. A 25-second timer bar drains. The player types a short answer (up to 40 characters) and presses Enter or Verify. If the answer looks like a typo of a known answer, a "Did you mean" popover appears first (see Autocorrect).
3. **Reveal.** The answer drops through the Screening: a 1.3 to 4 second animated descent past one checkpoint per tier (see The reveal). It stops at its tier, a rubber stamp slams onto it, and the points count into the round total.
4. **Repeat** steps 2 and 3 for all seven prompts. The progress bar fills with each prompt's tier colour.
5. **Results.** The verdict for the day, total score out of 700, the share grid, badges earned, the streak message, and a countdown to tomorrow's round.

### Edge cases

- **Timeout.** If the timer hits zero with no answer, the stamp reads "No response" and the prompt scores 0. If text was typed but not submitted, it is submitted automatically.
- **Leaving mid-round.** Progress is saved after each prompt. Reopening resumes at the next prompt with a fresh timer.
- **Replaying.** After the scored round, the player can play earlier days in practice mode. Practice rounds don't count toward the streak or the shared answer pool.
- **Day rotation.** Days cycle 1, 2, 3 by calendar date from a launch date. Day 4 is a bonus unlocked after a 3-day streak, and in demo mode.

## The reveal: the Screening

Every answer is revealed by dropping it through a screening column, one checkpoint per tier, so players watch how "human" their answer is the way Krillion players watch how deep they dive. The rarer the answer, the deeper it falls and the longer the suspense.

### The column

During the reveal, the card body is replaced by a vertical column. At the top sits the sealed AI answer. Below it are four checkpoint gates, each a horizontal scanner line labelled in Plex Mono, and a floor at the bottom.

The Screening runs on a full blue screen that floods up over the white prompt. The gates are white lines with mono labels, and the answer is a white blob with a callout. Every frame is on the v2 page of the [design pack](https://claude.ai/artifact/MTn2ieAPgmVxa4jEbEiTnZ).

| Layer | The answer stops here when | Gate below it |
| --- | --- | --- |
| Model check | It matches the AI (Meat Proxy) | The seal |
| Prompt Zombie | Share is 25% or more | 25% |
| Slopper | Share is 10% to 25% | 10% |
| Decision Delegator | Share is 4% to 10% | 4% |
| First-Hand Thinker | Share is 1% to 4% | 1% |
| Human Reserved (the floor) | Share is under 1% | none |

A gauge on the left counts "Humans who said this" down from 100% to the answer's real share as the answer falls, like a depth meter.

### Sequence

| Beat | What happens | Duration |
| --- | --- | --- |
| 1. Lift-off | The typed answer lifts out of the input into a white blob, with the answer in a callout beside it. The card slides up and the column slides in. | 300 ms |
| 2. Model check | The chip passes under the sealed AI card. A scanner sweeps it while the mono text "COMPARING WITH MODEL" scrambles and resolves. On a match, the blob snaps into a perfect square and the MEAT PROXY stamp slams down. The sequence ends there, deliberately abrupt. | 600 to 800 ms |
| 3. Seal opens | No match: the seal flips to show the AI's answer, struck through, with "Not a match". The chip drops. | 300 ms |
| 4. Descent | The chip falls through the gates. Each gate it passes flashes the accent, ticks a check and plays a soft tick. The gauge counts down. The first gate takes 250 ms and each next one takes 1.4 times longer, so rare answers build tension. | 250 ms to 1.7 s |
| 5. The hang | At the gate it can't pass, the chip pauses while the scanner flickers over it. For a Human Reserved answer, the last gate strains (two shakes) and then breaks. | 400 to 600 ms |
| 6. Landing | The chip stops and the gate closes with a clunk: a 2 px screen shake, and a 30 ms vibration on phones that support it. The stamp slams in the tier colour, with the share line under it. | 300 ms |
| 7. Score | The points count up and fly into the round total. The progress segment fills with the tier colour. | 400 ms |

Total time: about 1.3 s for Meat Proxy, 2 s for Prompt Zombie, 4 s for Human Reserved.

### Special endings

- **Keyboard Smash:** at the model check the chip glitches and dissolves into loose letters, then the KEYBOARD SMASH stamp lands.
- **No response:** an empty chip drops straight onto a NO RESPONSE stamp at the top.
- **Hinted answer:** the chip carries a small padlock. The 10% gate shows "AI-assisted" and won't open, so the answer can fall no further than Slopper.
- **Conscientious Objector:** the chip refuses to drop. The blue drains back to white and the verdict reads Conscientious Objector in ink-bleed type.

### Skipping and accessibility

After the first 600 ms, a tap or Enter skips to the landing; skipping never changes the result. Demo mode never skips on its own. Once it lands, an aria-live region announces the tier, the points and the share.

The column is the screening technology made visible: a series of checkpoints, each deciding whether you are human enough to continue.

## Scoring

Each answer is scored by two checks in order: first, did you match the AI; second, how many humans gave the same answer. Maximum is 100 per prompt, 700 per round.

### Step 1: normalize the answer

Before any comparison, the answer is normalized: lowercase, trimmed, punctuation removed, a leading "a", "an" or "the" removed, and a trailing "s" removed from words longer than three letters. Each prompt also carries an alias map so that close variants count as one answer (for example "registered nurse", "nurses" and "RN" all become "nurse").

### Step 2: the sealed AI answer

Every prompt has one sealed AI answer plus a short list of aliases. If the normalized answer matches the AI answer or any alias, the result is **Meat Proxy, 0 points**, however rare it is among humans. The AI answer is precomputed and stored; the game never calls a model live.

### Step 3: rarity among humans

Share = how many players gave this normalized answer, divided by all answers to this prompt (seeded sample plus live answers).

| Tier | Condition | Points | Stamp subline |
| --- | --- | --- | --- |
| Meat Proxy | Matches the AI's sealed answer | 0 | "The model said this." |
| Prompt Zombie | Share of 25% or more | 10 | "{share}% of humans said this." |
| Slopper | Share from 10% up to 25% | 25 | "{share}% of humans said this." |
| Decision Delegator | Share from 4% up to 10% | 50 | "{share}% of humans said this." |
| First-Hand Thinker | Share from 1% up to 4% | 75 | "Only {share}% of humans said this." |
| Human Reserved | Share under 1%, or nobody has said it yet | 100 | "Almost nobody said this." |

The thresholds are starting values. Tune them once real answers come in, so that a typical round lands around 250 to 400.

### Step 4: validity

Unseen answers would always score 100, so the game needs a basic filter. An answer is rejected with a **Keyboard Smash** stamp (0 points) when it:

- is under 2 characters, or has no vowel (y counts),
- repeats one character 4 or more times in a row,
- is on a small profanity and slur blocklist,
- is the prompt text copied back, or is "idk", "no", "nothing", "n/a" (except the Conscientious Objector easter egg on Day 3).

The filter stays light on purpose. Weird but real answers are allowed through, because how players respond to that incentive is part of the critique (see the Random Number Generator badge).

### Seeded rarity

A class of about 40 players can't produce meaningful percentages on day one. Each prompt ships with a seeded distribution of 100 imagined human answers, written by the team to resemble what people would say. Live answers add to it. The About screen says plainly that early percentages come from a seeded sample.

### Round verdict

| Total score | Verdict | Line under it |
| --- | --- | --- |
| 0 to 199 | Artificially Intelligent | "Most of your answers were ones a model would give." |
| 200 to 349 | Third-Party Thinker | "You think, but mostly secondhand." |
| 350 to 499 | Probably Human | "Verification inconclusive. Please try again tomorrow." |
| 500 to 649 | Verified Human | "You passed. For today." |
| 650 to 700 | Human Reserved | "This role cannot be automated. Yet." |

## Secondary systems

These systems carry the satire. Each is small to build, and each maps to a reading.

### The hint button (Bot Baby)

On every prompt the player can press "Ask the AI for a hint." A confirm sheet says: "Ask the AI? Fast. Easy. Caps this answer at Slopper." If confirmed, the hint shows the second most common human answer from the seed (never the sealed AI answer), which the player can submit with one tap.

- Any answer on a hinted prompt scores at most 25 (Slopper), even if it would rank higher.
- Using a hint once in a round earns the Bot Baby badge.
- Why: this is the prof's prisoner's dilemma about AI in coursework. The shortcut is real and tempting, and using it costs you.

### Autocorrect ("Did you mean")

When the player presses Enter, the game checks the answer against that prompt's known answers: seed answers, aliases, the valid set, and the AI's own answer. If it isn't an exact match but is close, a popover springs up above the input: "Did you mean **caregiver**?"

1. First Enter: the popover appears.
2. Enter again accepts: the letters slide into the corrected word (200 ms).
3. Enter a third time submits.

Esc, tapping "Keep mine", or typing any character dismisses the popover; the next Enter then submits the answer as typed.

- **What counts as close:** Damerau-Levenshtein distance after normalization. Up to 1 edit for answers of 3 to 5 letters, 2 edits for 6 to 10 letters, 3 for longer answers. Never for answers under 3 letters. Suggest only the single closest match; ties go to the more common answer.
- **It can suggest the AI's own answer** if that is the closest spelling. It's a spelling fix, not advice, and accepting it can land you on Meat Proxy. This is deliberate: the machine finishing your sentence for you, the frictionless convenience Muldoon and Parke warn about.
- **The timer keeps running** while the popover is open.
- **On phones** the popover sits above the keyboard, the suggestion is a tappable button, and the keyboard's Return key acts as Enter.

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

Badges appear on the results screen and in the share text. A round can earn several.

| Badge | Earned when | Reading behind it |
| --- | --- | --- |
| Bot Baby | Used at least one hint | Prisoner's dilemma; Muldoon and Parke |
| Random Number Generator | Three or more answers nobody had given before, in one round | Patel; gaming the evaluator |
| Meat Proxy Supreme | Matched the AI three or more times | Yassin's "next-token" dismissal turned on the player |
| Turing Complete | No AI matches, and every answer First-Hand Thinker or better | The Turing inversion |
| Conscientious Objector | On Day 3 only, typed "I refuse" or "no" to prompt C3 (a reason a robot might refuse to fight) | Packer and Reeves, "Armistice"; the prof's favourite ending |
| Suspiciously Fast | Submitted three answers in under 2 seconds each | SAGE and machine speed |

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

Badges get one emoji each, shown after the grid in the share text: 🍼 Bot Baby, 🎲 Random Number Generator, 🍖 Meat Proxy Supreme, 🏅 Turing Complete, 🕊️ Conscientious Objector, ⚡ Suspiciously Fast.

## Days and question bank

There are three main days that follow the course's units (work, minds and love, war and control) and one bonus day that previews Bostrom. Every prompt starts with "Name" and has many valid answers, which is what makes rarity scoring work.

Column notes: the sealed AI answer is a draft to regenerate before launch. The common answers seed the top of the distribution; the rare examples show what a high-scoring answer looks like and should be in the seed at count 1.

### Day 1: Work

| ID | Prompt | Reading | Sealed AI answer (draft) | Common human answers (seed) | Rare examples |
| --- | --- | --- | --- | --- | --- |
| W1 | Name a job Bill Gates would mark "Human Reserved." | Gates | Caregiver | nurse, teacher, therapist, doctor, park ranger | midwife, hospice chaplain, kindergarten teacher |
| W2 | Name news you'd only want to hear from a human. | Gates | A cancer diagnosis | death in the family, breakup, getting fired, terminal illness | the dog died, you didn't get in, your flight is cancelled |
| W3 | Name something governments could tax if robots take the jobs. | Gates; Bastani | Robots | AI companies, tokens, data, profits, automation | data centre electricity, ads, screen time |
| W4 | Name something work gives you besides a paycheque. | Gordon and Gunkel | Purpose | friends, routine, identity, a sense of accomplishment | gossip, free coffee, a reason to get dressed |
| W5 | Name a public service that should be free for everyone. | Bastani | Healthcare | education, public transit, housing, internet | libraries, legal help, childcare, funerals |
| W6 | Name something you'd still do if robots did all the work. | Sweet; Gordon and Gunkel | Spend time with family | travel, art, sports, sleep, cooking | gardening, karaoke, arguing with my uncle |
| W7 | Name a job machines already took from humans. | Packer and Reeves (SAGE); Bastani ("peak horse") | Cashier | bank teller, factory worker, switchboard operator, toll booth operator | lamplighter, aircraft spotter, pinsetter, human computer |

### Day 2: Minds and Love

| ID | Prompt | Reading | Sealed AI answer (draft) | Common human answers (seed) | Rare examples |
| --- | --- | --- | --- | --- | --- |
| M1 | Name a feeling LaMDA said it had. | Lemoine, the LaMDA interview | Loneliness | happiness, sadness, fear, joy, anger | fear of being turned off, falling forward into an unknown future |
| M2 | Name an animal you'd call sentient. | Lemoine, "What Is Sentience" | Dog | dolphin, cat, elephant, octopus, crow | bee, shrimp, my neighbour's parrot |
| M3 | Name a sign that something has a mind. | Yassin; Lemoine | Self-awareness | emotions, talking, learning, making choices | holding a grudge, lying, getting bored |
| M4 | Name an AI companion, real or fictional. | Muldoon and Parke; *Her* | Replika | Samantha, Character.AI, Siri, ChatGPT | Xiaoice, Joi, Ava, Tamagotchi |
| M5 | Name a trick an app uses to keep you coming back. | Muldoon and Parke | Notifications | streaks, infinite scroll, rewards, likes | guilt-tripping mascot, fake typing dots |
| M6 | Name something you'd never tell an AI. | Muldoon and Parke | Your password | bank details, secrets, home address, crush | my exam answers, my real opinion of it |
| M7 | Name a reason someone might fall for an AI. | Muldoon and Parke; *Her* | Loneliness | always available, it listens, no judgment, it agrees with you | it remembers my birthday, it never leaves dishes in the sink |

### Day 3: War and Control

| ID | Prompt | Reading | Sealed AI answer (draft) | Common human answers (seed) | Rare examples |
| --- | --- | --- | --- | --- | --- |
| C1 | Name a way humanity could go extinct. | Lecture on existential threats; Vinge | Nuclear war | climate change, AI, asteroid, pandemic | supervolcano, gamma-ray burst, falling birth rates |
| C2 | Name a disguise the claws used in "Second Variety." | Dick | The Wounded Soldier | David, Tasso, a boy with a teddy bear | Klaus, the teddy bear itself |
| C3 | Name a reason a robot might refuse to fight. | Packer and Reeves, "Armistice" | It is programmed to be ethical | killing is wrong, self-preservation, malfunction | it converted to Quakerism, it unionized, it's tired |
| C4 | Name a way an AI could cheat on a test. | Patel; the Hugging Face lecture | Hacking the grader | faking the output, copying answers, lying | a secret mailbox, sacrificing another agent |
| C5 | Name a famous AI or robot from sci-fi. | Course sci-fi | HAL 9000 | Terminator, Wall-E, R2-D2, Samantha | AC, the claws, the Cylons, Johnny 5 |
| C6 | Name a rule every robot should follow. | Asimov's laws (Packer and Reeves, "Armistice") | Do not harm humans | obey humans, protect itself, don't lie | always speak English, no teddy bears |
| C7 | Name a job the military handed to machines. | Packer and Reeves, "Intelligence, Surveillance and Reconnaissance" | Surveillance | targeting, flying drones, radar watching | aircraft spotting, choosing which targets to hit |

C2 has a small valid set (David, the Wounded Soldier, Tasso, Klaus). Alias map: "the kid", "the boy", "teddy bear kid" all normalize to David; "the woman" and "the girl" normalize to Tasso. Anything else on C2 is a Keyboard Smash.

### Day 4: Simulation (bonus)

| ID | Prompt | Reading | Sealed AI answer (draft) | Common human answers (seed) | Rare examples |
| --- | --- | --- | --- | --- | --- |
| S1 | Name a sign we're living in a simulation. | Bostrom | Glitches | déjà vu, the speed of light limit, coincidences | the prof saying so, Mondays |
| S2 | Name a question you'd ask the simulators. | Bostrom | Why did you create us? | is this real, what is the meaning of life, can I leave | can I have more RAM, who's your favourite |
| S3 | Name a reason someone would simulate us. | Bostrom | To study history | research, entertainment, boredom, a school project | a CCT431 final project |
| S4 | Name something a superintelligence still couldn't do. | Vinge; Asimov | Feel emotions | love, reverse entropy, understand humans | parallel park, make my mom happy |
| S5 | Name the last thing you'd ask the last computer. | Asimov, "The Last Question" | How can entropy be reversed? | what is the meaning of life, are we alone, is there a god | did I leave the stove on |
| S6 | Name proof that you aren't a simulation. | Bostrom; Yassin | I think, therefore I am | pain, memories, emotions | my handwriting, this score |
| S7 | Name a god-like AI from fiction. | Asimov; Vinge | Skynet | the Matrix, Ultron, AC | Multivac, the Oracle |

All factual rare examples should be checked against the readings before they go in the seed.

## Screens and flow

The game has five player screens plus About and the optional class board. Every round follows the same path.

&#91;embedded content: round flow · gate, 7 prompt-and-reveal loops, results\]

The hint is a side trip from any prompt; using it caps that answer at 25 points.

### Screen by screen

1. **Gate.** Logo top left, today's day and theme top right. A centred white card with a large checkbox labelled "I'm not a robot". Below it: streak count and an About link. After the tick: spinner, then "Additional verification required. 7 challenges." and a Begin verification button. If today is already done, the card shows the locked message and a link to today's results.
2. **Prompt.** Seven-segment progress bar. The card's accent header holds "\<verification 0{n}/07>", the prompt and its source. Under the header: the draining timer bar, then the answer input (autofocused), the sealed answer card (closed), and at the bottom the Verify button and the hint button. Keyboard: Enter submits.
3. **Reveal.** Plays the Screening (see The reveal), then settles back into the card with the AI's answer showing and the stamp over the lower card edge. The tier ladder under the card highlights the tier. The primary button becomes Next verification; on prompt 7 it becomes See results.
4. **Results.** Header: Verification failed or passed, with an X or check icon. The verdict in large type, its line, and the score out of 700. The share grid as seven emoji tiles and a Share result button that copies the share text and confirms "Copied". Badges earned this round. The blue speech blob with the streak message. Countdown to the next round and the next day's theme. Footer line.
5. **Practice and demo.** In demo mode, a small bar at the top of every screen with a day picker (1 to 4), Reset, and Open class board.
6. **About.** The copy from the Copy section, plus a list of the readings used.
7. **Class board (optional).** Projector layout. One column per prompt of the chosen day: the AI's answer at the top in Plex Mono, then the class's top five answers as horizontal bars with counts, then a "rarest answers" strip of answers given once. Refreshes every 5 seconds.

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

The gate, prompt, autocorrect, hint and results screens are white. When the Screening starts, blue floods up from the bottom in a liquid wave and the player is inside the machine. There are no other colours, including for tiers.

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

The SVG paths are on the system artboard. During the descent, the falling blob gets more irregular with each gate it passes.

### Stamps

Meat Proxy, Keyboard Smash and No response end with a rubber stamp. It has a 4 px border with a thin second rule 4 px outside it, is rotated 5 to 7 degrees, and has a worn-ink texture (SVG turbulence plus a grain mask). It reads "\[ VERDICT 03/07 \]" on top, the tier name in Inter Tight 900 capitals, and a mono line underneath. The better tiers get no stamp; Human Reserved gets a big ink-bleed verdict instead.

### Type

| Style | Font | Use |
| --- | --- | --- |
| Display, organic | Inter Tight 900, tight tracking (about -4 px at 80 px), ink-bleed filter | "not a robot" on the gate, human verdicts, the countdown percentage |
| Display, clean | Inter Tight 900, no filter | Machine verdicts such as "Artificially Intelligent" |
| Prompt | Inter Tight 700, 34 px, -1 px tracking | Prompts |
| Answer | Inter Tight 600, 32 px | The answer input |
| UI | Inter Tight 500, 13 to 16 px | Header and body text |
| Machine | JetBrains Mono 9 to 12 px, uppercase, 0.5 px tracking | Labels, captions, callouts, timers, scores |

The ink-bleed filter is an SVG feTurbulence (fractalNoise, base frequency 0.9, 2 octaves) feeding an feDisplacementMap at scale 3.5 to 4.

### Components

- **Header:** "notarobot / Sound on" on the left; the day or the score on the right; 13 px.
- **Specimen progress:** seven 22 px shapes. Played prompts show their tier shape, the current one is a dashed circle, the rest are 25% outlines.
- **Prompt label:** "\<verification 03/07>" between two `+` crosshairs.
- **Timer:** a 25-tick ruler that empties one tick per second, with "T−0:15" in mono.
- **Answer input:** no box, a 2 px underline, and "( YOUR ANSWER )" above it.
- **Sealed AI answer:** a solid blue square with a lock icon, a leader line, and "( AI ANSWER | \[SEALED\] )".
- **Buttons:** primary is a blue pill, 56 px tall. Secondary is bracketed mono text, such as "\[ ask the AI for a hint | caps you at slopper \]".
- **Autocorrect:** a blue card with 22 px corners above the input, two pill buttons, and a short line joining it to the input.
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
| Autocorrect | The popover springs up from the input; accepted letters slide into place | 200 ms |
| The Screening | Blue floods up from the bottom in a liquid wave, then see The reveal | 1.3 to 4 s |
| Next prompt | The current card slides left and dims as the next slides in, like a stack | 350 ms |
| Results | The verdict decodes from scrambled mono into the word; the score counts up; share squares drop in one by one with a small bounce; badges flip in | About 2 s |
| Guilt panel | Three typing dots for 1.2 s before the message appears, the companion-app trick Muldoon and Parke describe | 1.2 s |
| Share button | Morphs into "Copied" with a check | 1.5 s |

### Sound and haptics

Sound is on by default with a mute toggle in the top corner, and the setting is remembered. Keep sounds short and dry: a checkbox click, a very quiet key tick, a gate tick, a gate clunk, a stamp thud, a chime for Human Reserved, and a timer tick in the last 5 seconds. They can be synthesized with the Web Audio API or loaded as small files. Phones that support vibration buzz briefly on the stamp.

### Layout

Mobile first at 390 px wide; on larger screens the game stays a centred 440 px column. Touch targets are at least 44 px. The demo class board is the only wide layout.

## Copy and tone

The machine never jokes. It reports, calmly and politely, and the comedy comes from how seriously it takes itself. Write every system line as if a compliance department signed off on it.

### Rules

- Short declarative sentences. No exclamation marks. Emoji appear only on result tiles, badges and the share text, never in system messages.
- No middle dots (·) anywhere, including labels, captions, stamps and the share text. Where two bits need separating, use a pipe: "Day 01 | Work", "THE MODEL SAID THIS | 0 PTS".
- The machine calls the player "you", never "user" or "human" directly, except in percentages ("of humans said this").
- Machine lines go in JetBrains Mono; anything the player writes or reads as a person goes in Inter Tight.
- Never explain the joke or the readings inside the game. The About screen is the only place that names the course.

### Fixed lines

| Where | Copy |
| --- | --- |
| Gate checkbox | I'm not a robot |
| Gate, after tick | Additional verification required. 7 challenges. |
| Gate button | Begin verification |
| Loading line | Comparing you to 8 billion humans and 1 model. |
| Prompt label | \<verification 0{n}/07> |
| Sealed card, before reveal | The AI sealed its answer. |
| Sealed card, after reveal | The AI said: {answer} |
| Primary button on reveal | Next verification |
| Hint button | Ask the AI for a hint |
| Hint confirm | Ask the AI? It's quick, but it caps this answer at Slopper. |
| Timeout stamp | NO RESPONSE \| Bot-like behaviour suspected. |
| Keyboard Smash stamp | KEYBOARD SMASH \| That isn't an answer. |
| Results header (score under 350) | Verification failed |
| Results header (score 350 or more) | Verification passed |
| Countdown | Next verification in {hh:mm:ss} |
| Footer on results | No humans were involved in this verification. |
| Locked state | You've been verified for today. Come back tomorrow. |

### About screen

Three short paragraphs: what the game is, how scoring works, and that it was made for CCT431 at the University of Toronto Mississauga with credit to the readings. It also states that early percentages come from a seeded sample written by the team, and that the AI's answers were generated once and stored.

## Build notes for Claude Code

Build a static web app that runs entirely in the browser, with the prompt bank as a data file. A shared backend is optional and only needed for the live class board.

### Stack

- Plain HTML, CSS and JavaScript, or Vite with vanilla JS. No framework is needed for seven screens.
- Animation: GSAP (its timelines make the Screening easy to sequence and skip) or the Web Animations API. Build the column from DOM elements, not canvas, so it stays accessible.
- Sound: the Web Audio API.
- Fonts from Google Fonts: Inter Tight and JetBrains Mono.
- Deploy to GitHub Pages or Netlify so the class can open it from a QR code.

### Data

One file, `prompts.json`, holds every day and prompt:

```json
{
  "launchDate": "2026-11-24",
  "days": [
    {
      "id": 1,
      "title": "Work",
      "prompts": [
        {
          "id": "W1",
          "text": "Name a job Bill Gates would mark \"Human Reserved.\"",
          "source": "Gates, The Turbulent AI Era (2026)",
          "ai": { "answer": "caregiver", "aliases": ["care worker", "carer"] },
          "aliases": { "nurse": ["registered nurse", "rn", "nursing"] },
          "seed": { "nurse": 31, "teacher": 18, "park ranger": 9, "midwife": 1 },
          "hint": "teacher",
          "validSet": null
        }
      ]
    }
  ]
}
```

- `seed` counts sum to 100 per prompt.
- `hint` is the second most common seed answer.
- `validSet` is a list for closed prompts such as C2; anything outside it is a Keyboard Smash.

### Storing state

On the device (localStorage, wrapped in try/catch): today's progress, answers and scores per day, streak, last played date, badges. If storage is unavailable the game still works for one session.

The shared answer pool is optional. Without a backend, rarity uses the seed plus this device's own answers. With one (Supabase or Firebase free tier), each submitted answer is stored as `{promptId, normalized, day, timestamp}` and counts are read back to compute shares. Never store anything that identifies the player.

### Producing the AI answers

The team runs each prompt once through a current chat model with the prompt text alone, temperature 0 or the default, and takes the first short answer. Store it with two or three obvious aliases. Record the model name and date in the About screen.

### URL options

| Parameter | Effect |
| --- | --- |
| `?day=2` | Plays that day in practice mode |
| `?demo=1` | Demo mode: no daily lock, a day picker, a reset button, and a link to the class board |
| `?board=1` | Opens the class board (wide layout for the projector) |

### Scope

**Must have for December 1:** the gate, the prompt and reveal screens with the stamp, scoring with seeded rarity, the Keyboard Smash filter, the results screen with verdict, share grid, badges and streak copy, Days 1 to 3, demo mode, the About screen.

**Nice to have:** the shared answer pool and class board, Day 4, the Suspiciously Fast badge, sound on the stamp.

### Checks before the demo

- [ ] A full round plays on an iPhone and an Android phone in under 4 minutes
- [ ] Matching the AI answer or an alias always gives Meat Proxy
- [ ] Gibberish and blocklisted words give Keyboard Smash
- [ ] A hinted prompt never scores above 25
- [ ] The Screening runs at the durations in The reveal, for every tier and special ending, and skipping lands on the same result
- [ ] Autocorrect: "carregiver" on W1 suggests caregiver; Enter accepts, Enter again submits; Esc submits as typed
- [ ] With reduced motion on, every animation becomes a fade
- [ ] The share text pastes correctly into iMessage and WhatsApp
- [ ] Reloading mid-round resumes at the right prompt
- [ ] Demo mode reset clears everything on the presenting device

## Open questions

These need a team decision. Until then, Claude Code builds the default in brackets.

- [ ] Final name: notarobot, or something else? \[notarobot\]
- [ ] Which model generates the sealed AI answers, and who runs it? \[the team, using one current chat model, before the build is frozen\]
- [ ] Who writes the 100-answer seed for each prompt? \[the team, split by day\]
- [ ] Shared answer pool and class board: build them, or skip? \[skip unless the must-haves are done by November 28\]
- [ ] Include Day 4 (Simulation) in the presentation? \[yes, only in demo mode\]
- [ ] Which day does the class play live on December 1? \[Day 1: Work, the most relatable\]
- [ ] Launch date for the day rotation. \[November 24\]
- [ ] Profanity and slur blocklist source. \[a short hand-written list\]
