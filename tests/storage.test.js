import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, createDocument, createSession, replaySession, validateSession, decodeDocument,
  reconcileDocuments, freezeDocument, MAX_SAVED_LENGTH, SCHEMA_VERSION } from '../js/storage.js';
import { dailyPuzzle } from '../js/daily.js';
import { memoryStorage, finished } from './helpers.js';
const day = '2026-10-23';
const clone = value => JSON.parse(JSON.stringify(value));

function decode(value) { return decodeDocument(JSON.stringify(value), day); }

test('missing storage returns a fresh versioned document', () => {
  const result = decodeDocument(null, day);
  assert.equal(result.status, 'empty');
  assert.equal(result.document.version, SCHEMA_VERSION);
  assert.equal(result.document.daily.answer, dailyPuzzle(day).answer);
});

test('normal document round trips with settings, typed input, and mode state', () => {
  const value = createDocument(day);
  value.daily.input = 'cra';
  value.settings = { theme: 'light', sound: true, hardMode: true };
  const memory = memoryStorage();
  assert.equal(memory.adapter.save(value).ok, true);
  const restored = memory.adapter.load(day);
  assert.equal(restored.status, 'loaded');
  assert.deepEqual(restored.document, value);
});

test('feedback and results are rebuilt from accepted words, not saved scores or counters', () => {
  const value = createDocument(day);
  const completion = finished(day, { attempts: 2 });
  completion.guesses[0].feedback = ['correct', 'correct', 'correct', 'correct', 'correct'];
  value.daily = completion;
  value.completions = [completion];
  value.statistics = { daily: { gamesPlayed: 900 } };
  const restored = decode(value).document;
  assert.equal(restored.statistics.daily.gamesPlayed, 1);
  assert.equal(replaySession(restored.daily).guesses[0].feedback.includes('absent'), true);
  assert.equal(Object.hasOwn(restored.daily.guesses[0], 'feedback'), false);
});

test('missing ledger completion is repaired from a valid terminal session exactly once', () => {
  const value = createDocument(day);
  value.daily = finished(day);
  let restored = decode(value).document;
  assert.equal(restored.completions.length, 1);
  restored = decode(restored).document;
  assert.equal(restored.statistics.daily.gamesPlayed, 1);
});

test('duplicate ledger identities cannot inflate results', () => {
  const value = createDocument(day);
  const completion = finished(day);
  value.completions = [completion, completion, { ...completion, status: 'playing' }];
  const restored = decode(value);
  assert.equal(restored.status, 'recovered');
  assert.equal(restored.document.completions.length, 1);
  assert.equal(restored.document.daily.status, 'won');
});

test('valid unlimited completions and selected mode survive restoration', () => {
  const value = createDocument(day);
  value.unlimited = finished(null, { mode: 'unlimited' });
  value.activeMode = 'unlimited';
  const restored = decode(value).document;
  assert.equal(restored.activeMode, 'unlimited');
  assert.equal(restored.statistics.unlimited.gamesWon, 1);
});

test('invalid current session is recovered independently while valid history and preferences survive', () => {
  const value = createDocument(day);
  value.daily.answer = 'zzzzz';
  value.completions = [finished('2026-10-22')];
  value.settings = { theme: 'light', sound: false, hardMode: true };
  value.activeMode = 'unlimited';
  value.unlimited = null;
  const restored = decode(value);
  assert.equal(restored.status, 'recovered');
  assert.equal(restored.document.daily.answer, dailyPuzzle(day).answer);
  assert.equal(restored.document.statistics.daily.gamesPlayed, 1);
  assert.equal(restored.document.settings.theme, 'light');
  assert.equal(restored.document.activeMode, 'daily');
});

for (const raw of ['{broken', 'null', '[]', '1', JSON.stringify({ version: 999 }), JSON.stringify({ version: 0 }), ' '.repeat(MAX_SAVED_LENGTH + 1), {}]) {
  test(`corrupt or unsupported raw storage recovers (${typeof raw}, ${String(raw).length} characters)`, () => {
    const result = decodeDocument(raw, day);
    assert.equal(result.status, 'corrupt');
    assert.equal(result.document.statistics.daily.gamesPlayed, 0);
  });
}

test('unavailable, throwing, and quota-limited storage never crash the game', () => {
  for (const getStorage of [() => undefined, () => { throw new Error('denied'); }, () => ({ getItem: () => { throw new Error('read denied'); }, setItem: () => { throw new Error('quota'); } })]) {
    const storage = createStorage({ getStorage });
    assert.equal(storage.load(day).status, 'unavailable');
    assert.equal(storage.save(createDocument(day)).ok, false);
  }
});

test('oversized and circular writes fail without throwing', () => {
  const memory = memoryStorage();
  const cycle = {}; cycle.self = cycle;
  assert.equal(memory.adapter.save(cycle).ok, false);
  assert.equal(memory.adapter.save({ large: 'x'.repeat(MAX_SAVED_LENGTH) }).status, 'too-large');
});

const mutations = [
  value => { value.id = 'wrong'; },
  value => { value.day = '2026-02-29'; },
  value => { value.scheduleVersion = 'daily-v999'; },
  value => { value.answer = 'apple'; },
  value => { value.generation = 1; },
  value => { value.revision = -1; },
  value => { value.hardMode = 'yes'; },
  value => { value.hardOptOut = null; },
  value => { value.hardEligible = true; },
  value => { value.input = 'toolong'; },
  value => { value.input = 'CRAFT'; },
  value => { value.guesses = Array(7).fill({ word: 'hello', hardMode: false }); },
  value => { value.guesses = [null]; },
  value => { value.guesses = [{ word: 'hello', hardMode: 'true' }]; },
  value => { value.guesses = [{ word: 'zzzzz', hardMode: false }]; },
  value => { value.status = 'won'; },
  value => { value.completedAt = 10; },
  value => { value.mode = 'unknown'; },
  value => { value.id = 'x'.repeat(121); },
];
mutations.forEach((mutate, index) => {
  test(`invalid session rejected before use, mutation ${index + 1}`, () => {
    const value = createDocument(day).daily;
    mutate(value);
    assert.throws(() => validateSession(value));
  });
});

test('unlimited identity, answer, and generation are validated', () => {
  for (const patch of [{ id: 'daily:wrong' }, { answer: 'zzzzz' }, { generation: 0 }, { day }, { scheduleVersion: 'daily-v1' }]) {
    const value = { ...finished(null, { mode: 'unlimited' }), ...patch };
    assert.throws(() => validateSession(value), TypeError);
  }
});

test('saved Hard Mode flags cannot enable enforcement after an accepted guess', () => {
  const session = createDocument(day).daily;
  session.guesses = [{ word: 'hello', hardMode: false }];
  session.hardMode = true;
  session.hardEligible = true;
  assert.throws(() => validateSession(session), /too late/);
  session.hardMode = false; session.hardEligible = false;
  session.guesses.push({ word: 'craft', hardMode: true });
  assert.throws(() => validateSession(session), /after a guess/);
});

test('saved opt-out must match per-guess hard-mode transitions', () => {
  const session = createDocument(day).daily;
  session.guesses = [{ word: 'hello', hardMode: true }, { word: 'craft', hardMode: false }];
  assert.throws(() => validateSession(session), /opt-out/);
  session.hardOptOut = true;
  assert.equal(validateSession(session).hardEligible, false);
});

test('hard-mode violations, post-win guesses, bad terminal input/time are rejected on replay', () => {
  const session = createSession({ id: 'unlimited:test', mode: 'unlimited', answer: 'apple' }, true, 1);
  session.guesses = [{ word: 'allee', hardMode: true }, { word: 'abide', hardMode: true }];
  assert.throws(() => validateSession(session), /violates/);
  const won = finished(day);
  won.guesses.push({ word: 'hello', hardMode: false });
  assert.throws(() => validateSession(won), /violates/);
  for (const patch of [{ input: 'x' }, { completedAt: null }, { completedAt: NaN }]) assert.throws(() => validateSession({ ...finished(day), ...patch }));
});

test('expired daily snapshots restore separately, with no completions or losses', () => {
  const value = createDocument(day);
  const old = createDocument('2026-10-22').daily;
  value.expiredDaily = [{ ...old, status: 'expired' }];
  let result = decode(value);
  assert.equal(result.document.expiredDaily.length, 1);
  assert.equal(result.document.statistics.daily.gamesPlayed, 0);
  value.expiredDaily[0].input = 'x';
  result = decode(value);
  assert.equal(result.status, 'recovered');
  assert.equal(result.document.expiredDaily.length, 0);
});

test('malformed arrays and settings recover rather than trusting arbitrary values', () => {
  const value = createDocument(day);
  value.completions = 'wrong'; value.expiredDaily = {};
  value.settings = { theme: 'evil', hardMode: 'true' }; value.revision = -10;
  assert.deepEqual(decode(value).document.settings, { theme: 'dark', hardMode: false, sound: false });
  assert.equal(decode(value).document.revision, 0);
});

test('deep freezing protects documents, histories, and ledgers', () => {
  const document = freezeDocument(createDocument(day));
  assert.throws(() => document.daily.input = 'x', TypeError);
  assert.throws(() => document.completions.push({}), TypeError);
  assert.equal(freezeDocument(document), document);
});

test('merge unions distinct completions and resolves duplicate IDs to committed remote result', () => {
  const left = createDocument(day); const right = createDocument(day);
  left.completions = [finished(day), finished('2026-10-21')];
  right.completions = [finished(day, { status: 'lost' }), finished('2026-10-22')];
  const merged = reconcileDocuments(left, right, day);
  assert.equal(merged.completions.length, 3);
  assert.equal(merged.daily.status, 'lost');
  assert.equal(merged.statistics.daily.gamesPlayed, 3);
});

test('merge keeps longer accepted progress, then revision, rather than stale input', () => {
  const left = createDocument(day); const right = createDocument(day);
  left.daily.guesses.push({ word: 'hello', hardMode: false });
  right.daily.revision = 50;
  assert.equal(reconcileDocuments(left, right, day).daily.guesses.length, 1);
  right.daily.guesses = [...left.daily.guesses];
  right.daily.input = 'craft';
  assert.equal(reconcileDocuments(left, right, day).daily.input, 'craft');
});

test('merge retains both expired archives and archives stale unfinished remote progress', () => {
  const left = createDocument(day); const right = createDocument('2026-10-22');
  right.daily.guesses.push({ word: 'hello', hardMode: false });
  left.expiredDaily = [{ ...createDocument('2026-10-21').daily, status: 'expired' }];
  const merged = reconcileDocuments(left, right, day);
  assert.equal(merged.expiredDaily.length, 2);
  assert.equal(merged.daily.day, day);
  assert.equal(merged.expiredDaily.find(entry => entry.day === '2026-10-22').guesses.length, 1);
});

test('merge selects newest unlimited generation and deterministic equal-generation tie', () => {
  const left = createDocument(day); const right = createDocument(day);
  left.unlimited = finished(null, { mode: 'unlimited', id: 'unlimited:a' });
  right.unlimited = { ...finished(null, { mode: 'unlimited', id: 'unlimited:b' }), generation: 2 };
  assert.equal(reconcileDocuments(left, right, day).unlimited.id, 'unlimited:b');
  left.unlimited.generation = 2;
  assert.equal(reconcileDocuments(left, right, day).unlimited.id, 'unlimited:b');
});

test('merge recovers today from completion ledger or creates today when both active dates are stale', () => {
  const left = createDocument('2026-10-21'); const right = createDocument('2026-10-22');
  assert.equal(reconcileDocuments(left, right, day).daily.day, day);
  left.completions = [finished(day)];
  assert.equal(reconcileDocuments(left, right, day).daily.status, 'won');
});

test('corrupt active daily snapshot restores a valid completion ledger entry for today', () => {
  const value = createDocument(day);
  value.daily = null;
  value.completions = [finished(day)];
  assert.equal(decode(value).document.daily.status, 'won');
});

test('new session after corrupt progress respects preserved Hard Mode preference', () => {
  const value = createDocument(day);
  value.daily = null;
  value.settings = { theme: 'light', sound: true, hardMode: true };
  assert.equal(decode(value).document.daily.hardEligible, true);
});
