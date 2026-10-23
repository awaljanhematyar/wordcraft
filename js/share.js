/** Share only public puzzle metadata and scored emoji, never the answer or guessed words. */
import { scoreGuess } from './game.js';
const EMOJI = Object.freeze({ correct: '🟩', present: '🟨', absent: '⬛' });
export function createShareText(session) {
  if (!session || !['won', 'lost'].includes(session.status) || session.guesses.length < 1 || session.guesses.length > 6) {
    throw new TypeError('Finish a puzzle before sharing.');
  }
  const mode = session.mode === 'daily' ? `Daily ${session.day} (${session.scheduleVersion})` : `Unlimited ${session.id}`;
  const count = session.status === 'won' ? session.guesses.length : 'X';
  const grid = session.guesses.map(row => scoreGuess(row.word, session.answer).map(state => EMOJI[state]).join('')).join('\n');
  return `WordCraft\n${mode}\n${count}/6${session.hardEligible ? '*' : ''}\n\n${grid}`;
}

/** Call directly from a user gesture. Fallback selects a visible, readonly text field for manual copy. */
export async function copyResult(text, { navigator, showManual }) {
  try {
    if (!navigator?.clipboard?.writeText) throw new Error('Clipboard unavailable.');
    await navigator.clipboard.writeText(text);
    return { copied: true, message: 'Result copied. Your answer stays private.' };
  } catch {
    showManual(text);
    return { copied: false, message: 'Automatic copy unavailable. The result text is selected for you to copy.' };
  }
}
