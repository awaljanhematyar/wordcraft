/** Local-only QA diagnostics, not imported by the production app. */
const frame = document.querySelector('#app');
let mutations = 0;
let shifts = 0;
let maxShiftSession = 0;
let sessionStart = 0;
let lastShift = 0;
let sessionValue = 0;
let observer;
let shiftObserver;
let fonts = [];
function record() {
  const win = frame.contentWindow;
  const nav = win.performance.getEntriesByType('navigation')[0];
  const report = {
    userAgent: navigator.userAgent,
    viewport: { width: win.innerWidth, height: win.innerHeight, devicePixelRatio: win.devicePixelRatio },
    navigation: nav ? { durationMs: nav.duration, domContentLoadedMs: nav.domContentLoadedEventEnd,
      loadMs: nav.loadEventEnd, responseEndMs: nav.responseEnd, transferSize: nav.transferSize } : null,
    paints: win.performance.getEntriesByType('paint').map(entry => ({ name: entry.name, startTimeMs: entry.startTime })),
    resources: win.performance.getEntriesByType('resource').map(entry => ({ name: entry.name, durationMs: entry.duration,
      transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize })),
    mutationRecordsSinceReset: mutations, layoutShiftSumWithoutRecentInput: shifts, clsMaximumSessionWindow: maxShiftSession,
    appErrors: errors,
  };
  document.querySelector('#diagnostics').textContent = JSON.stringify(report, null, 2);
}
const errors = [];
frame.addEventListener('load', () => {
  mutations = 0; shifts = 0; maxShiftSession = 0; sessionValue = 0; sessionStart = 0; lastShift = 0;
  const win = frame.contentWindow;
  win.addEventListener('error', event => errors.push(event.message));
  win.addEventListener('unhandledrejection', event => errors.push(String(event.reason)));
  observer?.disconnect(); shiftObserver?.disconnect();
  observer = new win.MutationObserver(entries => { mutations += entries.length; });
  observer.observe(frame.contentDocument.body, { subtree: true, childList: true, attributes: true, characterData: true });
  try {
    shiftObserver = new win.PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) {
        shifts += entry.value;
        if (entry.startTime - lastShift > 1000 || entry.startTime - sessionStart > 5000) { sessionValue = 0; sessionStart = entry.startTime; }
        sessionValue += entry.value; lastShift = entry.startTime;
        maxShiftSession = Math.max(maxShiftSession, sessionValue);
      }
    });
    shiftObserver.observe({ type: 'layout-shift', buffered: true });
  } catch { /* Browser may not expose layout-shift entries. */ }
  fonts = Array.from(frame.contentDocument.querySelectorAll('body *')).map(element => [element, Number.parseFloat(win.getComputedStyle(element).fontSize)]);
  setTimeout(record, 1000);
});
document.querySelector('#reset-mutations').addEventListener('click', () => { mutations = 0; record(); });
document.querySelector('#measure').addEventListener('click', record);
document.querySelector('#text-scale').addEventListener('change', event => {
  for (const [element, size] of fonts) element.style.fontSize = `${size * Number(event.target.value)}px`;
});
document.querySelector('#long-message').addEventListener('click', () => {
  frame.contentDocument.querySelector('#game-message').textContent = 'Keep the revealed letters in their required positions and use the correct number of repeated letters. '.repeat(4);
});
