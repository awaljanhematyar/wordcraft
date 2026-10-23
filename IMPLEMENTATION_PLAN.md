# WordCraft implementation plan

Status: Phases 1–5 approved. Phase 6 handoff and deployment preparation complete (2026-10-23). Actual QA and unverified environments are documented in PHASE_6_REPORT.md. Original requirements remain unchanged. Remote repository creation, deployment and portfolio publication await explicit approval.

## Scope and delivery

Create an original, five-letter, six-attempt browser game for a portfolio and client demonstration. Production uses HTML5, CSS3, and native JavaScript ES modules with no build process, runtime dependencies, backend, analytics, external fonts, or third-party scripts. Node.js is used only to execute automated tests. Serve the project through any static HTTP host because browsers restrict ES modules on file:// URLs.

This first milestone creates the plan, source structure, and an accessible foundation page. It does not represent a completed game. No publishing, remote repository creation, or deployment occurs without the user's approval.

## Milestones and acceptance gates

### 1. Foundation (current)

- Inspect the workspace and applicable instructions.
- Create every requested module, assets and test directories, README, Git exclusions, and static deployment configuration.
- Record module ownership, product decisions, and verification requirements.
- Acceptance: project structure exists, scripts parse, and the scaffold identifies unfinished functionality honestly.

### 2. Dictionary and pure game logic

- Obtain an openly licensed English dictionary from its primary source. Verify the exact revision, license, attribution, redistribution conditions, and provenance before committing its data.
- Keep a broad allowed-guesses set separate from a curated answer list. Ensure every answer belongs to the allowed set. Normalize to lowercase ASCII, filter to exactly five letters, deduplicate, and reject malformed entries.
- Include the upstream license and a provenance record in assets. Do not copy the proprietary Wordle answer list. No unverified dictionary ships.
- Score greens first, then allocate yellows from the remaining answer counts. Never award more copies than exist in the answer.
- Derive hard-mode constraints from the entire history: green positions, yellow exclusions at their observed positions, minimum positive counts, and maximum counts when a guess has excess gray copies. Gray-only letters have maximum zero. Enforce consistency across all previous guesses.
- Acceptance: pure unit tests cover correct, absent, misplaced, repeated-letter, and accumulated-constraint cases with hand-checked expected output.

### 3. Modes, persistence, and statistics

- Daily identity uses a UTC day ordinal from Date.UTC, a fixed epoch, a frozen versioned answer order, and a deterministic permutation. Use no locale parsing or local midnight calculations. All visitors with the same dictionary version and UTC date select the same answer.
- Keep the answer schedule stable across releases. A dictionary update must preserve prior day mappings or introduce a documented schedule migration.
- On startup, focus, visibility restoration, and a periodic timer, check the UTC day. Archive an unfinished old daily game as an unplayed expiration, load today's state, clear typed input, and announce the date change. Check again before accepting a guess. Do not infer a loss from expiration.
- Persist daily progress, unlimited progress, settings, and per-mode statistics with a schema version. Save accepted guesses, unfinished typed input, status, puzzle identity, hard-mode eligibility, and completion accounting.
- Recompute score history from validated guesses on restore. Treat Local Storage as untrusted input. Recover from malformed JSON, unsupported schema versions, invalid values, unavailable storage, and quota failures without crashing.
- Unlimited mode uses crypto.getRandomValues when available and a bounded random fallback. Avoid immediate repeats where possible. Starting over abandons an unfinished game without recording a completed loss.
- Record statistics only when a game completes. Use an idempotent completion ledger in the same saved document as progress and statistics to avoid counting a restored completion twice. Daily and unlimited statistics remain separate and clearly labeled.
- Daily streaks count consecutive UTC puzzle dates. A skipped or expired day breaks the streak. Unlimited streaks count consecutive completed wins. Losses reset the applicable current streak. Guess distribution counts wins only.
- Reconcile storage events from other tabs to reduce accidental overwrites. Document that Local Storage offers no atomic cross-tab transactions or cross-device synchronization.
- Hard Mode can be enabled only before the first accepted guess of a puzzle. Turning it off removes hard-mode completion eligibility for that puzzle, even if the preference changes later.
- Acceptance: injected-clock, injected-random, and fake-storage tests cover midnight boundaries, refresh, independent modes, duplicate completions, missed days, corrupt data, and storage exceptions.

### 4. Complete interface and interactions

- Visual direction: midnight navy, warm ivory text, mint green accents, amber hints, rounded tiles, restrained depth, and a matching light theme. Use system fonts and original vector assets.
- Build the six-row board, on-screen QWERTY keyboard, physical-key input, Daily/Unlimited controls, New Game, instructions, settings, statistics, and results dialogs.
- Use a single submission path for physical and on-screen inputs. Block extra submissions during reveal animations, enforce word validity before consuming attempts, and retain keyboard color precedence green > yellow > gray.
- Ignore gameplay shortcuts while users interact with form controls, editable content, dialogs, modifier shortcuts, or IME composition. Do not intercept browser shortcuts.
- Announce validation, row results, win/loss, and day changes in a polite live region. Give each tile readable state text and each icon button a name. Dialogs support Escape, initial focus, keyboard containment, and focus restoration.
- Use color plus text/state labels. Support prefers-reduced-motion, visible focus, contrast targets, large touch controls, zoom, and narrow screens.
- Keep sound optional and off by default. Synthesize short effects with Web Audio only after user interaction. Handle unsupported or suspended audio contexts without blocking play.
- Sharing contains brand, mode, puzzle identity, attempt count, eligible hard-mode marker, and emoji grid. It contains neither the answer nor a typed guess. Try Clipboard API from a user gesture, then select a readonly text area for manual copy if copying is unavailable.
- Acceptance: every visible control works, keyboard and touch flows agree, and there are no console errors during main workflows.

### 5. QA and performance

- Run Node's built-in test runner with no third-party test dependencies. Keep game rules and storage adapters importable without a DOM.
- Unit coverage: duplicate scoring, word validation, six-attempt termination, daily determinism, timezone independence, leap day and year change, random selection, all hard constraints, statistics, settings, and persistence failure recovery.
- Browser coverage: Chromium, Firefox, and WebKit when available. Record actual engines and versions tested. Never claim compatibility checks that were not executed.
- Responsive matrix: 320, 375, 390, 768, 1024, and 1440 CSS pixels. Check long announcements, dialogs, landscape, 200% zoom/text sizing, and no horizontal overflow.
- Accessibility: keyboard-only completion, screen-reader announcements, dialog focus, accessible names, contrast, touch targets, and reduced motion. Record manual checks separately from automated checks.
- Lifecycle coverage: refresh mid-game, reload after completion, UTC rollover while open/hidden, storage disabled/corrupted, Clipboard API denied, sound failure, and two tabs.
- Inspect request count and transferred size, avoid blocking resources, and keep dictionary loading efficient. Measure performance before reporting scores.
- Acceptance: meaningful tests pass, observed issues are fixed, actual QA results and remaining limitations are recorded.

### 6. Handoff and approval

- Complete README with architecture, local HTTP serving, test command, license attribution, data schema, reset instructions, supported browsers, and actual verification results.
- Capture actual desktop and mobile game screenshots after implementation. Include them in screenshots and reference them in the README. Do not present the scaffold as a finished-game screenshot.
- Prepare an editable source ZIP and a clean local Git repository. No secrets, node_modules, generated cache files, or machine-specific paths in tracked sources.
- Vercel: import the approved GitHub repository, select Other, leave Install and Build commands empty, and serve the repository root. There is no production Node process.
- Verify HTTPS ES-module MIME types and security headers on the eventual deployment.
- Present the completed local result and QA evidence, then obtain explicit approval before creating/pushing a remote repository or publishing.

## Module contracts

| File | Responsibility |
| --- | --- |
| index.html | Semantic application shell, SEO and Open Graph metadata, accessible dialogs and live region |
| css/style.css | Tokens, dark/light themes, responsive board and keyboard, focus, animations, reduced motion |
| js/main.js | Bootstrap, event coordination, UTC lifecycle checks, persistence, input locking |
| js/game.js | Pure scoring, guess validation, game state transitions, keyboard state |
| js/daily.js | UTC identity and deterministic versioned answer schedule |
| js/hard-mode.js | Derive and enforce accumulated positional and count constraints |
| js/statistics.js | Per-mode immutable updates, completion deduplication, streak and distribution rules |
| js/storage.js | Versioned load/save, validation, migrations, exception-safe browser adapter |
| js/ui.js | DOM rendering, dialogs, announcements, animation lifecycle, safe result copying |
| js/settings.js | Preference validation, theme application, optional synthesized audio |
| js/words.js | Licensed allowed guesses, separate curated answers, dictionary version |
| assets/ | Original icons, social preview, dictionary license and provenance |
| tests/ | Node tests for pure modules and documented browser QA matrix |
| screenshots/ | Verified screenshots captured from the implemented game |

## Product limits to disclose

The game runs entirely in the browser. Answer words and future daily schedules can be inspected in the source. Shared daily puzzles are deterministic, not synchronized multiplayer. Device clocks and local saved data can be altered. Statistics belong to the current browser/origin and can disappear when storage is cleared. No accounts, server-side security, leaderboards, or cross-device synchronization are promised.
