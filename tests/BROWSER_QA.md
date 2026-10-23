# Browser QA through Phase 6

Executed 2026-10-23 in the available remote Chrome/Chromium browser on Linux. navigator.userAgent reports Chrome/155.0.0.0 (reduced version); full build unavailable. Firefox and WebKit were not available and were not tested. See ../PHASE_5_REPORT.md for the complete evidence, fixes and caveats.

## Actual Chromium checks

| Workflow | Actual result |
| --- | --- |
| Physical input, Enter, immediate second Enter | One scored row, no duplicate accepted submission during reveal |
| Refresh with accepted HELLO and typed AR | Accepted row and partial input restored; ENA then completed daily win |
| Refresh after completion, further typed letter | Completed rows retained; input blocked |
| Statistics after repeated reload | One completed daily win, distribution counted once |
| Shift+Tab / Tab within results | Wrapped between first and last control |
| Escape and focus return | Results closed; View results trigger regained focus |
| Copy result | API unavailable/denied; labeled readonly field shown and selected; no answer or guesses in share text |
| Theme and sound preferences | Light and sound-on restored after reload; later returned to dark/sound-off |
| Modes and New Game | Daily/unlimited progress retained independently; new practice game available |
| Two tabs | Second tab restored CR, added A; first tab updated to CRA |
| Hard Mode and invalid word | Enabled before accepted guess; ZZZZZ announced dictionary error, attempt stayed one |
| Errors | No observed application-origin error; unrelated cloud extension metadata errors excluded |

On-screen key entry was exercised for the paired HELLO performance comparison; physical keyboard and mixed input were also verified. The prior Phase 4 record and screenshots remain in ../PHASE_4_REPORT.md and PHASE_4_RESPONSIVE.json.

## Responsive matrix

Actual same-origin app frames at 320, 375, 390, 768, 1024 and 1440 CSS px; normal height 1100px, landscape height 360px. Both themes, ten scenarios per width: normal, landscape, 200% text, long validation message, settings/statistics/instructions and the same three dialogs at 200% text. All 120 measured cases had no document/dialog horizontal overflow. Raw board/key geometry and control-name checks: PHASE_5_RESPONSIVE.json.

200% text means every computed element font size was snapshotted and doubled once; it is distinct from browser zoom and does not emulate hardware. The smallest key measured 24.89×46px (24px minimum met, preferred 44px width not met at narrow sizes). Vertical scrolling remains available. The browser's classic scrollbar reduces usable document width by 15px. Frame controls use native keyboard activation where embedded pointer coordinates are unreliable.

Actual 200% browser zoom: UNVERIFIED. Five native Ctrl+plus shortcuts were attempted, but no CSS viewport change was observed (document client width 1348px); Ctrl+0 was sent afterwards. Do not treat the text-only stress test as a browser zoom pass.

## Accessibility

Actual keyboard input, initial modal focus, Tab/Shift+Tab containment, Escape and focus restoration were exercised. Visible control names, tile feedback labels and polite validation text were observed. Targeted sRGB contrast tests now pass text at 4.5:1 and key/tile boundaries at 3:1 for tested pairs in both themes. Reduced-motion CSS and injected preference behavior were checked by source/tests. Real spoken screen-reader output and OS-level reduced-motion switching were unavailable. No WCAG certification is claimed.

## Automated rather than native browser fault checks

Node tests inject clocks and focus/visibility/timer events for UTC transitions while open/hidden; fake storage for corruption, blocked access and quota errors; audio resume/rejection; Clipboard API success/rejection; and reduced-motion preferences. These are executed, useful failure tests, but not native permission changes or an actual midnight wait. Two real tabs and refresh were separately checked above.

## Performance

PHASE_5_PERFORMANCE.json records actual Navigation/Paint/Resource Timing, buffered CLS entries and mutation counts from the app frame. Local unthrottled baseline load 193.2ms/FCP 116ms/CLS 0.3586; warm-cache optimized sample 79.9ms/FCP 68ms/CLS 0. No controlled cache/throttling or field-performance claim. Same five-letter action sequence fell from 930 to 15 mutations. Only app-origin resources were requested: document plus 16 optimized subresources; frame counts exclude top-level favicon and QA parent.

## Remaining external checks

Firefox, WebKit, full Chromium build, physical mobile/touch devices, real screen readers, real 200% browser zoom, OS reduced motion, audible output and successful Clipboard API permission on eventual HTTPS hosting. Controlled cold-cache/throttled performance remains open. No site was deployed or pushed. Publication awaits approval.

## Phase 6 final check, 2026-10-23

Rechecked the real app in Linux Chromium, UA Chrome/155.0.0.0 (reduced version). Desktop 1440×1200 and mobile 390×1200 frames each had no horizontal overflow, 30 tiles and 28 keys. Actual physical HELLO plus immediate Enter accepted one row. Invalid ZZZZZ preserved the attempt and, after awaiting the deferred update, exposed the same dictionary message in the polite live region. Accepted/partial input survived refresh and mode switching. Separate practice statistics and manual-copy fallback worked. No application-origin console errors were returned for the checked flow.

Actual local HTTP page/JS/CSS responses were 200 with correct content types. The internal preview did not apply vercel.json security headers. This is not deployed HTTPS/header verification. Raw records: PHASE_6_BROWSER.json and PHASE_6_HTTP.json. The final report separates actual checks from carried-forward Phase 5 evidence and unavailable checks. Screenshots are genuine browser output from scaled capture frames, not physical-device evidence. No publication occurred.
