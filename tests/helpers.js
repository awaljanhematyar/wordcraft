import { createController } from '../js/main.js';
import { createStorage, createSession } from '../js/storage.js';
import { dailyPuzzle } from '../js/daily.js';

export function memoryStorage(initial = null) {
  let raw = initial;
  let writes = 0;
  const target = { getItem: () => raw, setItem: (key, value) => { raw = value; writes += 1; } };
  return { adapter: createStorage({ getStorage: () => target }), target,
    read: () => raw, write: value => { raw = value; }, writes: () => writes };
}

export function harness({ day = '2026-10-23', raw = null, ...options } = {}) {
  let now = new Date(`${day}T12:00:00Z`).getTime();
  let id = 0;
  const memory = memoryStorage(raw);
  const events = [];
  const config = { clock: () => now, storage: memory.adapter, makeId: () => `unlimited:test-${++id}`,
    randomOptions: { crypto: null, random: () => 0 }, onChange: event => events.push(event), ...options };
  const controller = createController(config);
  return { controller, memory, events, config, setTime: value => { now = new Date(value).getTime(); },
    reload: () => createController(config) };
}

export function finished(day, { mode = 'daily', status = 'won', attempts = 1, id = 'unlimited:fixture', at = 100 } = {}) {
  const puzzle = mode === 'daily' ? { ...dailyPuzzle(day), mode } : { id, mode, answer: 'apple' };
  const session = createSession(puzzle, false, mode === 'unlimited' ? 1 : 0);
  const wrong = session.answer === 'hello' ? 'craft' : 'hello';
  session.guesses = Array.from({ length: status === 'lost' ? 6 : attempts }, (_, i) => ({
    word: status === 'won' && i === attempts - 1 ? session.answer : wrong, hardMode: false,
  }));
  session.status = status;
  session.completedAt = at;
  session.revision = session.guesses.length;
  return session;
}
