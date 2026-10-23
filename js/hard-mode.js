/** Pure clue constraints. Feedback vocabulary: correct (green), present (yellow), absent (gray). */
const WORD = /^[a-z]{5}$/;
const STATES = ['correct', 'present', 'absent'];

/** Derive only from revealed rows, never from the secret answer. Positions are zero-based. */
export function deriveConstraints(history = []) {
  if (!Array.isArray(history) || history.length > 6) throw new TypeError('History must contain at most six rows.');
  const greens = Array(5).fill(null);
  const excluded = Array.from({ length: 5 }, () => new Set());
  const minimum = {};
  const maximum = {};
  for (const row of history) {
    if (!row || typeof row.word !== 'string' || row.word.length !== 5 || !WORD.test(row.word)
      || !Array.isArray(row.feedback) || row.feedback.length !== 5
      || Array.from(row.feedback).some(value => !STATES.includes(value))) {
      throw new TypeError('Each history row needs a lowercase five-letter word and five feedback states.');
    }
    const positive = {};
    const total = {};
    for (let i = 0; i < 5; i += 1) {
      const letter = row.word[i];
      total[letter] = (total[letter] ?? 0) + 1;
      if (row.feedback[i] !== 'absent') positive[letter] = (positive[letter] ?? 0) + 1;
      if (row.feedback[i] === 'correct') {
        if (greens[i] && greens[i] !== letter) throw new RangeError('Conflicting green clues.');
        greens[i] = letter;
      } else {
        // Gray duplicates also rule out this position, even when another copy is positive.
        excluded[i].add(letter);
      }
    }
    for (const letter of Object.keys(total)) {
      const count = positive[letter] ?? 0;
      minimum[letter] = Math.max(minimum[letter] ?? 0, count);
      if (count < total[letter]) maximum[letter] = Math.min(maximum[letter] ?? 5, count);
    }
  }
  for (const letter of Object.keys(minimum)) {
    if (minimum[letter] > (maximum[letter] ?? 5)) throw new RangeError('Conflicting letter counts.');
  }
  if (greens.some((letter, index) => letter && excluded[index].has(letter))) {
    throw new RangeError('Conflicting position clues.');
  }
  return Object.freeze({
    greens: Object.freeze(greens),
    excluded: Object.freeze(excluded.map(letters => Object.freeze([...letters].sort()))),
    minimum: Object.freeze(minimum), maximum: Object.freeze(maximum),
  });
}

/** Returns all violations in stable order. Dictionary membership is handled by game.js. */
export function validateHardMode(word, history = []) {
  if (typeof word !== 'string' || word.length !== 5 || !WORD.test(word)) {
    return { valid: false, violations: [{ code: 'format', message: 'Use exactly five lowercase English letters.' }] };
  }
  const constraints = deriveConstraints(history);
  const violations = [];
  const counts = {};
  for (const letter of word) counts[letter] = (counts[letter] ?? 0) + 1;
  for (let i = 0; i < 5; i += 1) {
    const green = constraints.greens[i];
    if (green && word[i] !== green) {
      violations.push({ code: 'green-position', letter: green, position: i,
        message: `Keep ${green.toUpperCase()} in position ${i + 1}.` });
    }
    if (constraints.excluded[i].includes(word[i])) {
      violations.push({ code: 'excluded-position', letter: word[i], position: i,
        message: `${word[i].toUpperCase()} cannot go in position ${i + 1}.` });
    }
  }
  for (const [letter, count] of Object.entries(constraints.minimum)) {
    if ((counts[letter] ?? 0) < count) violations.push({ code: 'minimum-count', letter, count,
      message: `Use at least ${count} ${letter.toUpperCase()}${count === 1 ? '' : "'s"}.` });
  }
  for (const [letter, count] of Object.entries(constraints.maximum)) {
    if ((counts[letter] ?? 0) > count) violations.push({ code: 'maximum-count', letter, count,
      message: count === 0 ? `Do not use ${letter.toUpperCase()}.`
        : `Use at most ${count} ${letter.toUpperCase()}${count === 1 ? '' : "'s"}.` });
  }
  return { valid: violations.length === 0, violations };
}
