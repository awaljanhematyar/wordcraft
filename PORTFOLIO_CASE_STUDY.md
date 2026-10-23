# WordCraft portfolio case study

Status: prepared copy for owner review. No personal portfolio was modified. No live-demo or repository URL is invented.

## Project description

WordCraft is an independent browser word game built with HTML, CSS and vanilla JavaScript. Players solve one shared UTC puzzle each day or practice with unlimited randomized games. Strict Hard Mode applies positional clues and duplicate-letter counts. Progress, preferences and separate mode statistics persist locally. The interface includes physical and on-screen keyboards, accessible dialogs, reduced motion and private emoji result sharing.

Short card copy:

A buildless JavaScript word puzzle featuring stable UTC daily challenges, unlimited practice, strict Hard Mode and persistent statistics. Tested pure game logic supports accurate duplicate-letter feedback and a responsive interface.

Suggested portfolio fields: name WordCraft, category JavaScript browser game, role JavaScript development, UI implementation and QA, stack HTML5/CSS3/Vanilla JavaScript/ES modules/Local Storage/Node built-in tests. Publication and source-license status should remain explicit. Do not describe this as a paid client delivery or claim client outcomes.

## Problem and approach

The project demonstrates that a browser game can provide reliable stateful interactions without a framework, build pipeline or backend. The main engineering risks were duplicate-letter feedback, daily-date boundaries, replay-safe persistence and keeping input consistent across keyboards and animation states.

The architecture separates pure rules from browser coordination. Small modules own scoring, Hard Mode, schedule selection, statistics, validated storage and rendering. Native ES modules load directly over static HTTP. The dictionary is bundled locally with pinned provenance and a separate curated answer list.

## Technical challenges and solutions

| Challenge | Solution |
| --- | --- |
| Duplicate-letter feedback | Allocate greens first, then yellows from remaining answer counts, preventing excess positive copies |
| Strict Hard Mode | Accumulate greens, yellow exclusions and inferred minimum/maximum counts across all accepted guesses |
| Stable daily puzzles | UTC day ordinals, fixed epoch and frozen versioned answer order with deterministic permutation |
| Refresh and corrupted data | Validate saved values and replay accepted guesses, rebuilding feedback and statistics rather than trusting saved counters |
| Duplicate completion counting | Keep an idempotent completion ledger with current progress in the same persisted document |
| Two input methods | One submission path for physical/on-screen keys, with a reveal lock and filtering for dialogs, editable fields, shortcuts and IME |
| Cross-tab changes | Reconcile validated progress and completion records through storage events, while documenting non-atomic limits |
| Accessible interactions | Native controls, readable state labels, polite live region, modal Tab/Escape/focus handling and reduced-motion support |
| Rendering overhead | Compare values before DOM writes, cache static references and reserve board/keyboard/action geometry |

## Verified outcomes

Final Phase 6 run: 258 automated tests passed, no failures/skips. All approved Phase 5 tests remain unchanged. Executed-module coverage: 100% lines, 96.78% branches, 97.35% functions. Exhaustive existing cases include 59,049 scoring pairs and 32,768 Hard Mode triples.

Phase 5 Chromium responsive testing measured 120 cases across six widths, both themes, landscape, long messages and doubled text. No horizontal overflow was measured. Phase 6 rechecked actual 1440px desktop and 390px mobile frames, gameplay, refresh, mode/statistics separation and manual copying.

A paired HELLO typing sequence fell from 930 to 15 DOM mutation records. The measured layout shift fell from 0.3586 to zero. The optimized local sample recorded 68ms FCP and 79.9ms load completion, with warm cache. These are local observations, not controlled speed improvements, production field scores or client conversion results.

## Screenshots

Use screenshots/phase6-desktop.jpg and screenshots/phase6-mobile.jpg. These show the actual completed game, captured in Chromium CSS viewport frames at 1440×1200 and 390×1200, displayed at 70% scale. The mobile file is raw browser output with surrounding fixture background. See screenshots/README.md. Do not label either image as a physical-device test.

## Demonstration sequence

1. Show Daily and explain the shared UTC identity and stable schedule.
2. Open Unlimited, start a new game and demonstrate physical/on-screen entry, duplicate-letter feedback and invalid-word recovery.
3. Enable Hard Mode before a first accepted guess. Show a clue constraint and explain duplicate-count enforcement.
4. Refresh during a game and switch between modes to demonstrate independent saved progress.
5. Show separate statistics, themes and optional sound controls.
6. Show a completed result and copy only metadata/emoji, including manual fallback where needed.
7. Explain the pure logic tests, licensing and honest browser-only limitations.

## Boundaries to disclose

No backend, accounts, server-side security, synchronized multiplayer, anti-cheat or cross-device data. Answers are inspectable and clocks/storage are editable. Storage reconciliation is best effort. Firefox/WebKit, physical devices, real screen-reader speech, OS reduced motion, actual 200% browser zoom and deployed HTTPS behavior remain unverified. Do not claim WCAG certification, Lighthouse scores or broad cross-browser compatibility.

## Ready-to-use project narrative

I built WordCraft to demonstrate JavaScript game logic and browser application design without a framework. I separated scoring, strict Hard Mode, UTC scheduling and statistics into testable modules, then connected them to a responsive interface with persistent local progress and accessible interactions. The handoff includes 258 passing automated tests, actual Chromium QA records, licensed word-data provenance and deployment instructions. Publication remains subject to approval.
