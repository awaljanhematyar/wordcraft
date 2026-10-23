import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveConstraints, validateHardMode } from '../js/hard-mode.js';
import { scoreGuess } from '../js/game.js';
const row = (word, pattern) => ({ word, feedback: [...pattern].map(x => ({ G: 'correct', Y: 'present', X: 'absent' })[x]) });
const codes = result => result.violations.map(x => x.code);

test('empty history permits any well-formed word', () => {
  assert.equal(validateHardMode('craft').valid, true);
  assert.deepEqual(deriveConstraints().greens, [null, null, null, null, null]);
});

test('green clues fix each known position', () => {
  const history = [row('crane', 'GXXXX')];
  const failure = validateHardMode('block', history);
  assert.ok(codes(failure).includes('green-position'));
  assert.equal(failure.violations.find(v => v.code === 'green-position').position, 0);
  assert.equal(validateHardMode('cloth', history).valid, true);
});

test('yellow clues must be used and moved', () => {
  const history = [row('abcde', 'YXXXX')];
  assert.ok(codes(validateHardMode('xxxxx', history)).includes('minimum-count'));
  assert.ok(codes(validateHardMode('axxxx', history)).includes('excluded-position'));
  assert.equal(validateHardMode('xaxxx', history).valid, true);
});

test('excess gray duplicates infer exact positive count and gray positions are excluded', () => {
  const history = [row('allee', 'GYXXG')];
  const constraints = deriveConstraints(history);
  assert.equal(constraints.minimum.l, 1);
  assert.equal(constraints.maximum.l, 1);
  assert.equal(constraints.minimum.e, 1);
  assert.equal(constraints.maximum.e, 1);
  assert.equal(validateHardMode('apple', history).valid, true);
  assert.ok(codes(validateHardMode('algle', history)).includes('maximum-count'));
  assert.ok(codes(validateHardMode('aplle', history)).includes('excluded-position'));
  assert.ok(codes(validateHardMode('apexe', history)).includes('maximum-count'));
});

test('two yellow copies set minimum two, rather than minimum one', () => {
  const history = [row('eerie', 'YYXXX')];
  assert.equal(deriveConstraints(history).minimum.e, 2);
  assert.equal(deriveConstraints(history).maximum.e, 2);
  assert.ok(codes(validateHardMode('xxexx', history)).includes('minimum-count'));
  assert.ok(codes(validateHardMode('xxeee', history)).includes('maximum-count'));
  assert.equal(validateHardMode('xxeex', history).valid, true);
});

test('mixed green and yellow counts combine into minimum two without a false upper bound', () => {
  const history = [row('eerie', 'GYXXX')];
  assert.equal(deriveConstraints(history).minimum.e, 2);
  assert.equal(deriveConstraints(history).maximum.e, 2);
  const allPositive = [row('eabcd', 'YYXXX')];
  assert.equal(deriveConstraints(allPositive).maximum.e, undefined);
  assert.equal(validateHardMode('xeeea', allPositive).valid, true);
});

test('gray-only letters have maximum zero', () => {
  const history = [row('crane', 'XXXXX')];
  assert.equal(deriveConstraints(history).maximum.c, 0);
  const failure = validateHardMode('civic', history);
  assert.ok(failure.violations.some(v => v.code === 'maximum-count' && v.letter === 'c' && v.count === 0));
  assert.equal(validateHardMode('blush', history).valid, true);
});

test('all previous rows contribute constraints, not just the most recent one', () => {
  const history = [row('crane', 'XXXXG'), row('build', 'XXXYX')];
  assert.equal(validateHardMode('slope', history).valid, true);
  assert.ok(codes(validateHardMode('story', history)).includes('green-position'));
  assert.ok(codes(validateHardMode('stoke', history)).includes('minimum-count'));
  assert.equal(deriveConstraints(history).maximum.r, 0);
});

test('constraints tighten minimum and maximum across rows', () => {
  const history = [row('abbbb', 'YXXXX'), row('aaxxx', 'YGXXX'), row('aaaax', 'XGXGX')];
  const constraints = deriveConstraints(history);
  assert.equal(constraints.minimum.a, 2);
  assert.equal(constraints.maximum.a, 2);
});

test('constraint output and input history remain immutable', () => {
  const history = [row('allee', 'GYXXG')];
  const before = JSON.stringify(history);
  const result = deriveConstraints(history);
  assert.throws(() => result.minimum.l = 0, TypeError);
  assert.throws(() => result.excluded[1].push('p'), TypeError);
  validateHardMode('apple', history);
  assert.equal(JSON.stringify(history), before);
});

for (const bad of [null, {}, [null], [row('abcd', 'XXXXX')], [row('abcde\n', 'XXXXX')], [{ word: 'abcde', feedback: ['correct'] }], [{ word: 'abcde', feedback: Array(5).fill('blue') }], Array(7).fill(row('abcde', 'XXXXX'))]) {
  test(`malformed history rejected: ${JSON.stringify(bad)}`, () => assert.throws(() => deriveConstraints(bad), TypeError));
}

test('conflicting histories fail explicitly', () => {
  assert.throws(() => deriveConstraints([row('abcde', 'GXXXX'), row('fghij', 'GXXXX')]), RangeError);
  assert.throws(() => deriveConstraints([row('abcde', 'YXXXX'), row('axyzw', 'XXXXX')]), RangeError);
  assert.throws(() => deriveConstraints([row('abcde', 'YXXXX'), row('axyzw', 'GXXXX')]), RangeError);
});

test('malformed candidates return a clear format violation', () => {
  for (const word of [null, 12345, 'CRAFT', 'four', 'a-bcd', 'craft\n']) {
    const result = validateHardMode(word);
    assert.equal(result.valid, false);
    assert.equal(result.violations[0].code, 'format');
  }
});

test('all 32,768 binary candidate/guess/answer triples preserve exactly the revealed feedback', () => {
  const words = Array.from({ length: 32 }, (_, n) => n.toString(2).padStart(5, '0').replaceAll('0', 'a').replaceAll('1', 'b'));
  for (const answer of words) for (const guess of words) {
    const feedback = scoreGuess(guess, answer);
    const history = [{ word: guess, feedback }];
    for (const candidate of words) {
      const same = JSON.stringify(scoreGuess(guess, candidate)) === JSON.stringify(feedback);
      assert.equal(validateHardMode(candidate, history).valid, same, `${guess}/${answer}/${candidate}`);
    }
  }
});

test('real answer always obeys multiple accumulated clue rows, including duplicate letters', () => {
  for (const answer of ['apple', 'eerie', 'level', 'sissy', 'cacao', 'array', 'teeth']) {
    const history = [];
    for (const guess of ['allee', 'eagle', 'belle', 'sassy', 'teeth']) {
      history.push({ word: guess, feedback: scoreGuess(guess, answer) });
      assert.equal(validateHardMode(answer, history).valid, true, `${answer}/${guess}`);
    }
  }
});
