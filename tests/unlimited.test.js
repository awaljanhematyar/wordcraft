import test from 'node:test';
import assert from 'node:assert/strict';
import { randomAnswer, unlimitedId } from '../js/unlimited.js';
import { ANSWERS } from '../js/words.js';
const answers = ['apple', 'craft', 'hello'];
const options = (value, extra = {}) => ({ answers, crypto: null, random: () => value, ...extra });

test('fallback random selection reaches every candidate and both endpoints', () => {
  assert.deepEqual([0, 0.4, 0.999999].map(value => randomAnswer(null, options(value))), answers);
});

test('immediate repetition is avoided at each position without a retry loop', () => {
  for (const prior of answers) for (const number of [0, 0.49, 0.9999]) assert.notEqual(randomAnswer(prior, options(number)), prior);
});

test('single candidate is allowed to repeat because no alternative exists', () => {
  assert.equal(randomAnswer('apple', { ...options(0), answers: ['apple'] }), 'apple');
});

test('crypto selection takes precedence over fallback', () => {
  let fallbackCalled = false;
  assert.equal(randomAnswer(null, options(0, { crypto: { getRandomValues: buffer => { buffer[0] = 2; } },
    random: () => { fallbackCalled = true; return 0; } })), 'hello');
  assert.equal(fallbackCalled, false);
});

test('rejection sampling discards biased top values before accepting', () => {
  let calls = 0;
  const crypto = { getRandomValues: buffer => { buffer[0] = ++calls === 1 ? 0xffffffff : 1; } };
  assert.equal(randomAnswer(null, options(0, { crypto })), 'craft');
  assert.equal(calls, 2);
});

test('crypto rejection fallback is bounded at eight attempts', () => {
  let calls = 0;
  const crypto = { getRandomValues: buffer => { calls += 1; buffer[0] = 0xffffffff; } };
  assert.equal(randomAnswer(null, options(0, { crypto })), 'apple');
  assert.equal(calls, 8);
});

test('crypto errors and invalid or throwing fallback providers still return a valid answer', () => {
  const crypto = { getRandomValues: () => { throw new Error('blocked'); } };
  for (const value of [NaN, Infinity, -1, 1, undefined]) assert.equal(randomAnswer(null, options(value, { crypto })), 'craft');
  assert.equal(randomAnswer(null, options(0, { crypto, random: () => { throw new Error('failed'); } })), 'craft');
});

test('missing crypto method uses the bounded numeric fallback', () => {
  assert.equal(randomAnswer(null, options(0, { crypto: {} })), 'apple');
});

for (const list of [[], null, ['apple', 'apple']]) {
  test(`invalid candidate list rejected: ${JSON.stringify(list)}`, () => assert.throws(() => randomAnswer(null, { answers: list }), TypeError));
}

test('default random selection uses an allowed answer', () => assert.ok(ANSWERS.includes(randomAnswer())));

test('generated unlimited IDs are distinct and persistence-safe', () => {
  const ids = new Set(Array.from({ length: 30 }, () => unlimitedId()));
  assert.equal(ids.size, 30);
  for (const id of ids) assert.match(id, /^unlimited:[A-Za-z0-9_-]+$/);
});

test('ID fallback remains distinct when crypto is unavailable or throws', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    for (const crypto of [undefined, { randomUUID: () => { throw new Error('blocked'); } }]) {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: crypto });
      assert.notEqual(unlimitedId(), unlimitedId());
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor); else delete globalThis.crypto;
  }
});
