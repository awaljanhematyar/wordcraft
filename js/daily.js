/** UTC-only, deterministic v1 daily schedule. Never substitute the current ANSWERS list. */
import { DAILY_ANSWERS_V1 } from './daily-answers-v1.js';
export const DAY_MS = 86_400_000;
export const SCHEDULE_VERSION = 'daily-v1';
export const EPOCH_DAY = Date.UTC(2026, 0, 1) / DAY_MS;

export function dayOrdinal(day) {
  if (typeof day !== 'string' || !/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(day) || day.length !== 10) {
    throw new TypeError('Use a valid YYYY-MM-DD UTC date.');
  }
  const [year, month, date] = day.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, date);
  if (new Date(timestamp).toISOString().slice(0, 10) !== day) throw new RangeError('Invalid calendar date.');
  return timestamp / DAY_MS;
}

export function utcDay(now = new Date()) {
  if (!(now instanceof Date) && typeof now !== 'number') throw new TypeError('Clock must return a Date or timestamp.');
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid clock.');
  const day = date.toISOString().slice(0, 10);
  dayOrdinal(day);
  return day;
}

export function dailyPuzzle(day = utcDay()) {
  const offset = dayOrdinal(day) - EPOCH_DAY;
  // 317 is coprime to 821. This affine permutation visits every v1 answer once per cycle.
  const count = DAILY_ANSWERS_V1.length;
  const index = ((offset * 317 + 113) % count + count) % count;
  return Object.freeze({ id: `${SCHEDULE_VERSION}:${day}`, day, answer: DAILY_ANSWERS_V1[index], scheduleVersion: SCHEDULE_VERSION });
}
