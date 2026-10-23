import test from 'node:test';
import assert from 'node:assert/strict';
import { createShareText, copyResult } from '../js/share.js';
import { finished } from './helpers.js';

test('daily sharing includes metadata, attempt count, emoji, and no guessed words', () => {
  const session = finished('2026-10-23', { attempts: 2 });
  const text = createShareText(session);
  assert.match(text, /Daily 2026-10-23 \(daily-v1\)/);
  assert.match(text, /2\/6/);
  assert.equal(text.toLowerCase().includes(session.answer), false);
  assert.equal(text.includes('hello'), false);
  assert.equal(text.split('\n\n')[1].split('\n').length, 2);
  assert.match(text.split('\n').at(-1), /^🟩{5}$/u);
});

test('unlimited sharing identifies the puzzle and eligible Hard Mode results', () => {
  const session = finished(null, { mode: 'unlimited', id: 'unlimited:demo-42' });
  session.hardEligible = true;
  const text = createShareText(session);
  assert.match(text, /Unlimited unlimited:demo-42/);
  assert.match(text, /1\/6\*/);
});

test('lost share grid shows X/6 and never the answer', () => {
  const session = finished('2026-10-23', { status: 'lost' });
  const text = createShareText(session);
  assert.match(text, /X\/6/);
  assert.equal(text.toLowerCase().includes(session.answer), false);
  assert.equal(text.split('\n\n')[1].split('\n').length, 6);
});

test('uncompleted or malformed share sessions are rejected', () => {
  for (const session of [null, { status: 'playing', guesses: [] }, { status: 'won', guesses: [] }, { status: 'won', guesses: Array(7) }]) assert.throws(() => createShareText(session), TypeError);
});

test('successful Clipboard API copy does not invoke fallback', async () => {
  let copied;
  const result = await copyResult('grid', { navigator: { clipboard: { writeText: async text => { copied = text; } } }, showManual: () => assert.fail('unexpected fallback') });
  assert.equal(result.copied, true); assert.equal(copied, 'grid');
});

for (const navigator of [undefined, {}, { clipboard: { writeText: async () => { throw new Error('denied'); } } }]) {
  test(`clipboard unavailable or denied selects a safe manual fallback: ${Boolean(navigator?.clipboard)}`, async () => {
    let selected;
    const result = await copyResult('grid', { navigator, showManual: text => { selected = text; } });
    assert.equal(result.copied, false); assert.equal(selected, 'grid');
  });
}
