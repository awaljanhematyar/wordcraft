/** DOM-only rendering. Game rules must remain in pure modules. */
export function renderFoundation(board) {
  if (!board) return;
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < 6; row += 1) {
    const element = document.createElement('div');
    element.className = 'board-row';
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', `Preview row ${row + 1}`);
    for (let column = 0; column < 5; column += 1) {
      const tile = document.createElement('span');
      const letter = row === 0 ? 'CRAFT'[column] : '';
      tile.className = `tile${row === 0 ? ' correct' : ''}`;
      tile.textContent = letter;
      tile.setAttribute('aria-label', letter ? `${letter}, example correct position` : 'Empty preview tile');
      element.append(tile);
    }
    fragment.append(element);
  }
  board.replaceChildren(fragment);
}

import { property, attribute, toggleClass } from './dom.js';
import { getKeyboardState } from './game.js';
import { applyTheme, createSoundPlayer } from './settings.js';
import { createShareText, copyResult } from './share.js';
import { createDialogs } from './dialogs.js';
import { createInputHandler } from './interactions.js';

/** DOM adapter. Every state change and guess is delegated to the existing coordinator. */
export function createGameUI({ controller, document: doc, window: win, sound = createSoundPlayer(win) }) {
  const references = new Map();
  const ref = id => { if (!references.has(id)) references.set(id, doc.querySelector(`#${id}`)); return references.get(id); };
  const board = ref('board');
  const keyboard = ref('keyboard');
  const dialogs = createDialogs(doc);
  const timers = new Map();
  let disposed = false;
  let busy = false;
  let statsMode = controller.getState().activeMode;
  let announcementTimer;
  const rows = [];
  const keys = new Map();
  const distribution = [];
  function later(callback, duration) {
    const timer = win.setTimeout(() => { timers.delete(timer); callback(); }, duration);
    timers.set(timer, callback);
    return timer;
  }
  function announce(message) {
    if (disposed || !message) return;
    const region = ref('announcements');
    property(region, 'textContent', '');
    if (announcementTimer !== undefined) { win.clearTimeout(announcementTimer); timers.delete(announcementTimer); }
    announcementTimer = later(() => { property(region, 'textContent', message); }, 25);
    const local = dialogs.getCurrent()?.querySelector('[data-dialog-status]');
    if (local) property(local, 'textContent', message);
  }
  for (let row = 0; row < 6; row += 1) {
    const element = doc.createElement('div'); property(element, 'className', 'board-row');
    element.dataset.row = String(row); attribute(element, 'role', 'group'); attribute(element, 'aria-label', `Guess ${row + 1}`);
    const tiles = [];
    for (let column = 0; column < 5; column += 1) {
      const tile = doc.createElement('span'); property(tile, 'className', 'tile'); element.append(tile); tiles.push(tile);
    }
    rows.push({ element, tiles });
  }
  board.replaceChildren(...rows.map(row => row.element));
  for (const letters of ['qwertyuiop', 'asdfghjkl', ['Enter', ...'zxcvbnm', 'Backspace']]) {
    const row = doc.createElement('div'); property(row, 'className', 'keyboard-row');
    for (const key of letters) {
      const button = doc.createElement('button'); button.type = 'button'; property(button, 'className', `key${key.length > 1 ? ' wide' : ''}`);
      button.dataset.key = key; property(button, 'textContent', key === 'Backspace' ? '⌫' : key.toUpperCase());
      attribute(button, 'aria-label', key.length > 1 ? key : `${key.toUpperCase()}, unused`);
      row.append(button); keys.set(key, button);
    }
    keyboard.append(row);
  }
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const row = doc.createElement('li');
    const label = doc.createElement('span'); property(label, 'textContent', String(attempt));
    const track = doc.createElement('div'); property(track, 'className', 'bar-track');
    const bar = doc.createElement('div'); property(bar, 'className', 'bar');
    track.append(bar); row.append(label, track); ref('distribution').append(row); distribution.push({ row, bar });
  }

  function renderStatistics() {
    const stats = controller.getStatistics(statsMode);
    for (const button of doc.querySelectorAll('[data-stat-mode]')) attribute(button, 'aria-pressed', String(button.dataset.statMode === statsMode));
    property(ref('stats-mode-label'), 'textContent', `${statsMode === 'daily' ? 'Daily' : 'Unlimited'} statistics`);
    for (const value of doc.querySelectorAll('[data-stat]')) property(value, 'textContent', String(stats[value.dataset.stat]));
    const largest = Math.max(1, ...stats.guessDistribution);
    distribution.forEach(({ row, bar }, index) => {
      const value = stats.guessDistribution[index];
      attribute(row, 'aria-label', `${index + 1} ${index ? 'attempts' : 'attempt'}: ${value} wins`);
      property(bar, 'textContent', String(value)); bar.style.width = `${Math.max(8, value / largest * 100)}%`;
      toggleClass(bar, 'has-wins', value > 0);
    });
    property(ref('stats-note'), 'textContent', statsMode === 'daily'
      ? 'Consecutive UTC days build your streak. Expired puzzles are unplayed.'
      : 'Completed wins build your streak. Abandoned puzzles do not count as losses.');
  }
  function renderResults() {
    const state = controller.getState(); const session = state[state.activeMode];
    if (session.status === 'playing') return;
    const won = session.status === 'won';
    property(ref('results-title'), 'textContent', won ? 'Beautifully solved.' : 'One word wiser.');
    property(ref('result-emblem'), 'textContent', won ? '✓' : '↻');
    property(ref('result-summary'), 'textContent', won ? `Found in ${session.guesses.length} of 6 guesses. Well played.` : `The word was ${session.answer.toUpperCase()}. A new discovery for next time.`);
    const text = createShareText(session);
    property(ref('result-grid'), 'textContent', text.split('\n\n')[1]);
    property(ref('result-caption'), 'textContent', session.mode === 'daily'
      ? `Daily ${session.day}. The next puzzle arrives at 00:00 UTC.`
      : `Unlimited puzzle ${session.generation}. Ready for another?`);
  }
  function render(change = {}) {
    if (disposed) return;
    const state = controller.getState(); const session = state[state.activeMode]; const game = controller.getGame();
    applyTheme(state.settings, doc);
    for (const button of doc.querySelectorAll('[data-mode]')) {
      attribute(button, 'aria-pressed', String(button.dataset.mode === state.activeMode)); property(button, 'disabled', busy);
    }
    property(ref('board-title'), 'textContent', state.activeMode === 'daily' ? 'Daily challenge' : 'Unlimited practice');
    property(ref('puzzle-label'), 'textContent', state.activeMode === 'daily' ? session.day : `PUZZLE ${session.generation}`);
    property(ref('attempt-label'), 'textContent', session.status === 'playing' ? `Attempt ${session.guesses.length + 1} of 6` : `${session.guesses.length} of 6 guesses`);
    property(ref('hard-label'), 'textContent', session.hardMode ? 'Hard Mode' : 'Classic rules');
    rows.forEach(({ tiles }, row) => tiles.forEach((tile, column) => {
      const accepted = game.guesses[row];
      const letter = accepted?.word[column] ?? (session.status === 'playing' && row === session.guesses.length ? session.input[column] : '') ?? '';
      const feedback = accepted?.feedback[column];
      property(tile, 'textContent', letter.toUpperCase());
      property(tile, 'className', `tile${letter ? ' filled' : ''}${feedback ? ` ${feedback}` : ''}`);
      const label = feedback === 'correct' ? 'right place' : feedback === 'present' ? 'wrong place' : feedback === 'absent' ? 'not in word' : 'not submitted';
      attribute(tile, 'aria-label', letter ? `${letter.toUpperCase()}, ${label}` : 'Empty');
    }));
    const keyState = getKeyboardState(game.guesses);
    for (const [letter, button] of keys) {
      const clue = keyState[letter];
      property(button, 'className', `key${letter.length > 1 ? ' wide' : ''}${clue ? ` ${clue}` : ''}`);
      attribute(button, 'aria-disabled', String(busy || session.status !== 'playing'));
      if (letter.length === 1) {
        const label = clue === 'correct' ? 'right place' : clue === 'present' ? 'wrong place' : clue === 'absent' ? 'not in word' : 'unused';
        attribute(button, 'aria-label', `${letter.toUpperCase()}, ${label}`);
        attribute(button, 'data-clue', clue === 'correct' ? '✓' : clue === 'present' ? '•' : clue === 'absent' ? '×' : '');
      }
    }
    attribute(board, 'aria-busy', String(busy));
    property(ref('new-game'), 'hidden', state.activeMode !== 'unlimited'); property(ref('new-game'), 'disabled', busy);
    property(ref('results-button'), 'hidden', session.status === 'playing'); property(ref('share-button'), 'hidden', session.status === 'playing');
    property(ref('results-button'), 'disabled', busy); property(ref('share-button'), 'disabled', busy);
    const message = ref('game-message'); property(message, 'className', `game-message${session.status === 'won' ? ' success' : ''}`);
    property(message, 'textContent', session.status === 'won' ? `Solved in ${session.guesses.length}. Nicely crafted!`
      : session.status === 'lost' ? `The word was ${session.answer.toUpperCase()}. Keep your curiosity.`
      : session.guesses.length ? 'A little closer. What is your next guess?' : 'Type a five-letter word to begin.');
    const saved = controller.getStorageStatus() === 'saved';
    property(ref('save-status'), 'textContent', saved ? 'Progress saved on this browser.' : 'Progress is in memory. This browser could not save it.');
    toggleClass(ref('save-status'), 'unsaved', !saved);
    property(ref('theme-setting'), 'value', state.settings.theme); property(ref('sound-setting'), 'checked', state.settings.sound);
    property(ref('hard-setting'), 'checked', session.status === 'playing' ? session.hardMode : state.settings.hardMode);
    property(ref('hard-setting'), 'disabled', session.status === 'playing' && session.guesses.length > 0 && !session.hardMode);
    property(ref('hard-description'), 'textContent', ref('hard-setting').disabled
      ? 'Enable before the first accepted guess of a new puzzle.' : 'Use every clue, including repeated-letter counts.');
    property(ref('hard-eligibility'), 'textContent', session.hardOptOut ? 'Hard Mode eligibility was removed for this puzzle when you turned it off.'
      : session.hardEligible ? 'This puzzle is eligible for a Hard Mode result.' : 'Turn on Hard Mode before your first accepted guess.');
    if (dialogs.getCurrent()?.id === 'stats-dialog') renderStatistics();
    if (dialogs.getCurrent()?.id === 'results-dialog') {
      if (session.status === 'playing') dialogs.close(); else renderResults();
    }
    if (change.message) announce(change.message);
  }

  function open(name, trigger) {
    if (busy) return;
    if (name === 'stats') { statsMode = controller.getState().activeMode; renderStatistics(); }
    if (name === 'results') { renderResults(); property(ref('manual-copy'), 'hidden', true); }
    for (const status of doc.querySelectorAll('[data-dialog-status]')) property(status, 'textContent', '');
    dialogs.open(name, trigger);
  }
  async function share(trigger) {
    if (busy) return;
    const state = controller.getState(); const session = state[state.activeMode];
    if (session.status === 'playing') return;
    const text = createShareText(session);
    if (dialogs.getCurrent()?.id !== 'results-dialog') open('results', trigger);
    const result = await copyResult(text, { navigator: win.navigator, showManual: value => {
      if (disposed || dialogs.getCurrent()?.id !== 'results-dialog' || controller.getState()[controller.getState().activeMode].id !== session.id) return;
      property(ref('manual-copy'), 'hidden', false); property(ref('share-text'), 'value', value); ref('share-text').focus(); ref('share-text').select();
    } });
    if (!disposed && dialogs.getCurrent()?.id === 'results-dialog' && controller.getState()[controller.getState().activeMode].id === session.id) announce(result.message);
  }

  const input = createInputHandler({ controller, isDialogOpen: () => Boolean(dialogs.getCurrent()), view: {
    setBusy(value) { busy = value; render(); },
    announce,
    error(message) {
      const status = ref('game-message'); property(status, 'className', 'game-message error'); property(status, 'textContent', message); announce(message);
      const session = controller.getState()[controller.getState().activeMode];
      const row = rows[Math.min(session.guesses.length, 5)].element;
      row.classList.add('shake'); later(() => row.classList.remove('shake'), 300);
    },
    async animate(index) {
      const row = rows[index].element; row.classList.add('revealing');
      const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) await new Promise(resolve => later(resolve, 700));
      row.classList.remove('revealing');
    },
    sound(kind) { void sound.play(kind, controller.getState().settings.sound); },
    complete(session) {
      const className = session.status === 'won' ? 'celebrate' : 'defeat';
      board.classList.add(className); later(() => board.classList.remove(className), 500);
      const message = session.status === 'won' ? `You won in ${session.guesses.length} guesses.` : `No guesses remain. The word was ${session.answer.toUpperCase()}.`;
      // Busy protects input until the reveal ends. Open the result directly at that boundary.
      renderResults(); property(ref('manual-copy'), 'hidden', true); dialogs.open('results', ref('results-button')); announce(message);
    },
  } });

  const click = event => {
    const target = event.target.closest?.('button');
    if (!target || target.disabled) return;
    if (target.hasAttribute('data-close')) { dialogs.close(); return; }
    if (busy) return;
    if (target.dataset.key) { void input.input(target.dataset.key); return; }
    if (target.dataset.mode) {
      controller.selectMode(target.dataset.mode); render(); ref('game-surface').focus(); announce(`${target.dataset.mode === 'daily' ? 'Daily challenge' : 'Unlimited practice'} selected.`); return;
    }
    if (target.dataset.open) { open(target.dataset.open, target); return; }
    if (target.dataset.statMode) { statsMode = target.dataset.statMode; renderStatistics(); return; }
    if (target.id === 'new-game') {
      controller.newUnlimited(); render(); ref('game-surface').focus(); announce('A new unlimited puzzle is ready.'); return;
    }
    if (target.id === 'results-button') { open('results', target); return; }
    if (target.id === 'share-button' || target.id === 'copy-result') void share(target);
  };
  const change = event => {
    const setting = event.target.dataset?.setting;
    if (!setting || busy) return;
    const value = setting === 'theme' ? event.target.value : event.target.checked;
    const result = controller.setPreferences({ [setting]: value });
    render();
    announce(result.ok ? `${setting === 'hardMode' ? 'Hard Mode' : setting === 'theme' ? 'Appearance' : 'Sound'} updated.` : result.message);
    if (result.ok && setting === 'sound' && value) void sound.play('tap', true);
  };
  const keydown = event => { void input.physical(event); };
  const pointerdown = event => {
    if (event.target.closest?.('[data-key]') && !dialogs.getCurrent()) {
      // Pointer keys keep focus on the game, so physical Enter works after tapping letters.
      // Keyboard Tab/Enter activation of the native buttons remains unchanged.
      event.preventDefault(); ref('game-surface').focus();
    }
  };
  doc.addEventListener('pointerdown', pointerdown);
  doc.addEventListener('click', click); doc.addEventListener('change', change); doc.addEventListener('keydown', keydown);
  render();
  return { render, announce, getDialogs: () => dialogs, isBusy: input.isBusy,
    dispose() {
      disposed = true; input.dispose(); dialogs.dispose(); sound.dispose();
      doc.removeEventListener('pointerdown', pointerdown);
      doc.removeEventListener('click', click); doc.removeEventListener('change', change); doc.removeEventListener('keydown', keydown);
      for (const [timer, callback] of timers) { win.clearTimeout(timer); callback(); }
      timers.clear();
    } };
}
