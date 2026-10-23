import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ALLOWED_GUESSES, ANSWERS, DICTIONARY_VERSION, normalizeWord, isAllowedGuess } from '../js/words.js';
const manifest = JSON.parse(readFileSync(new URL('../assets/WORD_LIST_MANIFEST.json', import.meta.url), 'utf8'));
const digest = value => createHash('sha256').update(value).digest('hex');

test('dictionary and curated answers are separate, nonempty, frozen lists', () => {
  assert.notEqual(ALLOWED_GUESSES, ANSWERS);
  assert.ok(ALLOWED_GUESSES.length > 10000);
  assert.ok(ANSWERS.length > 500);
  assert.ok(ANSWERS.length < ALLOWED_GUESSES.length);
  assert.ok(Object.isFrozen(ALLOWED_GUESSES));
  assert.ok(Object.isFrozen(ANSWERS));
  assert.throws(() => ALLOWED_GUESSES.push('zzzzz'), TypeError);
});

test('every word is five lowercase ASCII letters with no duplicates and sorted ordering', () => {
  for (const words of [ALLOWED_GUESSES, ANSWERS]) {
    assert.ok(words.every(word => /^[a-z]{5}$/.test(word)));
    assert.equal(new Set(words).size, words.length);
    assert.deepEqual([...words].sort(), words);
  }
});

test('every curated answer is an allowed guess', () => {
  for (const word of ANSWERS) assert.equal(isAllowedGuess(word), true, word);
});

test('normalization handles case and padding without inventing ASCII words from Unicode', () => {
  assert.equal(normalizeWord(' ApPlE\n'), 'apple');
  for (const word of [null, undefined, {}, [], 12345, '', 'abcd', 'abcdef', 'ab cd', 'caféx', 'Kraft', 'ſtore', 'Ａpple', 'ab-cd', 'a1bcd']) {
    assert.equal(normalizeWord(word), null);
    assert.equal(isAllowedGuess(word), false);
  }
});

test('membership lookup is case insensitive and includes broad guesses outside the answer subset', () => {
  assert.equal(isAllowedGuess(' APPLE '), true);
  assert.equal(isAllowedGuess('zzzzz'), false);
  const broadOnly = ALLOWED_GUESSES.find(word => !ANSWERS.includes(word));
  assert.ok(broadOnly);
  assert.equal(isAllowedGuess(broadOnly), true);
});

test('derived lists match pinned counts, versions, and checksums', () => {
  assert.equal(ALLOWED_GUESSES.length, manifest.allowed_count);
  assert.equal(ANSWERS.length, manifest.answers_count);
  assert.equal(DICTIONARY_VERSION, manifest.dictionary_version);
  assert.equal(digest(`${ALLOWED_GUESSES.join('\n')}\n`), manifest.allowed_sha256);
  assert.equal(digest(`${ANSWERS.join('\n')}\n`), manifest.answers_sha256);
  assert.match(manifest.revision, /^[0-9a-f]{40}$/);
});

test('unmodified upstream MIT notice is bundled with the data', () => {
  const license = readFileSync(new URL('../assets/WORDNIK_LICENSE.txt', import.meta.url));
  assert.equal(digest(license), manifest.license_sha256);
  assert.match(license.toString(), /Copyright \(c\) 2020 Wordnik/);
  assert.match(license.toString(), /permission notice shall be included/);
  assert.equal(manifest.license, 'MIT');
});
