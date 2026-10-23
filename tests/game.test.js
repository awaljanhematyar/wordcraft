import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreGuess, validateWord, createGame, submitGuess, getKeyboardState, MAX_ATTEMPTS, WORD_LENGTH } from '../js/game.js';

const translate = value => [...value].map(letter => ({ G: 'correct', Y: 'present', X: 'absent' })[letter]);
const fixtures = [
  ['craft', 'craft', 'GGGGG'],
  ['nymph', 'eerie', 'XXXXX'],
  ['abcde', 'eabcd', 'YYYYY'],
  ['allee', 'apple', 'GYXXG'],
  ['eerie', 'serve', 'XGGXG'],
  ['sassy', 'sissy', 'GXGGG'],
  ['aaaaa', 'cacao', 'XGXGX'],
  ['cacao', 'aaaaa', 'XGXGX'],
  ['belle', 'level', 'XGYYY'],
  ['array', 'rarer', 'YYGXX'],
  ['teeth', 'ether', 'YYYXY'],
  ['eagle', 'allee', 'YYXYG'],
  ['apple', 'allee', 'GXXYG'],
  ['babbb', 'abbey', 'YYGXX'],
];
for (const [guess, answer, expected] of fixtures) {
  test(`hand-checked scoring ${guess} against ${answer}`, () => {
    assert.deepEqual(scoreGuess(guess, answer), translate(expected));
  });
}

test('scoring normalizes ASCII case and outer whitespace', () => {
  assert.deepEqual(scoreGuess(' CRAFT ', 'craft'), translate('GGGGG'));
});
for (const invalid of [null, undefined, 12345, {}, [], 'four', 'longer', 'caféx', 'a-bcd', '12345', 'ab cd', 'Kraft']) {
  test(`scoring rejects malformed input ${String(invalid)}`, () => {
    assert.throws(() => scoreGuess(invalid, 'craft'), TypeError);
    assert.throws(() => scoreGuess('craft', invalid), TypeError);
  });
}

test('exhaustive scoring invariants for all 59,049 pairs over a three-letter alphabet', () => {
  const words = Array.from({ length: 243 }, (_, number) => {
    let value = number;
    return Array.from({ length: 5 }, () => { const letter = 'abc'[value % 3]; value = Math.floor(value / 3); return letter; }).join('');
  });
  for (const answer of words) for (const guess of words) {
    const result = scoreGuess(guess, answer);
    for (let i = 0; i < 5; i += 1) assert.equal(result[i] === 'correct', guess[i] === answer[i]);
    for (const letter of 'abc') {
      const positive = [...guess].filter((value, index) => value === letter && result[index] !== 'absent').length;
      assert.equal(positive, Math.min([...guess].filter(x => x === letter).length, [...answer].filter(x => x === letter).length));
      // Once green copies are removed, earlier copies receive available yellow slots first.
      const nongreen = [...guess].map((x, i) => x === letter && result[i] !== 'correct' ? result[i] : null).filter(Boolean);
      assert.ok(!nongreen.some((state, i) => state === 'present' && nongreen.slice(0, i).includes('absent')));
    }
  }
});

test('validation distinguishes format and dictionary errors', () => {
  assert.deepEqual(validateWord(' CRAFT '), { valid: true, word: 'craft', code: null, message: '' });
  assert.equal(validateWord('zzzzz').code, 'unknown-word');
  assert.equal(validateWord('four').code, 'invalid-format');
  assert.equal(validateWord('Kraft').code, 'invalid-format');
  assert.equal(validateWord('abcde', new Set(['abcde'])).valid, true);
  assert.equal(validateWord('abcde', ['abcde']).valid, true);
  assert.equal(validateWord('craft', []).valid, false);
});

test('new game has five letters, six attempts, immutable empty history', () => {
  const state = createGame(' CRAFT ');
  assert.equal(WORD_LENGTH, 5);
  assert.equal(MAX_ATTEMPTS, 6);
  assert.equal(state.answer, 'craft');
  assert.equal(state.status, 'playing');
  assert.equal(state.hardMode, false);
  assert.deepEqual(state.guesses, []);
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.guesses));
  assert.throws(() => state.guesses.push('hello'), TypeError);
});

test('invalid answers and non-boolean hard mode are rejected', () => {
  for (const answer of ['zzzzz', 'abc', undefined]) assert.throws(() => createGame(answer), TypeError);
  assert.throws(() => createGame('craft', { hardMode: 'true' }), TypeError);
});

test('invalid guesses leave the same state and consume no attempt', () => {
  const state = createGame('craft');
  for (const word of ['', 'four', 'zzzzz', null, 'a-bcd']) {
    const result = submitGuess(state, word);
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
    assert.equal(state.guesses.length, 0);
    assert.ok(result.message.length > 0);
  }
});

test('accepted guess creates a new immutable history without mutating old state', () => {
  const initial = createGame('apple');
  const result = submitGuess(initial, ' ALLEE ');
  assert.equal(result.ok, true);
  assert.deepEqual(result.feedback, translate('GYXXG'));
  assert.equal(result.state.guesses[0].word, 'allee');
  assert.equal(initial.guesses.length, 0);
  assert.notEqual(result.state, initial);
  assert.ok(Object.isFrozen(result.state.guesses[0]));
  assert.ok(Object.isFrozen(result.feedback));
});

for (let winningAttempt = 1; winningAttempt <= 6; winningAttempt += 1) {
  test(`winning on attempt ${winningAttempt} terminates the game`, () => {
    let state = createGame('craft');
    for (let i = 1; i < winningAttempt; i += 1) state = submitGuess(state, 'hello').state;
    state = submitGuess(state, 'craft').state;
    assert.equal(state.status, 'won');
    assert.equal(state.guesses.length, winningAttempt);
    const retry = submitGuess(state, 'hello');
    assert.equal(retry.ok, false);
    assert.equal(retry.code, 'game-over');
    assert.equal(retry.state, state);
  });
}

test('six incorrect accepted guesses lose, seventh guess is blocked', () => {
  let state = createGame('craft');
  for (let i = 1; i <= 6; i += 1) {
    state = submitGuess(state, 'hello').state;
    assert.equal(state.status, i === 6 ? 'lost' : 'playing');
  }
  const result = submitGuess(state, 'craft');
  assert.equal(result.ok, false);
  assert.equal(result.state, state);
  assert.equal(state.guesses.length, 6);
});

test('hard-mode violation returns a message and does not consume an attempt', () => {
  const first = submitGuess(createGame('apple', { hardMode: true }), 'allee').state;
  const failed = submitGuess(first, 'abide');
  assert.equal(failed.ok, false);
  assert.equal(failed.code, 'hard-mode');
  assert.equal(failed.state, first);
  assert.ok(failed.message.includes('L'));
  assert.equal(submitGuess(first, 'apple').state.status, 'won');
});

test('normal mode does not enforce revealed hints', () => {
  const first = submitGuess(createGame('apple'), 'allee').state;
  assert.equal(submitGuess(first, 'abide').ok, true);
});

test('keyboard keeps the best clue for repeated letters across and within guesses', () => {
  const rows = [{ word: 'allee', feedback: translate('GYXXG') }, { word: 'eerie', feedback: translate('XXXXX') }];
  const keys = getKeyboardState(rows);
  assert.equal(keys.a, 'correct');
  assert.equal(keys.l, 'present');
  assert.equal(keys.e, 'correct');
  assert.equal(keys.r, 'absent');
  assert.deepEqual(getKeyboardState([]), {});
});
