import test from 'node:test';
import assert from 'node:assert/strict';
import { createInputHandler, isGameplayKey } from '../js/interactions.js';
import { harness } from './helpers.js';

function setup() {
  const h = harness(); const calls = [];
  let release; let modal = false;
  const input = createInputHandler({ controller: h.controller, isDialogOpen: () => modal,
    view: { setBusy: value => calls.push(['busy', value]), sound: value => calls.push(['sound', value]),
      error: value => calls.push(['error', value]), announce: value => calls.push(['announce', value]),
      complete: value => calls.push(['complete', value]),
      animate: () => new Promise(resolve => { release = resolve; }) } });
  return { ...h, input, calls, release: () => release?.(), setModal: value => { modal = value; } };
}

test('letters and Backspace update persisted input immediately through a shared pipeline', async () => {
  const h = setup();
  await h.input.input('C'); await h.input.input('r'); await h.input.input('Backspace');
  assert.equal(h.controller.getState().daily.input, 'c');
  assert.equal(h.reload().getState().daily.input, 'c');
});

test('excess letters and unsupported keys do not change the input', async () => {
  const h = setup();
  for (const key of 'craft') await h.input.input(key);
  assert.equal(await h.input.input('s'), false);
  assert.equal(await h.input.input('Escape'), false);
  assert.equal(h.controller.getState().daily.input, 'craft');
});

test('invalid words announce an error without consuming an attempt or leaving the input locked', async () => {
  const h = setup();
  assert.equal(await h.input.input('Enter'), false);
  assert.equal(h.input.isBusy(), false);
  assert.equal(h.controller.getState().daily.guesses.length, 0);
  assert.ok(h.calls.find(([name]) => name === 'error'));
});

test('duplicate Enter and letters during reveal are rejected until animation completes', async () => {
  const h = setup(); h.controller.setInput('hello');
  const pending = h.input.input('Enter');
  assert.equal(h.input.isBusy(), true);
  assert.equal(await h.input.input('Enter'), false);
  assert.equal(await h.input.input('a'), false);
  assert.equal(h.controller.getState().daily.guesses.length, 1);
  h.release(); await pending;
  assert.equal(h.input.isBusy(), false);
  assert.ok(h.calls.find(([name, value]) => name === 'announce' && value.includes('Guess 1')));
});

for (const status of ['won', 'lost']) {
  test(`${status} state opens results once and blocks all later gameplay`, async () => {
    const h = setup(); const c = h.controller;
    if (status === 'lost') for (let i = 0; i < 5; i += 1) c.guess('hello');
    c.setInput(status === 'won' ? c.getState().daily.answer : 'hello');
    const pending = h.input.input('Enter'); h.release(); await pending;
    assert.equal(c.getState().daily.status, status);
    assert.equal(h.calls.filter(([name]) => name === 'complete').length, 1);
    assert.equal(await h.input.input('a'), false);
    assert.equal(await h.input.input('Enter'), false);
  });
}

test('dialog, disposed view, and UTC rollover block stale input', async () => {
  const h = setup(); h.setModal(true);
  assert.equal(await h.input.input('a'), false);
  h.setModal(false); h.setTime('2026-10-24T00:00:00Z');
  assert.equal(await h.input.input('a'), false);
  assert.equal(h.controller.getState().daily.input, '');
  h.input.dispose(); assert.equal(await h.input.input('a'), false);
});

test('external puzzle replacement during animation cannot open stale results', async () => {
  const h = setup(); const c = h.controller;
  c.setInput(c.getState().daily.answer);
  const pending = h.input.input('Enter');
  h.setTime('2026-10-24T00:00:00Z'); c.checkDay();
  h.release(); await pending;
  assert.equal(h.calls.filter(([name]) => name === 'complete').length, 0);
});

test('disposing during animation cancels post-reveal work', async () => {
  const h = setup(); h.controller.setInput('hello');
  const pending = h.input.input('Enter'); h.input.dispose(); h.release(); await pending;
  assert.equal(h.calls.filter(([name]) => name === 'announce').length, 0);
});

test('physical keyboard preserves shortcuts, IME, editing, and native button behavior', () => {
  const plain = { key: 'a', target: { closest: () => null } };
  assert.equal(isGameplayKey(plain), true);
  for (const patch of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }, { keyCode: 229 }, { key: 'F5' }, { target: { isContentEditable: true } }]) assert.equal(isGameplayKey({ ...plain, ...patch }), false);
  assert.equal(isGameplayKey(plain, true), false);
  assert.equal(isGameplayKey({ key: 'Enter', target: { closest: selector => selector === 'button,a[href]' ? {} : null } }), false);
  assert.equal(isGameplayKey({ key: 'a', target: { closest: selector => selector.startsWith('input') ? {} : null } }), false);
  assert.equal(isGameplayKey({ key: 'a', target: { closest: selector => selector.startsWith('button:not') ? {} : null } }), false);
});

test('physical Enter repeat is ignored and recognized keys prevent browser defaults', async () => {
  const h = setup(); let prevented = false;
  h.input.physical({ key: 'Enter', repeat: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.controller.getState().daily.guesses.length, 0);
  await h.input.physical({ key: 'a', preventDefault() {} });
  assert.equal(h.controller.getState().daily.input, 'a');
  h.input.physical({ key: 'F5' });
});
