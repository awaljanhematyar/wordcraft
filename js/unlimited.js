import { ANSWERS } from './words.js';

/** Uniform rejection sampling with a bounded fallback. No immediate repeat if alternatives exist. */
export function randomAnswer(previous = null, { answers = ANSWERS, crypto = globalThis.crypto, random = Math.random } = {}) {
  if (!Array.isArray(answers) || answers.length === 0 || new Set(answers).size !== answers.length) {
    throw new TypeError('Provide a nonempty, unique answer array.');
  }
  const previousIndex = answers.indexOf(previous);
  const count = answers.length - (previousIndex >= 0 && answers.length > 1 ? 1 : 0);
  let index;
  try {
    if (crypto?.getRandomValues) {
      const limit = Math.floor(0x100000000 / count) * count;
      const buffer = new Uint32Array(1);
      for (let attempt = 0; attempt < 8; attempt += 1) {
        crypto.getRandomValues(buffer);
        if (buffer[0] < limit) { index = buffer[0] % count; break; }
      }
    }
  } catch { /* Browser crypto may be unavailable. Selection can still continue. */ }
  if (index === undefined) {
    let value;
    try { value = random(); } catch { value = 0.5; }
    if (!Number.isFinite(value) || value < 0 || value >= 1) value = 0.5;
    index = Math.floor(value * count);
  }
  if (answers.length > 1 && previousIndex >= 0 && index >= previousIndex) index += 1;
  return answers[index];
}

let sequence = 0;
/** Browser-local identity only, not a security token. Counter also protects fallback collisions. */
export function unlimitedId() {
  sequence += 1;
  try {
    if (globalThis.crypto?.randomUUID) return `unlimited:${globalThis.crypto.randomUUID()}`;
  } catch { /* Fall through to a local identity. */ }
  return `unlimited:${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
