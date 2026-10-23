# WordCraft Phase 3 report

Completed on 2026-10-23. Phases 1–3 are complete. Phase 4 has not started. No deployment, remote repository creation, or GitHub push occurred.

## Completed features

- Deterministic daily puzzles from validated UTC dates, a fixed epoch, a frozen 821-answer v1 snapshot, and a deterministic permutation. Future general-dictionary edits cannot shift this schedule. A checksum and golden-date regression test pin the mapping.
- Startup, focus, visibility restoration, 30-second timer, and pre-submit date checks. Unfinished old daily games are archived as unplayed expirations, with typed input cleared. They never become losses. Completed daily identities are retained in the ledger, including on clock rollback.
- Independent randomized unlimited games, crypto rejection sampling with a bounded fallback, no immediate answer repeat when alternatives exist, independent progress, and replay. Abandonment records no result.
- Schema-versioned Local Storage persistence for settings, selected mode, progress/input/status, puzzle identity, Hard Mode history/eligibility, completion accounting, and statistics in one JSON document.
- Restore validates identity, dates, words, statuses, mode history, typed input, and completion fields, then replays accepted guesses through the existing engine. Saved feedback and counters are not trusted. Corrupt components recover independently. Unsupported schema, denied access, quotas, and excessive write size cannot crash in-memory play.
- Idempotent completion accounting, missing-ledger repair from valid completed current sessions, separate Daily/Unlimited statistics, win-only guess distribution, rounded win percentage, current streak, and maximum streak.
- Hard Mode activation only before the first accepted guess, persistent preferences, per-guess enforcement flags, and irreversible eligibility loss on opt-out. Completed eligibility is not changed by later preferences.
- Best-effort external-tab reconciliation for accepted progress, newer unlimited generations, preferences, archives, and completion IDs. Storage events do not echo writes.
- Typed settings normalization and validated updates. Theme application, sound playback, and all visible game controls remain Phase 4.

## Files changed

- Modified: README.md
- Added: assets/DAILY_SCHEDULE.md
- Added: js/daily-answers-v1.js
- Modified: js/daily.js
- Modified: js/main.js
- Modified: js/settings.js
- Modified: js/statistics.js
- Modified: js/storage.js
- Added: js/unlimited.js
- Added: tests/PHASE_3_RESULTS.txt
- Modified: tests/README.md
- Added: tests/daily.test.js
- Added: tests/helpers.js
- Added: tests/main.test.js
- Added: tests/settings.test.js
- Added: tests/statistics.test.js
- Added: tests/storage.test.js
- Added: tests/unlimited.test.js
- Added: PHASE_3_REPORT.md (this report).

The 72 original Phase 2 tests in tests/game.test.js, tests/hard-mode.test.js, and tests/words.test.js are byte-for-byte unchanged against the Phase 2 source archive. The Phase 2 rule modules and dictionary are also unchanged. index.html, css/style.css, js/ui.js, hosting configuration, the original implementation plan, and historical Phase 2 report/output are unchanged.

## Automated verification

Runtime: Node.js v24.19.0.

Command:

```sh
node --test --experimental-test-coverage --test-coverage-include='**/js/**'
```

206 tests passed, zero failed, zero skipped, zero TODO. This comprises 72 preserved Phase 2 tests and 134 new Phase 3 tests. Actual output is in tests/PHASE_3_RESULTS.txt. All modified/new application modules also pass JavaScript syntax checks.

| Imported application module | Lines | Branches | Functions |
| --- | --- | --- | --- |
| daily-answers-v1.js | 100% | 100% | 100% |
| daily.js | 100% | 100% | 100% |
| game.js | 100% | 97.83% | 100% |
| hard-mode.js | 100% | 100% | 100% |
| main.js | 100% | 95.88% | 96.97% |
| settings.js | 100% | 100% | 100% |
| statistics.js | 100% | 100% | 100% |
| storage.js | 100% | 99.00% | 96.67% |
| ui.js (existing scaffold) | 100% | 90.91% | 100% |
| unlimited.js | 100% | 100% | 100% |
| words.js | 100% | 100% | 100% |
| Total reported by Node | 100% | 98.52% | 97.80% |

Coverage is scoped to imported js application modules and excludes test helpers. It does not measure unimplemented Phase 4 functionality. Lifecycle tests use injected clocks/event targets, fake storage, and a minimal document fixture. No real-browser compatibility, responsive, screen-reader, or accessibility audit has been claimed.

## Remaining limitations

The visible site remains the foundation preview. The Phase 3 coordinator runs behind it, but visitors cannot yet use game controls. Interactive board/keyboard integration, dialogs, sharing, applied themes, sound, animations, and browser QA await Phase 4 or later approval.

Local Storage has no atomic cross-tab transaction. Simultaneous conflicting progress branches or settings use deterministic best-effort resolution, so progress can still be lost in a race. Duplicate result IDs are deduplicated, but this is not synchronized multiplayer or a cross-device account system.

The serialized-state adapter has a 4 MiB text cap, and browsers enforce their own quotas. Completion history is not pruned because that would weaken completion deduplication. Heavy use can exhaust storage. Failed writes leave play available in memory but cannot preserve unsaved changes across refresh. Unsupported future schema versions recover to defaults until an explicit migration is provided.

Statistics, device clocks, and answer data remain client-controlled. There is no anti-cheat or server-side security. Daily v1 cycles after 821 days. Introducing a future schedule requires the documented explicit UTC cutover/migration while preserving earlier mappings and allowed-guess support.

Approval is required before Phase 4. No deployment or GitHub push is authorized by this phase.
