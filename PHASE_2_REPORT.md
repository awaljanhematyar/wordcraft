# WordCraft Phase 2 report

Completed on 2026-10-23. Phase 2 only. No deployment or GitHub push occurred. Phase 3 has not started.

## Completed features

- Two-pass five-letter scoring with correct, present, and absent feedback and accurate duplicate counts.
- Immutable six-attempt game transitions, dictionary validation, clear error codes/messages, win/loss termination, and keyboard clue precedence.
- Hard Mode constraints accumulated from every revealed row, including greens, yellow relocation, gray exclusions, minimum positive counts, and inferred maximum counts.
- Official Wordnik MIT word data pinned to an exact revision, bundled unmodified license, provenance, and checksum manifest.
- Separate frozen lists with 11,846 allowed guesses and 821 independently curated answers. Every answer is an allowed guess.
- Pure ES modules with no browser globals, runtime network access, framework, or package dependency.

## Files changed

- Modified: README.md
- Modified: assets/README.md
- Added: assets/WORDNIK_LICENSE.txt
- Added: assets/WORD_LIST_MANIFEST.json
- Modified: assets/WORD_LIST_PROVENANCE.md
- Modified: js/game.js
- Modified: js/hard-mode.js
- Modified: js/words.js
- Added: tests/PHASE_2_RESULTS.txt
- Modified: tests/README.md
- Added: tests/game.test.js
- Added: tests/hard-mode.test.js
- Added: tests/words.test.js
- Added: PHASE_2_REPORT.md (this report).

The original IMPLEMENTATION_PLAN.md and all Phase 1 UI, styling, entry-point, hosting configuration, and unrelated modules remain unchanged.

## Test results

Node.js v24.19.0. Command: `node --test --experimental-test-coverage` from the project root.

72 tests passed, zero failed, zero skipped. Coverage for the three implemented logic/dictionary modules: 100% lines, 99.19% branches, 100% functions. Includes exhaustive loops over 59,049 scoring pairs and 32,768 Hard Mode triples. See tests/PHASE_2_RESULTS.txt for actual output.

Upstream source and license bytes were retrieved from the pinned Wordnik revision. Derived lists and bundled license match the stored checksums. JavaScript syntax checks passed.

## Remaining limitations

The visible site is still the Phase 1 scaffold, with no gameplay wiring or browser QA. Daily scheduling, unlimited random selection, Local Storage, statistics, preference persistence, sound, sharing, and full interactive UI are unimplemented later-phase work. API states are created by the engine. Do not pass unvalidated saved objects directly into the engine; validated restoration/replay belongs to Phase 3.

The broad allowed list can contain uncommon, regional, inflected, or sensitive words. The finite curated answer list can receive further editorial review before release. Answers remain visible in client source. No backend security or synchronized multiplayer exists.

Approval is required before Phase 3. Publishing and pushing to GitHub remain unapproved.
