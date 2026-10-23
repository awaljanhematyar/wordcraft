/** Versioned state. All restored sessions are rebuilt by replay, never by trusting saved feedback. */
import { createGame, submitGuess } from './game.js';
import { ANSWERS } from './words.js';
import { dailyPuzzle, dayOrdinal, utcDay, SCHEDULE_VERSION } from './daily.js';
import { validateSettings } from './settings.js';
import { calculateStatistics, recordCompletion } from './statistics.js';
export const STORAGE_KEY = 'wordcraft:state';
export const SCHEMA_VERSION = 1;
export const MAX_SAVED_LENGTH = 4 * 1024 * 1024;
const answerSet = new Set(ANSWERS);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const counter = value => Number.isSafeInteger(value) && value >= 0;

export function freezeDocument(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDocument(child);
    Object.freeze(value);
  }
  return value;
}

export function createSession(puzzle, hardMode = false, generation = 0) {
  return { id: puzzle.id, mode: puzzle.mode, day: puzzle.day ?? null, scheduleVersion: puzzle.scheduleVersion ?? null,
    answer: puzzle.answer, guesses: [], input: '', status: 'playing', hardMode,
    hardOptOut: false, hardEligible: hardMode, completedAt: null, generation, revision: 0 };
}

export function replaySession(session) {
  let game = createGame(session.answer);
  for (const row of session.guesses) {
    const result = submitGuess({ ...game, hardMode: row.hardMode }, row.word);
    if (!result.ok) throw new TypeError('Saved guess violates game rules.');
    game = result.state;
  }
  return Object.freeze({ ...game, hardMode: session.hardMode });
}

/** Throw for invalid sessions, allowing the document reader to recover each component separately. */
export function validateSession(value, { expired = false } = {}) {
  if (!object(value) || !['daily', 'unlimited'].includes(value.mode)
    || typeof value.id !== 'string' || value.id.length > 120
    || !counter(value.generation) || !counter(value.revision)
    || typeof value.hardMode !== 'boolean' || typeof value.hardOptOut !== 'boolean'
    || value.hardEligible !== (value.hardMode && !value.hardOptOut)
    || typeof value.input !== 'string' || /[^a-z]/.test(value.input) || value.input.length > 5
    || !Array.isArray(value.guesses) || value.guesses.length > 6) throw new TypeError('Invalid session shape.');
  if (value.mode === 'daily') {
    const puzzle = dailyPuzzle(value.day);
    if (value.id !== puzzle.id || value.answer !== puzzle.answer || value.scheduleVersion !== SCHEDULE_VERSION
      || value.generation !== 0) throw new TypeError('Daily schedule identity mismatch.');
  } else if (!/^unlimited:[A-Za-z0-9_-]+$/.test(value.id) || value.day !== null
    || value.scheduleVersion !== null || !answerSet.has(value.answer) || value.generation < 1) {
    throw new TypeError('Unlimited identity mismatch.');
  }
  let previousHard = null;
  let optOutRequired = false;
  const guesses = Array.from(value.guesses, row => {
    if (!object(row) || typeof row.word !== 'string' || !/^[a-z]{5}$/.test(row.word) || row.word.length !== 5
      || typeof row.hardMode !== 'boolean') throw new TypeError('Invalid saved guess.');
    if (previousHard === false && row.hardMode) throw new TypeError('Hard Mode was enabled after a guess.');
    if (previousHard === true && !row.hardMode) optOutRequired = true;
    previousHard = row.hardMode;
    return { word: row.word, hardMode: row.hardMode };
  });
  if (previousHard === false && value.hardMode) throw new TypeError('Hard Mode was enabled too late.');
  if (previousHard === true && !value.hardMode) optOutRequired = true;
  if (optOutRequired && !value.hardOptOut) throw new TypeError('Missing Hard Mode opt-out.');
  const canonical = { id: value.id, mode: value.mode, day: value.day, scheduleVersion: value.scheduleVersion,
    answer: value.answer, guesses, input: value.input, status: value.status,
    hardMode: value.hardMode, hardOptOut: value.hardOptOut, hardEligible: value.hardEligible,
    completedAt: value.completedAt, generation: value.generation, revision: value.revision };
  const game = replaySession(canonical);
  const isExpired = expired && value.mode === 'daily' && value.status === 'expired' && game.status === 'playing';
  if (!isExpired && value.status !== game.status) throw new TypeError('Saved result mismatch.');
  if (value.status === 'playing' || isExpired) {
    if (value.completedAt !== null || (isExpired && value.input !== '')) throw new TypeError('Invalid unfinished session.');
  } else if (!Number.isSafeInteger(value.completedAt) || value.input !== '') throw new TypeError('Invalid completion.');
  return canonical;
}

export function refreshStatistics(document, today) {
  return { ...document, statistics: {
    daily: calculateStatistics(document.completions, 'daily', today),
    unlimited: calculateStatistics(document.completions, 'unlimited', today),
  } };
}

export function createDocument(day = utcDay()) {
  return refreshStatistics({ version: SCHEMA_VERSION, revision: 0, activeMode: 'daily',
    settings: validateSettings(null), daily: createSession({ ...dailyPuzzle(day), mode: 'daily' }),
    unlimited: null, expiredDaily: [], completions: [] }, day);
}

/** Unavailable/unsupported schema has no speculative migration. Recover to a clean document. */
export function decodeDocument(raw, today = utcDay()) {
  const fresh = () => createDocument(today);
  if (raw === null || raw === undefined) return { document: fresh(), status: 'empty' };
  try {
    if (typeof raw !== 'string' || raw.length > MAX_SAVED_LENGTH) throw new TypeError('Oversized or non-text storage.');
    const value = JSON.parse(raw);
    if (!object(value) || value.version !== SCHEMA_VERSION) throw new TypeError('Unsupported storage schema.');
    let recovered = false;
    const session = (input, options) => {
      try { return validateSession(input, options); } catch { recovered = true; return null; }
    };
    const completions = [];
    for (const entry of Array.isArray(value.completions) ? value.completions : []) {
      const valid = session(entry);
      if (valid && ['won', 'lost'].includes(valid.status) && !completions.some(item => item.id === valid.id)) completions.push(valid);
      else recovered = true;
    }
    const settings = validateSettings(value.settings);
    let daily = session(value.daily);
    let unlimited = value.unlimited === null ? null : session(value.unlimited);
    // A ledger entry is authoritative for already-completed puzzle identities.
    daily = completions.find(entry => entry.id === (daily?.id ?? dailyPuzzle(today).id)) ?? daily;
    unlimited = completions.find(entry => entry.id === unlimited?.id) ?? unlimited;
    for (const current of [daily, unlimited]) {
      if (current && ['won', 'lost'].includes(current.status) && !completions.some(entry => entry.id === current.id)) completions.push(current);
    }
    const expiredDaily = [];
    for (const entry of Array.isArray(value.expiredDaily) ? value.expiredDaily : []) {
      const valid = session(entry, { expired: true });
      if (valid?.status === 'expired' && !expiredDaily.some(item => item.id === valid.id)
        && !completions.some(item => item.id === valid.id)) expiredDaily.push(valid);
      else recovered = true;
    }
    const document = refreshStatistics({ version: SCHEMA_VERSION, revision: counter(value.revision) ? value.revision : 0,
      activeMode: value.activeMode === 'unlimited' && unlimited ? 'unlimited' : 'daily',
      settings, daily: daily ?? createSession({ ...dailyPuzzle(today), mode: 'daily' }, settings.hardMode),
      unlimited, expiredDaily, completions }, today);
    return { document, status: recovered ? 'recovered' : 'loaded' };
  } catch { return { document: fresh(), status: 'corrupt' }; }
}

function chooseSession(left, right) {
  if (!left) return right;
  if (!right) return left;
  if (left.id !== right.id) {
    return left.generation !== right.generation ? (left.generation > right.generation ? left : right)
      : (left.id > right.id ? left : right);
  }
  if (left.guesses.length !== right.guesses.length) return left.guesses.length > right.guesses.length ? left : right;
  if (left.revision !== right.revision) return left.revision > right.revision ? left : right;
  return JSON.stringify(left) > JSON.stringify(right) ? left : right;
}

/** Best-effort merge; browser Local Storage has no atomic read/modify/write transaction. */
export function reconcileDocuments(local, remote, today = utcDay()) {
  const completions = [...remote.completions];
  for (const entry of local.completions) {
    const next = recordCompletion(completions, entry);
    if (next !== completions) completions.push(entry);
  }
  const completion = session => completions.find(entry => entry.id === session?.id) ?? session;
  const localDaily = local.daily.day === today ? local.daily : null;
  const remoteDaily = remote.daily.day === today ? remote.daily : null;
  const daily = completion(chooseSession(localDaily, remoteDaily))
    ?? completions.find(entry => entry.mode === 'daily' && entry.day === today)
    ?? createSession({ ...dailyPuzzle(today), mode: 'daily' }, local.settings.hardMode);
  const unlimited = completion(chooseSession(local.unlimited, remote.unlimited));
  const expiredMap = new Map();
  const stale = [local.daily, remote.daily].filter(entry => entry.day !== today && entry.status === 'playing')
    .map(entry => ({ ...entry, status: 'expired', input: '' }));
  for (const entry of [...remote.expiredDaily, ...local.expiredDaily, ...stale]) {
    if (!completions.some(item => item.id === entry.id)) expiredMap.set(entry.id, chooseSession(expiredMap.get(entry.id), entry));
  }
  const preferred = local.revision > remote.revision ? local : local.revision < remote.revision ? remote
    : JSON.stringify(local.settings) >= JSON.stringify(remote.settings) ? local : remote;
  return refreshStatistics({ ...local, revision: Math.max(local.revision, remote.revision),
    daily, unlimited: unlimited ?? null, completions, expiredDaily: [...expiredMap.values()], settings: preferred.settings }, today);
}

export function createStorage({ getStorage = () => globalThis.localStorage, key = STORAGE_KEY } = {}) {
  return {
    load(today) {
      try {
        const storage = getStorage();
        if (!storage) return { document: createDocument(today), status: 'unavailable' };
        return decodeDocument(storage.getItem(key), today);
      } catch { return { document: createDocument(today), status: 'unavailable' }; }
    },
    save(document) {
      try {
        const storage = getStorage();
        if (!storage) return { ok: false, status: 'unavailable' };
        const raw = JSON.stringify(document);
        if (raw.length > MAX_SAVED_LENGTH) return { ok: false, status: 'too-large' };
        storage.setItem(key, raw);
        return { ok: true, status: 'saved' };
      } catch { return { ok: false, status: 'unavailable' }; }
    },
  };
}
