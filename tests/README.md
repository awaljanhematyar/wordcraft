# WordCraft verification through Phase 6

Run `node --test` or `npm test` from the project root. No dependencies or browser are required. Coverage command on Node v24.19.0:

```sh
node --test --experimental-test-coverage --test-coverage-include='**/js/**'
```

Latest verification, 2026-10-23, Node v24.19.0: 258 passed, zero failed/skipped. All 248 Phase 4 tests (13 test files) remain byte-for-byte unchanged. Latest executed output: PHASE_5_RESULTS.txt. Historical output is preserved.

Executed application-module coverage: 100.00% lines, 96.78% branches, 97.35% functions. Coverage is not browser or accessibility certification.

## Preserved Phase 2 suites

- game.test.js: hand-checked scoring, duplicate allocation, malformed input, normalization, dictionary errors, immutable transitions, victories on attempts 1–6, six-attempt loss, terminal rejection, Hard Mode integration, keyboard precedence, and 59,049 exhaustive scoring pairs.
- hard-mode.test.js: accumulated green/yellow/gray constraints, duplicate counts, malformed histories, real-answer consistency, and 32,768 exhaustive candidate/guess/answer triples.
- words.test.js: separate frozen lists, format, sorting, uniqueness, membership, answer inclusion, pinned counts/checksums, and exact upstream MIT notice.

## Phase 3 suites

- daily.test.js: UTC equivalence across offsets, midnight, year change, leap days, malformed dates/clocks, default clock, pinned v1 snapshot, golden mapping, and three complete permutation cycles including before the epoch.
- unlimited.test.js: candidate reachability, no immediate repeat, single-word fallback, crypto priority/rejection sampling, bounded eight-attempt fallback, unavailable providers, and collision-resistant local IDs.
- settings.test.js: typed normalization/defaults, immutable updates, unknown keys, and invalid patches.
- statistics.test.js: terminal-only accounting, idempotent ledger updates, separate modes, percentages, win-only distribution, consecutive-day streaks, skipped days, losses, future timestamps, and unlimited completion ordering.
- storage.test.js: document round trips, saved-score distrust, counter recomputation, completion repair/deduplication, independent recovery, unsupported/corrupt/oversized data, denied access and quota failures, malformed sessions, replay violations, hard-mode history flags, expired snapshots, freezing, and deterministic best-effort merges.
- main.test.js: refresh and typed input, rollover/startup/pre-submit checks, independent modes, abandonment, duplicate IDs, repeat refresh, stats persistence, clock rollback, hard-mode opt-out, failures, two-tab reconciliation, lifecycle listeners/timer/cleanup, and bootstrap announcements.
- helpers.js: injected clocks, in-memory storage, fixed random/ID providers, and reusable valid completion fixtures. No real browser storage is touched.

## Phase 4 suites

- interactions.test.js: shared keyboard/pointer input, Backspace, limits, invalid words, duplicate-submit locking, win/loss termination, rollover, disposal, external updates, shortcuts, IME, and native button behavior.
- ui.test.js: renders the real markup into a minimal deterministic DOM fixture, checks board/key counts, immediate letters, physical/on-screen events, messages, mode preservation, settings, statistics, dialog focus/Tab/Escape, results, share success/manual fallback, persistence failures, mixed pointer/keyboard focus, and cleanup.
- share.test.js: daily/unlimited metadata, eligible Hard Mode marker, exact emoji rows, no guessed words/answer, invalid sessions, Clipboard API success, and safe fallback.
- audio.test.js: lazy sound off/on, tone selection, resumed/denied/unsupported audio, reused contexts, and cleanup.
- dom-fixture.js: small dependency-free fixture for our own markup. This is not a complete DOM or browser/layout emulator.

## Phase 5 suites and browser fixtures

- phase5-regression.test.js: real trailing-newline input rejection, corrupt saved input recovery, pending clipboard failure after dialog close, audio resume after disposal, no-op rendering and focus fallback from a hidden trigger.
- contrast.test.js: WCAG sRGB calculations on shipped dark/light tokens. Text targets 4.5:1; empty tile/key boundaries target 3:1.
- performance-preview.html and browser-diagnostics.js: local same-origin app fixture for navigation/paint/resource timing, CLS session windows, mutation counts and errors. Use Reset mutation counter, type HELLO, then Record metrics. Cache state is not controlled; document it with every run.
- phase5-responsive.html and phase5-responsive.js: actual app frames at the six required widths. Choose a scenario/theme, Apply scenario, then Measure. Text resizing snapshots computed sizes and doubles them without inherited compounding. Landscape uses 360px height. Test fixture settings are not production features.

BROWSER_QA.md separates actual Chromium checks from injected unit tests and unavailable checks. PHASE_5_RESPONSIVE.json contains 120 cases; PHASE_5_PERFORMANCE.json contains actual before/after observations; PHASE_5_SOURCE_AUDIT.json records source sizes/scans and preserved test files. No external runner or packages are required. Browser fixtures must be served over HTTP.

Remaining checks include Firefox/WebKit, real 200% browser zoom, physical touch devices, real screen-reader output, OS reduced motion, audible audio and clipboard success over eventual HTTPS hosting. Phase 6 preparation is complete. Publication awaits approval.

## Phase 6 final preparation

All 258 approved tests ran unchanged on Node v24.19.0: 258 passed, zero failures/skips. Executed-module coverage remains 100% lines, 96.78% branches and 97.35% functions. Final output: PHASE_6_RESULTS.txt. node --check passed for 35 application/test JS files. Production HTML/CSS/JS remain byte-identical to the Phase 5 archive.

PHASE_6_AUDIT.json records source/configuration checks. PHASE_6_BROWSER.json records actual desktop/mobile frame geometry and critical workflows. PHASE_6_HTTP.json records actual local HTTP status/MIME checks. handoff-preview.html/js is a repeatable capture/HTTP-check fixture, not a production feature. The outer fixture scales app frames to fit screenshots; game CSS viewports remain 1440 or 390px wide.

No fresh full responsive matrix or performance benchmark is claimed. Phase 5 evidence is retained separately. Final deployment headers/HTTPS, unavailable engines/devices and assistive technologies remain unverified. See ../PHASE_6_REPORT.md and ../DEPLOYMENT.md.
