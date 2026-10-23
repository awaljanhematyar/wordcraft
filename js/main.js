/** Persistent coordinator and browser UI bootstrap. Game rules remain in their pure modules. */
import { renderFoundation, createGameUI } from './ui.js';
import { submitGuess } from './game.js';
import { dailyPuzzle, utcDay } from './daily.js';
import { randomAnswer, unlimitedId } from './unlimited.js';
import { updateSettings } from './settings.js';
import { recordCompletion, calculateStatistics } from './statistics.js';
import { createStorage, createSession, replaySession, freezeDocument, refreshStatistics,
  reconcileDocuments, decodeDocument, STORAGE_KEY } from './storage.js';

const increment = value => Math.min(value + 1, Number.MAX_SAFE_INTEGER);

/** Injectable clock/storage/randomness keep all lifecycle behavior testable without browser globals. */
export function createController({ clock = Date.now, storage = createStorage(), randomOptions = {},
  makeId = unlimitedId, onChange = () => {} } = {}) {
  const today = () => utcDay(clock());
  const loaded = storage.load(today());
  let state = loaded.document;
  let storageStatus = loaded.status;
  const emit = message => onChange({ state, message, storageStatus });

  function commit(next, message = '') {
    const day = today();
    next = { ...next, revision: increment(Math.max(state.revision, next.revision)) };
    const latest = storage.load(day);
    if (['loaded', 'recovered'].includes(latest.status)) next = reconcileDocuments(next, latest.document, day);
    state = freezeDocument(refreshStatistics(next, day));
    const result = storage.save(state);
    storageStatus = result.status;
    emit(message);
  }

  function checkDay() {
    const day = today();
    if (state.daily.day === day) {
      state = freezeDocument(refreshStatistics(state, day));
      return false;
    }
    const old = state.daily;
    const expiredDaily = [...state.expiredDaily];
    if (old.status === 'playing') {
      const expired = { ...old, status: 'expired', input: '', revision: increment(old.revision) };
      const index = expiredDaily.findIndex(item => item.id === expired.id);
      if (index < 0) expiredDaily.push(expired); else expiredDaily[index] = expired;
    }
    const daily = state.completions.find(entry => entry.mode === 'daily' && entry.day === day)
      ?? createSession({ ...dailyPuzzle(day), mode: 'daily' }, state.settings.hardMode);
    commit({ ...state, daily, expiredDaily }, 'A new UTC day has started. Your daily puzzle is ready.');
    return true;
  }

  /** Reconcile without writing an echo, so storage events cannot create a write loop. */
  function synchronize(raw) {
    checkDay();
    const incoming = raw === undefined ? storage.load(today()) : decodeDocument(raw, today());
    if (!['loaded', 'recovered'].includes(incoming.status)) return false;
    const next = reconcileDocuments(state, incoming.document, today());
    if (JSON.stringify(next) === JSON.stringify(state)) return false;
    state = freezeDocument(next);
    emit('Progress updated from another tab.');
    return true;
  }

  function prepare() {
    const changed = checkDay();
    synchronize();
    return changed;
  }

  function newUnlimited() {
    prepare();
    const generation = increment(Math.max(state.unlimited?.generation ?? 0,
      ...state.completions.filter(entry => entry.mode === 'unlimited').map(entry => entry.generation), 0));
    let id = makeId();
    if (typeof id !== 'string' || !/^unlimited:[A-Za-z0-9_-]+$/.test(id) || id.length > 100) throw new TypeError('Invalid puzzle ID factory.');
    if (id === state.unlimited?.id || state.completions.some(entry => entry.id === id)) {
      const base = id;
      // At most ledger-size + active + one candidate is needed, even at saturated generations.
      for (let suffix = 0; suffix <= state.completions.length + 1; suffix += 1) {
        id = `${base}-${generation}-${suffix}`;
        if (id !== state.unlimited?.id && !state.completions.some(entry => entry.id === id)) break;
      }
    }
    const answer = randomAnswer(state.unlimited?.answer, randomOptions);
    const unlimited = createSession({ id, mode: 'unlimited', answer }, state.settings.hardMode, generation);
    commit({ ...state, activeMode: 'unlimited', unlimited });
    return { ok: true, session: state.unlimited };
  }

  function selectMode(mode) {
    if (!['daily', 'unlimited'].includes(mode)) throw new TypeError('Unknown game mode.');
    prepare();
    if (mode === 'unlimited' && !state.unlimited) return newUnlimited();
    commit({ ...state, activeMode: mode });
    return { ok: true };
  }

  function setInput(input) {
    if (prepare() && state.activeMode === 'daily') return { ok: false, code: 'day-changed' };
    if (typeof input !== 'string' || /[^A-Za-z]/.test(input) || input.length > 5) return { ok: false, code: 'invalid-input' };
    const current = state[state.activeMode];
    if (!current || current.status !== 'playing') return { ok: false, code: 'game-over' };
    commit({ ...state, [state.activeMode]: { ...current, input: input.toLowerCase(), revision: increment(current.revision) } });
    return { ok: true };
  }

  function guess(input) {
    if (prepare() && state.activeMode === 'daily') {
      return { ok: false, code: 'day-changed', message: 'The daily puzzle changed. Enter a new guess.' };
    }
    const current = state[state.activeMode];
    if (!current) return { ok: false, code: 'no-game', message: 'Start a puzzle first.' };
    const result = submitGuess(replaySession(current), input === undefined ? current.input : input);
    if (!result.ok) return { ok: false, code: result.code, message: result.message, violations: result.violations };
    const complete = result.state.status !== 'playing';
    const session = { ...current, guesses: [...current.guesses, { word: result.state.guesses.at(-1).word, hardMode: current.hardMode }],
      input: '', status: result.state.status, revision: increment(current.revision),
      completedAt: complete ? new Date(clock()).getTime() : null };
    const completions = recordCompletion(state.completions, session);
    commit({ ...state, [state.activeMode]: session, completions });
    return { ok: true, feedback: result.feedback, status: state[state.activeMode].status };
  }

  function setPreferences(patch) {
    prepare();
    const settings = updateSettings(state.settings, patch);
    const current = state[state.activeMode];
    let next = state;
    if (Object.hasOwn(patch, 'hardMode') && current?.status === 'playing') {
      if (settings.hardMode && !current.hardMode && current.guesses.length > 0) {
        return { ok: false, code: 'hard-mode-too-late', message: 'Enable Hard Mode before the first accepted guess.' };
      }
      const hardOptOut = current.hardOptOut || (current.hardMode && !settings.hardMode);
      next = { ...state, [state.activeMode]: { ...current, hardMode: settings.hardMode, hardOptOut,
        hardEligible: settings.hardMode && !hardOptOut, revision: increment(current.revision) } };
    }
    commit({ ...next, settings });
    return { ok: true };
  }

  checkDay();
  // Persist normalization and any recovered completion and statistics together at startup.
  commit(state);
  return Object.freeze({ getState: () => state, getStorageStatus: () => storageStatus,
    getGame: () => replaySession(state[state.activeMode]),
    getStatistics: (mode = state.activeMode) => calculateStatistics(state.completions, mode, today()),
    checkDay, synchronize, selectMode, newUnlimited, setInput, guess, setPreferences });
}

/** Lifecycle wiring only, no Phase 4 keyboard/controls/dialog implementation. */
export function attachLifecycle(controller, { window: win, document: doc,
  setInterval: schedule = globalThis.setInterval, clearInterval: cancel = globalThis.clearInterval } = {}) {
  const resume = () => { controller.checkDay(); controller.synchronize(); };
  const visibility = () => { if (doc.visibilityState === 'visible') resume(); };
  const storage = event => {
    if (event.key === STORAGE_KEY || event.key === null) controller.synchronize(event.newValue);
  };
  win.addEventListener('focus', resume);
  doc.addEventListener('visibilitychange', visibility);
  win.addEventListener('storage', storage);
  const timer = schedule(() => controller.checkDay(), 30_000);
  return () => {
    win.removeEventListener('focus', resume);
    doc.removeEventListener('visibilitychange', visibility);
    win.removeEventListener('storage', storage);
    cancel(timer);
  };
}

export function bootstrap(win, doc) {
  let view;
  const controller = createController({ storage: createStorage({ getStorage: () => win.localStorage }), onChange: change => {
    if (view) view.render(change);
    else {
      const region = doc.querySelector('#announcements');
      if (region && change.message) region.textContent = change.message;
    }
  } });
  // Preserve compatibility with the small Phase 3 bootstrap fixture and minimal embeds.
  if (doc.querySelector('#keyboard')) view = createGameUI({ controller, document: doc, window: win });
  else renderFoundation(doc.querySelector('#board'));
  const detach = attachLifecycle(controller, { window: win, document: doc });
  return { controller, view, dispose() { detach(); view?.dispose(); } };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') bootstrap(window, document);
