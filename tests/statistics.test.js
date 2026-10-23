import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStatistics, recordCompletion } from '../js/statistics.js';
import { createSession } from '../js/storage.js';
import { dailyPuzzle } from '../js/daily.js';
import { finished } from './helpers.js';

const stats = (entries, today = '2026-10-23') => calculateStatistics(entries, 'daily', today);

test('empty statistics have zero counters, percentage, and six distribution buckets', () => {
  assert.deepEqual(stats([]), { gamesPlayed: 0, gamesWon: 0, winPercentage: 0, currentStreak: 0, maximumStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] });
});

test('only completed games enter the ledger and identical IDs cannot count twice', () => {
  const ledger = [];
  assert.equal(recordCompletion(ledger, createSession({ ...dailyPuzzle('2026-10-23'), mode: 'daily' })), ledger);
  const won = finished('2026-10-23');
  const next = recordCompletion(ledger, won);
  assert.equal(next.length, 1);
  assert.equal(ledger.length, 0);
  assert.equal(recordCompletion(next, { ...won, status: 'lost' }), next);
});

test('counts, rounded win percentage, and distribution count wins only', () => {
  const entries = [finished('2026-10-21', { attempts: 2 }), finished('2026-10-22', { status: 'lost' }), finished('2026-10-23', { attempts: 6 })];
  assert.deepEqual(stats(entries), { gamesPlayed: 3, gamesWon: 2, winPercentage: 67, currentStreak: 1, maximumStreak: 1, guessDistribution: [0, 1, 0, 0, 0, 1] });
});

test('consecutive daily wins survive unplayed today, then expire when yesterday is missed', () => {
  const entries = [finished('2026-10-20'), finished('2026-10-21')];
  assert.equal(stats(entries, '2026-10-21').currentStreak, 2);
  assert.equal(stats(entries, '2026-10-22').currentStreak, 2);
  assert.equal(stats(entries, '2026-10-23').currentStreak, 0);
  assert.equal(stats(entries, '2026-10-23').maximumStreak, 2);
});

test('skipped daily dates and losses break streaks; maximum streak stays intact', () => {
  const entries = [finished('2026-10-18'), finished('2026-10-19'), finished('2026-10-21'), finished('2026-10-22', { status: 'lost' }), finished('2026-10-23')];
  assert.equal(stats(entries).currentStreak, 1);
  assert.equal(stats(entries).maximumStreak, 2);
  assert.equal(stats(entries, '2026-10-22').currentStreak, 0);
});

test('daily ordering is chronological, duplicate IDs and future entries do not inflate current streak', () => {
  const day = finished('2026-10-23');
  const entries = [finished('2026-10-24'), day, finished('2026-10-22'), day];
  assert.equal(stats(entries).gamesPlayed, 3);
  assert.equal(stats(entries).currentStreak, 2);
  assert.equal(stats(entries).maximumStreak, 3);
});

test('daily and unlimited counters are independent', () => {
  const entries = [finished('2026-10-23'), finished(null, { mode: 'unlimited' })];
  assert.equal(stats(entries).gamesPlayed, 1);
  assert.equal(calculateStatistics(entries, 'unlimited', '2026-10-23').gamesPlayed, 1);
});

test('unlimited streak counts consecutive completions even across calendar gaps', () => {
  const entries = [
    finished(null, { mode: 'unlimited', id: 'unlimited:c', at: 3 }),
    finished(null, { mode: 'unlimited', id: 'unlimited:a', at: 1 }),
    finished(null, { mode: 'unlimited', id: 'unlimited:b', at: 2, status: 'lost' }),
    finished(null, { mode: 'unlimited', id: 'unlimited:d', at: 999999 }),
  ];
  const result = calculateStatistics(entries, 'unlimited', '2030-01-01');
  assert.equal(result.gamesPlayed, 4);
  assert.equal(result.currentStreak, 2);
  assert.equal(result.maximumStreak, 2);
});

test('equal-time unlimited completions have a deterministic ID tie break', () => {
  const entries = [finished(null, { mode: 'unlimited', id: 'unlimited:b', status: 'lost' }), finished(null, { mode: 'unlimited', id: 'unlimited:a' })];
  assert.equal(calculateStatistics(entries, 'unlimited').currentStreak, 0);
});

test('statistics reject invalid modes and freeze their output', () => {
  assert.throws(() => calculateStatistics([], 'invalid'), TypeError);
  assert.throws(() => stats([]).guessDistribution.push(2), TypeError);
});
