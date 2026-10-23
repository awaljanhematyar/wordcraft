/** Pure game engine. No DOM, time, randomness, storage, or other side effects. */
import { ALLOWED_GUESSES, isAllowedGuess, normalizeWord } from './words.js';
import { validateHardMode } from './hard-mode.js';

export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;
export const FEEDBACK = Object.freeze({ CORRECT: 'correct', PRESENT: 'present', ABSENT: 'absent' });

/** Normalize case/outer whitespace, reject everything except five ASCII letters, then check membership. */
export function validateWord(input, allowedGuesses = ALLOWED_GUESSES) {
  const word = normalizeWord(input);
  if (word === null) return { valid: false, word: null, code: 'invalid-format', message: 'Enter exactly five English letters.' };
  const allowed = allowedGuesses === ALLOWED_GUESSES ? isAllowedGuess(word)
    : allowedGuesses instanceof Set ? allowedGuesses.has(word) : allowedGuesses.includes(word);
  if (!allowed) return { valid: false, word, code: 'unknown-word', message: 'That word is not in the dictionary.' };
  return { valid: true, word, code: null, message: '' };
}

/** Score greens first, then consume the remaining answer counts for yellows left to right. */
export function scoreGuess(guess, answer) {
  const word = normalizeWord(guess);
  const target = normalizeWord(answer);
  if (word === null || target === null) throw new TypeError('Scoring requires two five-letter English words.');
  const feedback = Array(WORD_LENGTH).fill(FEEDBACK.ABSENT);
  const remaining = {};
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (word[i] === target[i]) feedback[i] = FEEDBACK.CORRECT;
    else remaining[target[i]] = (remaining[target[i]] ?? 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (feedback[i] !== FEEDBACK.CORRECT && (remaining[word[i]] ?? 0) > 0) {
      feedback[i] = FEEDBACK.PRESENT;
      remaining[word[i]] -= 1;
    }
  }
  return Object.freeze(feedback);
}

/** State is immutable. Later persistence must restore by replaying validated guesses. */
export function createGame(answer, { hardMode = false, allowedGuesses = ALLOWED_GUESSES } = {}) {
  const result = validateWord(answer, allowedGuesses);
  if (!result.valid) throw new TypeError('The answer must be a valid allowed word.');
  if (typeof hardMode !== 'boolean') throw new TypeError('hardMode must be a boolean.');
  return Object.freeze({ answer: result.word, hardMode, guesses: Object.freeze([]), status: 'playing' });
}

/** Failed validation preserves the exact previous state and never consumes an attempt. */
export function submitGuess(state, input, allowedGuesses = ALLOWED_GUESSES) {
  if (state.status !== 'playing') return { ok: false, state, code: 'game-over', message: 'This puzzle is complete.' };
  const result = validateWord(input, allowedGuesses);
  if (!result.valid) return { ok: false, state, code: result.code, message: result.message };
  if (state.hardMode) {
    const hard = validateHardMode(result.word, state.guesses);
    if (!hard.valid) return { ok: false, state, code: 'hard-mode', message: hard.violations[0].message, violations: hard.violations };
  }
  const feedback = scoreGuess(result.word, state.answer);
  const guesses = Object.freeze([...state.guesses, Object.freeze({ word: result.word, feedback })]);
  const status = result.word === state.answer ? 'won' : guesses.length === MAX_ATTEMPTS ? 'lost' : 'playing';
  return { ok: true, code: null, message: '', feedback,
    state: Object.freeze({ ...state, guesses, status }) };
}

/** Best revealed state per letter. A later gray/yellow cannot downgrade a green. */
export function getKeyboardState(history) {
  const ranks = { absent: 1, present: 2, correct: 3 };
  const keys = {};
  for (const { word, feedback } of history) {
    for (let i = 0; i < WORD_LENGTH; i += 1) {
      if ((ranks[feedback[i]] ?? 0) > (ranks[keys[word[i]]] ?? 0)) keys[word[i]] = feedback[i];
    }
  }
  return Object.freeze(keys);
}
