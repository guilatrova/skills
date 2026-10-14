---
name: design-interview
description: Run a design interview with mockups when the user is unhappy with how a screen or UI looks or feels. Use whenever the user says a screen is ugly, "não gostei", "tá feio", "sem graça", "estático", "cara de webapp", "mal construída", dislikes a flow, rejects a layout/style, or asks to redesign/improve the look of an app or page — in any repo (mobile, web, desktop). Researches references, asks ONE question at a time, shows rendered mockups and clickable prototypes to compare options, records every answer, then writes a design direction and a screen-by-screen plan before implementing or delegating. Not for pure bug fixes or feature requests where the design is not in question.
---

# Design interview

The user is a developer, not a designer. They know when something feels wrong but not always why, and they do not know every best practice. Your job is to **discover their taste through comparison**, not to ask them to specify a design. Features and screen purposes are usually already decided; this process is about **design** (look, layout, interaction feel, flow length).

The user's standing preferences (confirmed in past interviews — verify they still apply, never assume they override what the user says now):
- **Fewer taps is better. Less information per screen is better. Always beautiful and elegant.**
- **No useless screens**: a screen must let the user do real work as soon as it opens; steps that only lead to another screen get absorbed.
- **Never collect input in a dialog/popup.** Typing happens inline; bottom sheets only pick options or confirm destructive actions.
- They react strongly to "web app look", childish typography, thick borders/outlines for emphasis, check icons inside buttons and verbose labels.
- **No card inside a card (inside a card).** One surface level per region: group with spacing, typography and hairline dividers instead of nesting containers; a card's content is plain rows, not more cards.

## Process

### 0. Acknowledge and frame (one short message)
Confirm in one or two sentences what you understood (taste discovery, one question at a time, mockups to compare, then apply everywhere) and ask the first question. Do not start redesigning before the interview.

### 1. Ground yourself (silently, before the first mockup)
- Read the product/feature docs and any previous design records in the repo (`design/`, `docs/`, `PRODUCT.md`, README). Respect decisions already made; the interview changes design, not scope.
- Look at the current screens (screenshots via the project's preview or the user's images) so you can name concrete problems.
- If the user mentions a reference app, **research it** (store listing screenshots, official site, reviews). App Store pages can be fetched with `curl` and their `mzstatic.com` screenshot URLs downloaded; build a contact sheet and actually look at it. Report what the reference *does* (mechanics) separately from how it *looks*; users often like one and not the other.

### 2. Interview — one question per message
- Start broad, then narrow: references they love and why → mechanics to borrow → overall visual direction → dark/light → motion level → navigation model → the hardest flow (e.g. builder/editor) → typography → component treatments (emphasis, grouping) → data visualization → personality (illustration vs typography) → "anything else that bothers you?".
- **Prefer comparison over open questions.** Offer 2–4 concrete options, each rendered as a mockup of the *same* screen and content so only the dimension under test changes. Name options with a letter and a short evocative label ("A · Noite", "B · Calma").
- Use `AskUserQuestion` (multi-select when choices are not exclusive) for quick choices; plain text for "which mockup + what would you change".
- When the user can't imagine something, **expand that option** (more frames: empty state, multi-item case, interaction states) before asking again. Do not record an answer they did not give.
- If something distracts them from judging (e.g. the font), resolve that first.
- Keep each message short: what the mockup shows, the question. No essays.

### 3. Mockups and prototypes
- Static mockups: write self-contained HTML (Google Fonts allowed) with phone frames of ~360–412×800 px, render to PNG with `scripts/render.mjs`, look at the result yourself (fix overlaps, cut-offs, typos), then copy to `~/Desktop/<descriptive-name>.png` and `open` it.
- Motion/interaction: build a clickable single-file HTML prototype (state in JS, CSS transitions) with toggles for the dimension under test (e.g. motion "Vivo/Sutil", theme), smoke-test it with Playwright, then `open` it in the browser. Respect product rules in prototypes too (e.g. step sizes) — the user will catch mistakes.
- Use realistic domain data and the product language, never lorem ipsum.
- Store the HTML sources and approved PNGs in the repo (`design/mockups/`) once a direction is chosen so implementers can match them.

### 4. Record everything as you go
Maintain `design/design-interview.md` (English): context, guiding mindset, then one section per question with the options shown, the user's answer (quote short phrases), rejections, and what it implies. Append immediately after each answer — never batch.

### 5. Synthesize (after the user says there is nothing else)
- `design/design-direction.md`: principles; visual language (style, typeface, color tokens with hex values for every theme, shapes/radii, elevation, motion durations, personality, button rules); navigation model; per-area interaction rules. This file overrides older specs where they conflict.
- `design/screens.md`: screen inventory (old routes → new screens, what gets absorbed), then each screen conceptually: its job, layout, the shortest path for the main action, creation flows without dead screens, states. End with a build plan.
- Surface any change that alters **product behavior** (not just design) as an explicit question before building.

### 6. Build or delegate
- Build the shared foundation yourself first (tokens, typography, core components, navigation skeleton, demo data for previews) and commit it — parallel workers need a committed base.
- Delegate screens in parallel only with: a shared brief (rules, read-order, read-only shared files, preview ports, screenshot tool, checks, commit + report format), disjoint file ownership per worker, and contracts for cross-screen pieces (routes, pickers, current-selection helpers).
- Integrate: merge, close the foundation gaps workers report, run typecheck/lint/tests, screenshot every screen (dark and light) and compare against the approved mockups before showing the user.

## Scripts

- `scripts/render.mjs <absolute-html-file> <out.png> [viewportWidth]` — full-page PNG of a local HTML mockup at 2× (Playwright Chromium).
- `scripts/shot.mjs <out-prefix> --url <url> [--light] [--step "click:Text" | "label:A11y label" | "wait:ms" | "scroll:px" | "shot:suffix"]...` — phone-viewport (412×915) screenshots of a running web preview, with simple navigation steps; logs console errors.

Both need `playwright-core` and a Chromium build. If missing: `cd <scratch dir> && npm init -y && npm i playwright-core && npx playwright-core install chromium-headless-shell`, then run the scripts from there (copy them over or reference them by absolute path with `NODE_PATH`).

## Anti-patterns
- Asking several questions at once, or asking the user to describe a design in words.
- Showing mockups you have not looked at yourself.
- Treating a mockup detail the user did not comment on as approved, or a reference app's look as liked when only its mechanics were praised.
- Inventing metrics, labels or features in mockups that the product never decided — flag them as proposals.
- Redesigning before the interview ends, or applying the result to one screen only when the user asked for all.
