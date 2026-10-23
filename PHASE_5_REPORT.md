# WordCraft Phase 5 QA report

Date: 2026-10-23. Scope: QA, targeted reliability/accessibility fixes and performance optimization. Phase 5 implementation and all available checks are complete. The environment-limited checks below remain open; this is not a claim of universal browser compatibility or accessibility certification. Phase 6 has not started. No deployment, backend, GitHub push, or new runtime/test dependency was introduced.

## Automated verification

Executed from the project root on Node.js v24.19.0:

```sh
node --test --experimental-test-coverage --test-coverage-include='**/js/**'
```

258 passed; 0 failed, skipped, cancelled or todo. All 248 Phase 4 tests and their 13 test files remain byte-for-byte unchanged against the restored Phase 4 archive. Ten tests were added: six reliability/rendering regressions and four contrast checks. Full executed output is in tests/PHASE_5_RESULTS.txt.

Executed-module coverage: 100.00% lines, 96.78% branches, 97.35% functions. Coverage does not mean every browser/assistive-technology configuration was tested. Existing exhaustive checks include 59,049 scoring pairs and 32,768 hard-mode triples.

Verified rules include duplicate-letter scoring, six-attempt loss and sixth-attempt win, allowed words, minimum/maximum hard-mode counts, deterministic UTC schedule and frozen answer snapshot, randomized unlimited selection, abandonment, separate mode statistics, streaks, preferences, replay-validated persistence and completion deduplication. Injection-based tests also cover midnight/year/leap transitions, focus/visibility/timer rollover, malformed/unsupported storage, access/quota failures, clipboard success/rejection, audio resume/failure, reduced-motion behavior and disposal.

## Fixed defects and targeted improvements

1. A regular-expression end anchor accepted an actual trailing newline in typed input. Controller input and saved-input validation now reject every non-ASCII-letter character. Corrupt input recovers safely. Two regressions cover this.
2. A pending clipboard failure could select an invisible text field after the results dialog closed or the puzzle changed. Async callbacks now check disposal, active dialog and puzzle identity before focusing or announcing. Regression included.
3. A suspended audio context could finish resuming after disposal and create a tone. A post-resume disposal check prevents this. Regression included.
4. Dialog close could return focus to a hidden/disabled former trigger. It now falls back to the game surface. Regression included.
5. Unchanged renders rewrote text and attributes across the board and keyboard. Small comparison-before-write helpers and cached static references avoid these mutations. A no-op render regression verifies zero text/attribute writes.
6. Empty board, keyboard and action areas were not fully reserved before bootstrap/state restoration. Reserved geometry removes the observed initial layout shift without changing the visual direction.
7. Dark empty-control boundaries measured as low as 2.03:1 against tiles; the prior light boundary also missed the 3:1 target. Adjusted navy-gray border/absent tokens, key borders and clue symbols preserve the palette while meeting the tested ratios. Four contrast regressions guard text and boundaries in both themes.
8. Header/settings wrapping, key word wrapping and flexible statistic columns support enlarged text. The real rendered matrix found no overflow after these changes.
9. The 77,166-byte licensed dictionary module is now module-preloaded, allowing an early request instead of waiting for the full import chain. It remains one cached native module with a private lookup Set. The answer schedule and word lists are unchanged.

## Actual browser testing

Available browser: remote Chromium/Chrome, Linux. The page reports Chrome/155.0.0.0 via navigator.userAgent (reduced version). The full browser build was not exposed through the supported interface. Firefox and WebKit were unavailable and were not executed.

Actual Chromium workflows executed:

- Physical Enter scored HELLO; a repeated immediate Enter did not add a second row during reveal.
- Physical letters AR survived a refresh; ENA then completed the daily puzzle with keyboard input.
- Completed-game refresh retained the two rows; typing Z afterwards changed neither board nor terminal status.
- Daily statistics remained one played/one won after reloads, with the second-attempt distribution entry once.
- Result-dialog Shift+Tab wrapped from Close to Copy; Tab wrapped back to Close. Escape restored the results trigger.
- Copy exposed a selected, labeled readonly manual-copy field when automatic copy was unavailable. Contents contained metadata and emoji only.
- Light theme and sound preference survived refresh; settings were returned to dark/sound off afterwards.
- Mode switching preserved unlimited typed CR; New Game created another practice puzzle.
- A second tab restored CR, typed A, and the first tab updated to CRA via storage reconciliation. Both tabs remained usable.
- Hard Mode activation before an accepted guess worked. ZZZZZ showed the dictionary error in the visible message and polite announcement region while remaining on attempt one.
- No WordCraft-origin errors were observed in the measured fixture or checked application workflow. The cloud extension emitted unrelated metadata errors; these were excluded explicitly.

Native tab switching occurred during this workflow. Hidden-tab UTC rollover was tested using injected visibility/clock events, not by waiting through an actual UTC midnight. Corrupted/disabled storage and audio failures were injected automated checks, not browser permission-setting changes. Clipboard API success was simulated in unit tests; real successful copying over a deployed HTTPS origin remains unverified.

## Responsive and accessibility evidence

The actual application was rendered at 320, 375, 390, 768, 1024 and 1440 CSS px using same-origin frames in Chromium. There were 120 measured cases: both themes, six widths, and ten scenarios (normal, 360px-height landscape, 200% text, long message, settings, statistics, instructions, and each of those three dialogs with 200% text). No document horizontal overflow or open-dialog horizontal overflow was measured. Board/key geometry and accessible-control name checks are retained in tests/PHASE_5_RESPONSIVE.json.

Text-only resize method: snapshot every element's computed font size and double it once, without changing the viewport or compounding inherited scaling. This is an explicit stress test, not an OS/browser text preference. Frames do not emulate touch hardware. Vertical scrolling is expected in short/landscape views. Smallest measured key target: 24.89px wide × 46px high. This meets a 24px minimum but does not meet the preferred 44px width on the narrowest viewport.

The native zoom shortcut was attempted five times. It did not produce a measurable CSS viewport change (document client width remained 1348px). Therefore actual 200% browser zoom is UNVERIFIED, not passed. The doubled-text reflow checks are separate evidence.

Actual keyboard checks cover input, Enter, modal initial focus, forward/backward Tab wrapping, Escape and restoration. Visible controls have names/labels, tiles expose readable feedback and the live region contains the validation text. There was no real screen-reader software, so spoken announcements/reading order are not certified. Reduced-motion CSS disables animation/transition and the injected preference skips reveal delay; OS-level preference testing remains open.

Calculated WCAG sRGB ratios from shipped tokens include dark tile border 3.88:1, dark key border 3.15:1, light tile border 3.40:1, light key border 3.04:1, white text on dark absent clue 4.76:1 and light muted text on panel 6.14:1. Tests check body, secondary, key, correct/present/absent clue text and control boundaries in both themes. This is targeted contrast testing, not a complete automated accessibility audit.

## Actual performance measurements

Unthrottled local Chromium, 768×900 CSS px, DPR 1. Measurements use Navigation Timing, Paint Timing, Resource Timing, buffered layout-shift entries and MutationObserver. Raw records: tests/PHASE_5_PERFORMANCE.json. The QA parent page itself is excluded.

| Measurement | Baseline | Optimized |
| --- | ---: | ---: |
| Navigation load end | 193.2 ms | 79.9 ms |
| DOMContentLoaded end | 177.6 ms | 76.7 ms |
| First contentful paint | 116 ms | 68 ms |
| Maximum CLS session window | 0.3586 | 0 |
| Mutation records entering HELLO | 930 | 15 |
| App document + subresources | 16 | 17 |
| Observed transfer bytes including document | 168,846 | 5,100 |

The optimized navigation used warm HTTP cache (300-byte validation transfers per resource); the baseline was predominantly uncached. These are observed samples, NOT a controlled speed improvement claim, a bandwidth benchmark or a Lighthouse/Core Web Vitals field score. Mutation counts use the same five letter actions after counter reset and show 98.4% fewer records. Adding the small DOM helper adds one native module request. No external scripts/fonts/API/analytics requests occurred in the measured app frame. A top-level favicon request is not included in the frame's count.

Current production source sizes: JavaScript 143,014 bytes total; CSS 12,545 bytes; HTML 9,268 bytes; dictionary 77,166 bytes (included in JS total). Per-file sizes and clearly labeled gzip estimates are in tests/PHASE_5_SOURCE_AUDIT.json. No claim about deployed compression is made. Existing animations use transform/opacity; reduced motion removes them. Geometry reservations address the measured shift. No dependency/bundling/build process was added.

## Security and reliability review

Application DOM content uses textContent, safe property/attribute assignment and fixed element names. Static pattern scans found no innerHTML/outerHTML assignment, insertAdjacentHTML, document.write, eval/new Function or common private-key/AWS/GitHub token signatures in checked HTML/CSS/JS/JSON source. Manual review found no credentials, external runtime scripts or runtime packages. This is a scoped source review, not a penetration test or proof that every possible secret format is absent.

Restoration treats saved data as untrusted, validates identity/types/words and replays guesses; statistics are rebuilt from validated completion records. Errors leave play available in memory. Local Storage remains editable, quota-limited and non-transactional across tabs. Tests reduce accidental duplicate accounting but cannot create atomic cross-tab guarantees. Answers and future schedules are inspectable, device clocks are editable, and there is no server-side security, multiplayer synchronization or cross-device account system.

## Changed files

Production modifications: index.html; css/style.css; js/main.js; js/storage.js; js/ui.js; js/settings.js; js/dialogs.js. Added js/dom.js. Pure scoring, hard-mode, statistics, daily schedule, unlimited selection and licensed word data were not rewritten.

Documentation updated: README.md, tests/README.md, tests/BROWSER_QA.md and IMPLEMENTATION_PLAN.md status only. Added this report; tests/PHASE_5_RESULTS.txt, PHASE_5_RESPONSIVE.json, PHASE_5_PERFORMANCE.json, PHASE_5_SOURCE_AUDIT.json; tests/phase5-regression.test.js, contrast.test.js; tests/performance-preview.html, browser-diagnostics.js, phase5-responsive.html, phase5-responsive.js; screenshots/phase5-desktop.jpg. Historical reports and test evidence remain intact.

## Remaining limitations and approval boundary

Outstanding external QA: Firefox, WebKit, full Chromium build identification, physical mobile/touch devices, real screen readers, OS-level reduced motion, real 200% browser zoom, audible audio output, successful clipboard permission over eventual HTTPS hosting, and controlled cold-cache/throttled performance/field measurements. No compatibility or accessibility certification is claimed for these. The source license still needs the owner's selection before public distribution; the bundled Wordnik data license and provenance are preserved.

Phase 5 stops here. Phase 6 and any publication require the user's approval.
