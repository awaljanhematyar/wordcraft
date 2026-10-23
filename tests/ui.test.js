import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../js/main.js';
import { createGameUI } from '../js/ui.js';
import { domFixture } from './dom-fixture.js';

function mount(options = {}) {
  const dom = domFixture(options);
  let ui; let id = 0;
  const controller = createController({ clock: () => Date.UTC(2026, 9, 23), storage: dom.memory.adapter,
    makeId: () => `unlimited:ui-${++id}`, randomOptions: { crypto: null, random: () => 0 },
    onChange: change => ui?.render(change) });
  ui = createGameUI({ controller, document: dom.doc, window: dom.win,
    sound: { play: async () => true, dispose() {} } });
  return { ...dom, ui, controller, clickKey: key => dom.click(dom.doc.querySelector(`[data-key="${key}"]`)) };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test('renders six rows, five tiles per row, and all 28 accessible keyboard controls', () => {
  const h = mount();
  assert.equal(h.ref('board').querySelectorAll('.board-row').length, 6);
  assert.equal(h.ref('board').querySelectorAll('.tile').length, 30);
  assert.equal(h.ref('keyboard').querySelectorAll('button').length, 28);
  assert.equal(h.doc.querySelector('[data-key="q"]').getAttribute('aria-label'), 'Q, unused');
  h.ui.dispose();
});

test('clicking keys and Backspace immediately renders and saves the current row', () => {
  const h = mount(); h.clickKey('c'); h.clickKey('r'); h.clickKey('a'); h.clickKey('Backspace');
  assert.equal(h.ref('board').querySelector('[data-row="0"]').textContent, 'CR');
  assert.equal(h.controller.getState().daily.input, 'cr'); h.ui.dispose();
});

test('physical typing updates the board, ignores shortcuts, and respects editable controls', () => {
  const h = mount(); h.key('H'); h.key('i'); h.key('Backspace'); h.key('x', { ctrlKey: true });
  assert.equal(h.controller.getState().daily.input, 'h');
  h.ref('share-text').dispatch('keydown', { key: 'a' });
  h.ref('theme-setting').dispatch('keydown', { key: 'a' });
  assert.equal(h.controller.getState().daily.input, 'h'); h.ui.dispose();
});

test('Enter renders feedback, locks duplicate submission, and announces after reveal', async () => {
  const h = mount(); for (const key of 'hello') h.clickKey(key);
  h.clickKey('Enter'); h.clickKey('Enter'); h.clickKey('a');
  assert.equal(h.controller.getState().daily.guesses.length, 1);
  assert.equal(h.ui.isBusy(), true);
  assert.equal(h.ref('board').getAttribute('aria-busy'), 'true');
  h.flush(700); await settle(); h.flush(25);
  assert.equal(h.ui.isBusy(), false);
  assert.ok(h.ref('announcements').textContent.includes('Guess 1'));
  assert.equal(h.doc.querySelector('[data-key="e"]').getAttribute('aria-label'), 'E, wrong place');
  assert.equal(h.doc.querySelector('[data-key="h"]').classList.contains('absent'), true); h.ui.dispose();
});

test('invalid word error is visible, announced, and consumes no attempt', async () => {
  const h = mount(); h.clickKey('Enter'); await settle(); h.flush();
  assert.equal(h.ref('game-message').classList.contains('error'), true);
  assert.ok(h.ref('game-message').textContent.includes('five'));
  assert.equal(h.controller.getState().daily.guesses.length, 0); h.ui.dispose();
});

test('mode switching and New Game preserve daily input and abandon unlimited without losses', () => {
  const h = mount(); h.clickKey('c');
  h.click(h.doc.querySelector('[data-mode="unlimited"]'));
  assert.equal(h.ref('new-game').hidden, false);
  h.clickKey('a'); h.click(h.doc.querySelector('[data-mode="daily"]'));
  assert.equal(h.ref('board-title').textContent, 'Daily challenge');
  assert.equal(h.controller.getState().daily.input, 'c');
  h.click(h.doc.querySelector('[data-mode="unlimited"]'));
  assert.equal(h.controller.getState().unlimited.input, 'a');
  const prior = h.controller.getState().unlimited.answer;
  h.click(h.ref('new-game'));
  assert.notEqual(h.controller.getState().unlimited.answer, prior);
  assert.equal(h.controller.getStatistics('unlimited').gamesPlayed, 0); h.ui.dispose();
});

test('help dialog blocks gameplay, closes with Escape, and restores trigger focus', () => {
  const h = mount(); const trigger = h.doc.querySelector('[data-open="help"]');
  trigger.focus(); h.click(trigger);
  assert.equal(h.ref('help-dialog').open, true);
  assert.equal(h.doc.activeElement.getAttribute('aria-label'), 'Close instructions');
  h.key('a'); assert.equal(h.controller.getState().daily.input, '');
  h.key('Escape'); assert.equal(h.ref('help-dialog').open, false);
  assert.equal(h.doc.activeElement, trigger); h.ui.dispose();
});

test('dialog Tab and Shift+Tab wrap focus without leaking to the game', () => {
  const h = mount(); h.click(h.doc.querySelector('[data-open="settings"]'));
  const first = h.ref('settings-dialog').querySelector('[data-close]'); const last = h.ref('hard-setting');
  first.focus(); h.key('Tab', { shiftKey: true }); assert.equal(h.doc.activeElement, last);
  last.focus(); h.key('Tab'); assert.equal(h.doc.activeElement, first);
  h.ref('settings-dialog').dispatch('cancel'); assert.equal(h.ref('settings-dialog').open, false); h.ui.dispose();
});

test('theme, sound, and Hard Mode settings update actual DOM controls and persist', () => {
  const h = mount(); h.click(h.doc.querySelector('[data-open="settings"]'));
  h.ref('theme-setting').value = 'light'; h.ref('theme-setting').dispatch('change');
  h.ref('sound-setting').checked = true; h.ref('sound-setting').dispatch('change');
  h.ref('hard-setting').checked = true; h.ref('hard-setting').dispatch('change');
  assert.equal(h.doc.documentElement.getAttribute('data-theme'), 'light');
  assert.equal(h.doc.querySelector('meta[name="theme-color"]').getAttribute('content'), '#f5f7f2');
  assert.equal(h.controller.getState().settings.sound, true);
  assert.equal(h.ref('hard-label').textContent, 'Hard Mode');
  assert.ok(h.memory.read().includes('"theme":"light"')); h.ui.dispose();
});

test('late Hard Mode activation is disabled and explains why', () => {
  const h = mount(); h.controller.guess('hello');
  h.click(h.doc.querySelector('[data-open="settings"]'));
  assert.equal(h.ref('hard-setting').disabled, true);
  assert.ok(h.ref('hard-description').textContent.includes('before'));
  h.ref('hard-setting').checked = true; h.ref('hard-setting').dispatch('change');
  assert.equal(h.controller.getState().daily.hardMode, false);
  assert.equal(h.ref('hard-setting').checked, false); h.ui.dispose();
});

test('statistics dialog switches between independent completed game counts and distribution', () => {
  const h = mount(); h.controller.guess(h.controller.getState().daily.answer);
  h.click(h.doc.querySelector('[data-open="stats"]'));
  assert.equal(h.doc.querySelector('[data-stat="gamesPlayed"]').textContent, '1');
  assert.equal(h.doc.querySelector('[data-stat="gamesWon"]').textContent, '1');
  assert.equal(h.ref('distribution').querySelector('li').getAttribute('aria-label'), '1 attempt: 1 wins');
  h.click(h.doc.querySelector('[data-stat-mode="unlimited"]'));
  assert.equal(h.doc.querySelector('[data-stat="gamesPlayed"]').textContent, '0');
  assert.equal(h.ref('stats-mode-label').textContent, 'Unlimited statistics'); h.ui.dispose();
});

for (const won of [true, false]) {
  test(`${won ? 'winning' : 'losing'} opens the proper results dialog and prevents further play`, async () => {
    const h = mount({ reducedMotion: true });
    if (!won) for (let i = 0; i < 5; i += 1) h.controller.guess('hello');
    h.controller.setInput(won ? h.controller.getState().daily.answer : 'hello');
    h.clickKey('Enter'); await settle(); h.flush(25);
    assert.equal(h.ref('results-dialog').open, true);
    assert.equal(h.ref('results-title').textContent, won ? 'Beautifully solved.' : 'One word wiser.');
    assert.equal(h.ref('share-button').hidden, false);
    h.key('Escape'); h.clickKey('a');
    assert.equal(h.controller.getState().daily.input, '');
    h.click(h.ref('results-button')); assert.equal(h.ref('results-dialog').open, true); h.ui.dispose();
  });
}

test('sharing uses Clipboard API without exposing answer or guesses', async () => {
  let copied;
  const h = mount({ clipboard: { writeText: async value => { copied = value; } } });
  h.controller.guess(h.controller.getState().daily.answer);
  h.click(h.ref('share-button')); await settle(); h.flush(25);
  assert.ok(copied.startsWith('WordCraft'));
  assert.equal(copied.includes(h.controller.getState().daily.answer), false);
  assert.equal(h.ref('manual-copy').hidden, true);
  assert.ok(h.ref('announcements').textContent.includes('copied')); h.ui.dispose();
});

test('clipboard failure reveals and selects a readonly manual-copy field inside results', async () => {
  const h = mount(); h.controller.guess(h.controller.getState().daily.answer);
  h.click(h.ref('results-button')); h.click(h.ref('copy-result')); await settle();
  assert.equal(h.ref('manual-copy').hidden, false);
  assert.equal(h.doc.activeElement, h.ref('share-text'));
  assert.equal(h.ref('share-text').selected, true);
  assert.equal(h.ref('share-text').hasAttribute('readonly'), true);
  assert.ok(h.ref('share-text').value.includes('🟩')); h.ui.dispose();
});

test('keyboard clue precedence never downgrades a green to a later gray', () => {
  const h = mount();
  h.controller.guess('arena'); // Today's pinned answer, all green.
  h.ui.render();
  assert.equal(h.doc.querySelector('[data-key="a"]').classList.contains('correct'), true);
  assert.equal(h.doc.querySelector('[data-key="a"]').getAttribute('aria-disabled'), 'true'); h.ui.dispose();
});

test('storage failure remains playable and shows the persistence limit', () => {
  const h = mount(); h.memory.target.setItem = () => { throw new Error('quota'); };
  h.clickKey('a');
  assert.ok(h.ref('save-status').textContent.includes('in memory'));
  assert.equal(h.controller.getState().daily.input, 'a'); h.ui.dispose();
});

test('disposed UI removes listeners and cancels pending reveal and announcement callbacks', async () => {
  const h = mount(); h.controller.setInput('hello'); h.clickKey('Enter'); h.ui.dispose(); await settle();
  const before = h.controller.getState().daily.input;
  h.key('a'); assert.equal(h.controller.getState().daily.input, before);
  assert.equal(h.ui.getDialogs().getCurrent(), null);
});

test('pointer typing keeps game focus, while native keyboard button activation is preserved', async () => {
  const h = mount();
  const key = h.doc.querySelector('[data-key="h"]');
  const pointer = key.dispatch('pointerdown');
  assert.equal(pointer.event.prevented, true);
  assert.equal(h.doc.activeElement, h.ref('game-surface'));
  for (const letter of 'hello') h.clickKey(letter);
  h.ref('game-surface').dispatch('keydown', { key: 'Enter' });
  h.flush(700); await settle();
  assert.equal(h.controller.getState().daily.guesses.length, 1);
  key.focus();
  const native = key.dispatch('keydown', { key: 'Enter' });
  assert.equal(native.event.prevented, false);
  h.ui.dispose();
});
