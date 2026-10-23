import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DAY_MS, EPOCH_DAY, SCHEDULE_VERSION, utcDay, dayOrdinal, dailyPuzzle } from '../js/daily.js';
import { DAILY_ANSWERS_V1 } from '../js/daily-answers-v1.js';
import { isAllowedGuess } from '../js/words.js';

test('UTC date follows the instant, not a local timezone label', () => {
  assert.equal(utcDay(new Date('2026-10-24T04:29:59+04:30')), '2026-10-23');
  assert.equal(utcDay(new Date('2026-10-24T04:30:00+04:30')), '2026-10-24');
  assert.equal(utcDay(new Date('2026-10-23T20:00:00-04:00')), '2026-10-24');
  assert.equal(utcDay(Date.UTC(2026, 9, 24)), '2026-10-24');
});

test('all times within a UTC day select the identical puzzle', () => {
  const first = dailyPuzzle(utcDay(Date.UTC(2026, 9, 23)));
  for (const offset of [0, 1, 3600000, DAY_MS - 1]) assert.deepEqual(dailyPuzzle(utcDay(Date.UTC(2026, 9, 23) + offset)), first);
});

test('midnight, leap day, and year changes advance exactly one ordinal', () => {
  for (const [left, right] of [['2026-12-31', '2027-01-01'], ['2028-02-28', '2028-02-29'], ['2028-02-29', '2028-03-01']]) {
    assert.equal(dayOrdinal(right) - dayOrdinal(left), 1);
    assert.notEqual(dailyPuzzle(left).id, dailyPuzzle(right).id);
  }
});

for (const day of ['2026-02-29', '2026-13-01', '2026-00-01', '2026-04-31', '2026-01-00', '2026-1-01', '0001-01-01', '2026-01-01\n', null, 1]) {
  test(`invalid UTC day rejected: ${String(day)}`, () => assert.throws(() => dailyPuzzle(day)));
}
for (const clock of ['2026-10-23', null, {}, NaN, new Date('invalid')]) {
  test(`invalid clock rejected: ${String(clock)}`, () => assert.throws(() => utcDay(clock)));
}

test('v1 frozen data checksum, epoch, permutation, and golden dates cannot drift silently', () => {
  assert.equal(DAILY_ANSWERS_V1.length, 821);
  assert.ok(Object.isFrozen(DAILY_ANSWERS_V1));
  assert.equal(createHash('sha256').update(`${DAILY_ANSWERS_V1.join('\n')}\n`).digest('hex'), '2295b5870b882fa0cb0f3bc162246c18aebceb97398994fd05922513de16c617');
  assert.equal(EPOCH_DAY, Date.UTC(2026, 0, 1) / DAY_MS);
  assert.equal(SCHEDULE_VERSION, 'daily-v1');
  assert.equal(dailyPuzzle('2026-10-23').answer, 'arena');
  assert.ok(DAILY_ANSWERS_V1.every(isAllowedGuess));
});

test('permutation covers all answers once per 821-day cycle, including dates before epoch', () => {
  for (const start of [-821, 0, 821]) {
    const answers = new Set();
    for (let offset = start; offset < start + 821; offset += 1) {
      const day = utcDay((EPOCH_DAY + offset) * DAY_MS);
      answers.add(dailyPuzzle(day).answer);
    }
    assert.equal(answers.size, 821);
  }
});

test('default daily clock produces a valid UTC identity', () => {
  assert.match(dailyPuzzle().id, /^daily-v1:[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
  assert.match(utcDay(), /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
});
