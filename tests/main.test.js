import test from 'node:test';
import assert from 'node:assert/strict';
import { createController, attachLifecycle, bootstrap } from '../js/main.js';
import { createStorage, STORAGE_KEY, decodeDocument } from '../js/storage.js';
import { harness, finished } from './helpers.js';

const answer = controller => controller.getState()[controller.getState().activeMode].answer;
const win = controller => controller.guess(answer(controller));
const lose = controller => {
  const wrong = answer(controller) === 'hello' ? 'craft' : 'hello';
  for (let i = 0; i < 6; i += 1) assert.equal(controller.guess(wrong).ok, true);
};

test('daily progress and unfinished input survive reload with recomputed feedback', () => {
  const h = harness(); const c = h.controller;
  c.guess('hello'); c.setInput('CRA');
  const restored = h.reload();
  assert.equal(restored.getState().daily.guesses.length, 1);
  assert.equal(restored.getState().daily.input, 'cra');
  assert.deepEqual(restored.getGame().guesses, c.getGame().guesses);
  assert.equal(restored.getStatistics().gamesPlayed, 0);
});

test('UTC midnight expires unfinished daily progress without recording a loss', () => {
  const h = harness(); const c = h.controller;
  c.guess('hello'); c.setInput('cra');
  h.setTime('2026-10-23T23:59:59.999Z');
  assert.equal(c.checkDay(), false);
  h.setTime('2026-10-24T00:00:00Z');
  assert.equal(c.checkDay(), true);
  assert.equal(c.getState().daily.day, '2026-10-24');
  assert.equal(c.getState().daily.input, '');
  assert.equal(c.getState().expiredDaily.length, 1);
  assert.equal(c.getState().expiredDaily[0].status, 'expired');
  assert.equal(c.getState().expiredDaily[0].guesses.length, 1);
  assert.equal(c.getState().expiredDaily[0].input, '');
  assert.equal(c.getStatistics().gamesPlayed, 0);
  assert.ok(h.events.some(event => event.message.includes('new UTC day')));
  assert.equal(h.reload().getState().expiredDaily.length, 1);
});

test('startup after midnight expires a saved daily puzzle and clears typed input', () => {
  const h = harness(); h.controller.setInput('craft');
  h.setTime('2026-10-24T00:00:01Z');
  const restored = h.reload();
  assert.equal(restored.getState().daily.day, '2026-10-24');
  assert.equal(restored.getState().daily.input, '');
  assert.equal(restored.getStatistics().gamesPlayed, 0);
});

test('pre-submit day check rejects a stale daily guess without consuming an attempt', () => {
  const h = harness(); const oldAnswer = answer(h.controller);
  h.setTime('2026-10-24T00:00:00Z');
  assert.equal(h.controller.guess(oldAnswer).code, 'day-changed');
  assert.equal(h.controller.getState().daily.guesses.length, 0);
});

test('pre-input day check does not carry old text into a new daily puzzle', () => {
  const h = harness(); h.setTime('2026-10-24T00:00:00Z');
  assert.equal(h.controller.setInput('hello').code, 'day-changed');
  assert.equal(h.controller.getState().daily.input, '');
});

test('unlimited progress survives a daily rollover and still accepts its pending guess', () => {
  const h = harness(); const c = h.controller;
  c.selectMode('unlimited'); c.setInput('app');
  const id = c.getState().unlimited.id;
  h.setTime('2026-10-24T00:00:00Z');
  assert.equal(c.guess(answer(c)).ok, true);
  assert.equal(c.getState().unlimited.id, id);
  assert.equal(c.getStatistics('unlimited').gamesWon, 1);
});

test('mode switching preserves independent unfinished games and selected mode across refresh', () => {
  const h = harness(); const c = h.controller;
  c.guess('hello'); c.setInput('cra');
  c.selectMode('unlimited'); c.setInput('app');
  const id = c.getState().unlimited.id;
  c.selectMode('daily');
  assert.equal(c.getState().daily.input, 'cra');
  c.selectMode('unlimited');
  assert.equal(c.getState().unlimited.id, id);
  assert.equal(h.reload().getState().activeMode, 'unlimited');
  assert.equal(h.reload().getState().unlimited.input, 'app');
});

test('new unlimited puzzles avoid immediate repeats, never count abandoned games as losses', () => {
  const h = harness(); const c = h.controller;
  c.newUnlimited(); const first = answer(c);
  c.guess('hello'); c.newUnlimited();
  assert.notEqual(answer(c), first);
  assert.equal(c.getStatistics('unlimited').gamesPlayed, 0);
  assert.equal(c.getState().unlimited.guesses.length, 0);
});

test('duplicate supplied IDs are repaired without colliding with active games or completions', () => {
  const h = harness({ makeId: () => 'unlimited:fixed' }); const c = h.controller;
  c.newUnlimited(); win(c);
  c.newUnlimited(); const second = c.getState().unlimited.id; win(c);
  c.newUnlimited();
  assert.notEqual(c.getState().unlimited.id, 'unlimited:fixed');
  assert.notEqual(c.getState().unlimited.id, second);
});

test('completed daily puzzle cannot be counted again after repeated refresh or submissions', () => {
  const h = harness(); win(h.controller);
  for (let i = 0; i < 5; i += 1) {
    const c = h.reload();
    assert.equal(c.getState().daily.status, 'won');
    assert.equal(win(c).code, 'game-over');
    assert.equal(c.getStatistics('daily').gamesPlayed, 1);
    assert.equal(c.getState().completions.length, 1);
  }
});

test('daily wins, misses, losses, and maximum streak persist across UTC days', () => {
  const h = harness(); const c = h.controller;
  win(c);
  h.setTime('2026-10-24T00:00:00Z'); c.checkDay(); win(c);
  assert.equal(c.getStatistics('daily').currentStreak, 2);
  h.setTime('2026-10-26T00:00:00Z'); c.checkDay();
  assert.equal(c.getStatistics('daily').currentStreak, 0);
  lose(c);
  assert.equal(c.getStatistics('daily').gamesPlayed, 3);
  assert.equal(c.getStatistics('daily').gamesWon, 2);
  assert.equal(h.reload().getStatistics('daily').maximumStreak, 2);
});

test('clock rollback restores an already completed daily identity instead of starting it again', () => {
  const h = harness(); const c = h.controller;
  win(c); h.setTime('2026-10-24T12:00:00Z'); c.checkDay(); win(c);
  h.setTime('2026-10-23T12:00:00Z'); c.checkDay();
  assert.equal(c.getState().daily.status, 'won');
  assert.equal(c.getStatistics('daily').gamesPlayed, 2);
  assert.equal(win(c).code, 'game-over');
});

test('unlimited streaks follow puzzle generations despite clock rollback and abandoned games', () => {
  const h = harness(); const c = h.controller;
  c.newUnlimited(); win(c);
  c.newUnlimited(); lose(c);
  c.newUnlimited(); c.newUnlimited();
  h.setTime('2026-10-22T12:00:00Z'); win(c);
  assert.equal(c.getStatistics('unlimited').gamesPlayed, 3);
  assert.equal(c.getStatistics('unlimited').currentStreak, 1);
  assert.equal(c.getStatistics('daily').gamesPlayed, 0);
});

test('settings persist and apply Hard Mode to newly started puzzles', () => {
  const h = harness(); const c = h.controller;
  assert.equal(c.setPreferences({ theme: 'light', sound: true, hardMode: true }).ok, true);
  const restored = h.reload();
  assert.deepEqual(restored.getState().settings, { theme: 'light', sound: true, hardMode: true });
  assert.equal(restored.getState().daily.hardEligible, true);
  restored.newUnlimited();
  assert.equal(restored.getState().unlimited.hardMode, true);
  assert.equal(restored.getState().unlimited.hardEligible, true);
});

test('invalid guesses do not block enabling Hard Mode before the first accepted guess', () => {
  const h = harness(); const c = h.controller;
  c.guess('zzzzz');
  assert.equal(c.setPreferences({ hardMode: true }).ok, true);
  assert.equal(c.getState().daily.hardEligible, true);
});

test('Hard Mode cannot be enabled after any accepted guess', () => {
  const h = harness(); const c = h.controller;
  c.guess('hello');
  assert.equal(c.setPreferences({ hardMode: true }).code, 'hard-mode-too-late');
  assert.equal(c.getState().settings.hardMode, false);
});

test('turning Hard Mode off before the first guess permanently removes puzzle eligibility', () => {
  const h = harness(); const c = h.controller;
  c.setPreferences({ hardMode: true }); c.setPreferences({ hardMode: false }); c.setPreferences({ hardMode: true });
  assert.equal(c.getState().daily.hardMode, true);
  assert.equal(c.getState().daily.hardEligible, false);
  assert.equal(h.reload().getState().daily.hardEligible, false);
  win(c);
  assert.equal(c.getState().completions[0].hardEligible, false);
});

test('turning Hard Mode off after a guess preserves replay history but forbids reactivation', () => {
  const h = harness(); const c = h.controller;
  c.setPreferences({ hardMode: true }); c.guess('hello'); c.setPreferences({ hardMode: false });
  assert.equal(c.setPreferences({ hardMode: true }).ok, false);
  const restored = h.reload();
  assert.equal(restored.getState().daily.guesses[0].hardMode, true);
  assert.equal(restored.getState().daily.hardOptOut, true);
  assert.equal(restored.getState().daily.hardMode, false);
  win(restored);
  assert.equal(restored.getState().completions[0].hardEligible, false);
});

test('Hard Mode completed game retains eligibility when preferences change for later games', () => {
  const h = harness(); const c = h.controller;
  c.setPreferences({ hardMode: true }); win(c); c.setPreferences({ hardMode: false });
  assert.equal(c.getState().daily.hardEligible, true);
  assert.equal(c.getState().completions[0].hardEligible, true);
  assert.equal(c.getState().settings.hardMode, false);
});

test('hard enforcement and invalid input errors preserve attempts and typed input', () => {
  const h = harness(); const c = h.controller;
  c.newUnlimited(); // Deterministic fallback picks about, not apple; use its actual answer for constraints.
  c.setPreferences({ hardMode: true }); c.guess('hello'); c.setInput('craft');
  const before = c.getState().unlimited.guesses.length;
  const result = c.guess('craft');
  assert.equal(result.ok, false);
  assert.equal(result.code, 'hard-mode');
  assert.equal(c.getState().unlimited.guesses.length, before);
  assert.equal(c.getState().unlimited.input, 'craft');
  assert.equal(c.setInput('abcdef').code, 'invalid-input');
  assert.equal(c.setInput('abc\n').code, 'invalid-input');
  assert.equal(c.setInput(null).code, 'invalid-input');
});

test('game submission defaults to persisted input; completed games reject further input', () => {
  const h = harness(); const c = h.controller;
  c.setInput(answer(c));
  assert.equal(c.guess().status, 'won');
  assert.equal(c.setInput('hello').code, 'game-over');
});

test('storage failure leaves a playable in-memory session and reports persistence failure', () => {
  const h = harness({ storage: createStorage({ getStorage: () => { throw new Error('denied'); } }) });
  assert.equal(h.controller.setInput('cra').ok, true);
  assert.equal(win(h.controller).status, 'won');
  assert.equal(h.controller.getStatistics().gamesWon, 1);
  assert.equal(h.controller.getStorageStatus(), 'unavailable');
});

test('corrupt saves recover on startup and remain playable', () => {
  const h = harness({ raw: '{broken' });
  assert.equal(h.controller.getStatistics().gamesPlayed, 0);
  assert.equal(win(h.controller).status, 'won');
  assert.equal(h.reload().getStatistics().gamesPlayed, 1);
});

test('two tabs synchronize accepted progress, completions, and preferences without duplicate counting', () => {
  const h = harness(); const first = h.controller; const second = h.reload();
  first.guess('hello');
  assert.equal(second.synchronize(h.memory.read()), true);
  assert.equal(second.getState().daily.guesses.length, 1);
  win(second);
  first.synchronize(h.memory.read());
  assert.equal(first.getState().daily.status, 'won');
  assert.equal(first.getStatistics().gamesPlayed, 1);
  assert.equal(win(first).code, 'game-over');
  second.setPreferences({ theme: 'light' });
  first.synchronize(h.memory.read());
  assert.equal(first.getState().settings.theme, 'light');
  assert.equal(h.reload().getStatistics().gamesPlayed, 1);
});

test('storage sync is idempotent, ignores corrupt events, and never echoes a write', () => {
  const h = harness(); const c = h.controller;
  const before = h.memory.writes();
  assert.equal(c.synchronize(h.memory.read()), false);
  assert.equal(c.synchronize('{broken'), false);
  assert.equal(c.synchronize(null), false);
  assert.equal(h.memory.writes(), before);
});

test('before an action, latest remote completion wins over stale local guesses', () => {
  const h = harness(); const stale = h.reload();
  win(h.controller);
  assert.equal(stale.guess('hello').code, 'game-over');
  assert.equal(stale.getStatistics().gamesPlayed, 1);
});

test('mode and ID API rejects invalid developer input', () => {
  const h = harness({ makeId: () => 'not-a-valid-id' });
  assert.throws(() => h.controller.selectMode('wrong'), TypeError);
  assert.throws(() => h.controller.newUnlimited(), TypeError);
  assert.throws(() => h.controller.setPreferences({ sound: 'true' }), TypeError);
});

function eventTarget() {
  const listeners = new Map();
  return { listeners, addEventListener: (key, handler) => listeners.set(key, handler),
    removeEventListener: key => listeners.delete(key),
    fire: (key, value = {}) => listeners.get(key)?.(value) };
}

test('focus, visible restoration, periodic timer, and storage events are wired and cleaned up', () => {
  const h = harness(); const c = h.controller; const winTarget = eventTarget(); const doc = eventTarget();
  doc.visibilityState = 'hidden'; let tick; let cancelled;
  const dispose = attachLifecycle(c, { window: winTarget, document: doc,
    setInterval: (callback, milliseconds) => { assert.equal(milliseconds, 30000); tick = callback; return 7; },
    clearInterval: id => { cancelled = id; } });
  h.setTime('2026-10-24T00:00:00Z');
  doc.fire('visibilitychange'); assert.equal(c.getState().daily.day, '2026-10-23');
  doc.visibilityState = 'visible'; doc.fire('visibilitychange'); assert.equal(c.getState().daily.day, '2026-10-24');
  h.setTime('2026-10-25T00:00:00Z'); winTarget.fire('focus'); assert.equal(c.getState().daily.day, '2026-10-25');
  h.setTime('2026-10-26T00:00:00Z'); tick(); assert.equal(c.getState().daily.day, '2026-10-26');
  const raw = h.memory.read();
  winTarget.fire('storage', { key: 'unrelated', newValue: '{bad' });
  winTarget.fire('storage', { key: STORAGE_KEY, newValue: raw });
  winTarget.fire('storage', { key: null, newValue: null });
  dispose();
  assert.equal(cancelled, 7); assert.equal(winTarget.listeners.size, 0); assert.equal(doc.listeners.size, 0);
});

test('bootstrap initializes persistence and routes UTC announcements without implementing controls', () => {
  const winTarget = eventTarget(); const doc = eventTarget();
  winTarget.localStorage = { getItem: () => null, setItem: () => {} };
  const nodes = new Map();
  const element = () => ({ append() {}, setAttribute() {}, replaceChildren() {}, textContent: '' });
  nodes.set('#board', element()); nodes.set('#announcements', element());
  doc.querySelector = id => nodes.get(id);
  doc.createElement = element; doc.createDocumentFragment = element;
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let app;
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
    app = bootstrap(winTarget, doc);
    assert.equal(app.controller.getState().version, 1);
    const changed = JSON.parse(JSON.stringify(app.controller.getState()));
    changed.revision += 5;
    changed.settings.theme = 'light';
    app.controller.synchronize(JSON.stringify(changed));
    assert.ok(nodes.get('#announcements').textContent.includes('another tab'));
  } finally {
    app?.dispose();
    if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document;
  }
});

test('session status snapshots contain validated progress and accounting in one saved document', () => {
  const h = harness(); win(h.controller);
  const result = decodeDocument(h.memory.read(), '2026-10-23');
  assert.equal(result.status, 'loaded');
  assert.equal(result.document.daily.status, 'won');
  assert.equal(result.document.completions.length, 1);
  assert.equal(result.document.statistics.daily.gamesWon, 1);
});
