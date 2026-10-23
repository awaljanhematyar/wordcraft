import { dayOrdinal, utcDay } from './daily.js';

/** Completion ID is the accounting key. First committed result wins any duplicate conflict. */
export function recordCompletion(ledger, session) {
  if (!['won', 'lost'].includes(session.status)) return ledger;
  if (ledger.some(entry => entry.id === session.id)) return ledger;
  return [...ledger, session];
}

/** Statistics are a projection of the validated completion ledger, never trusted saved counters. */
export function calculateStatistics(ledger, mode, today = utcDay()) {
  if (!['daily', 'unlimited'].includes(mode)) throw new TypeError('Unknown statistics mode.');
  const todayOrdinal = dayOrdinal(today);
  const seen = new Set();
  const entries = ledger.filter(entry => entry.mode === mode && ['won', 'lost'].includes(entry.status)
    && !seen.has(entry.id) && seen.add(entry.id));
  const sorted = [...entries].sort(mode === 'daily'
    ? (a, b) => a.day.localeCompare(b.day)
    : (a, b) => a.generation - b.generation || a.completedAt - b.completedAt || a.id.localeCompare(b.id));
  const distribution = [0, 0, 0, 0, 0, 0];
  let wins = 0;
  let streak = 0;
  let maximumStreak = 0;
  let previousDay = null;
  for (const entry of sorted) {
    const day = mode === 'daily' ? dayOrdinal(entry.day) : null;
    if (mode === 'daily' && previousDay !== null && day !== previousDay + 1) streak = 0;
    if (entry.status === 'won') {
      wins += 1;
      distribution[entry.guesses.length - 1] += 1;
      streak += 1;
      maximumStreak = Math.max(maximumStreak, streak);
    } else streak = 0;
    previousDay = day;
  }
  if (mode === 'daily') {
    // A still-unplayed today preserves yesterday's streak, but a missed earlier day does not.
    const recent = sorted.filter(entry => dayOrdinal(entry.day) <= todayOrdinal);
    streak = 0;
    let expected = todayOrdinal;
    if (recent.length && dayOrdinal(recent.at(-1).day) === todayOrdinal - 1) expected -= 1;
    for (let i = recent.length - 1; i >= 0; i -= 1) {
      if (recent[i].status !== 'won' || dayOrdinal(recent[i].day) !== expected) break;
      streak += 1;
      expected -= 1;
    }
  }
  return Object.freeze({ gamesPlayed: entries.length, gamesWon: wins,
    winPercentage: entries.length ? Math.round(wins / entries.length * 100) : 0,
    currentStreak: streak, maximumStreak, guessDistribution: Object.freeze(distribution) });
}
