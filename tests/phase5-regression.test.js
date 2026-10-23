import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../js/main.js';
import { createGameUI } from '../js/ui.js';
import { createSoundPlayer } from '../js/settings.js';
import { createDocument, decodeDocument } from '../js/storage.js';
import { domFixture } from './dom-fixture.js';
import { harness } from './helpers.js';
function mount(clipboard) {
  const dom = domFixture({ clipboard }); let ui;
  const controller = createController({ clock: () => Date.UTC(2026,9,23), storage: dom.memory.adapter,
    onChange: change => ui?.render(change) });
  ui = createGameUI({ controller, document: dom.doc, window: dom.win, sound: { async play(){},dispose(){} } });
  return { ...dom, ui, controller };
}

test('actual trailing newline is rejected by input API without changing saved input', () => {
  const h = harness();
  for (const value of ['a\n','ab\r\n','abcd\n']) {
    assert.equal(h.controller.setInput(value).code,'invalid-input');
    assert.equal(h.controller.getState().daily.input,'');
  }
});

test('saved typed input cannot smuggle a final newline past dictionary-independent validation', () => {
  const value = createDocument('2026-10-23'); value.daily.input = 'ab\n';
  const result = decodeDocument(JSON.stringify(value),'2026-10-23');
  assert.equal(result.status,'recovered'); assert.equal(result.document.daily.input,'');
});

test('pending clipboard rejection after closing results cannot select a hidden field', async () => {
  let reject;
  const h=mount({ writeText: () => new Promise((resolve, fail) => { reject=fail; }) });
  h.controller.guess(h.controller.getState().daily.answer);
  h.click(h.ref('share-button')); h.key('Escape');
  const focus=h.doc.activeElement;
  reject(new Error('denied'));
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.ref('manual-copy').hidden,true);
  assert.equal(h.doc.activeElement,focus);
  h.ui.dispose();
});

test('audio suspended resume cannot create tones after the player is disposed', async () => {
  let resume; let tones=0;
  class Audio {
    state='suspended'; currentTime=0;
    resume(){return new Promise(resolve=>{resume=resolve;});}
    createOscillator(){tones+=1;throw new Error('should not create');}
    close(){return Promise.resolve();}
  }
  const sound=createSoundPlayer({AudioContext:Audio});
  const pending=sound.play('tap',true); sound.dispose(); resume(); await pending;
  assert.equal(tones,0);
});

test('rendering unchanged state does not rewrite existing text or attributes', () => {
  const h=mount(); let writes=0;
  const nodes=[h.doc.documentElement,...h.doc.querySelectorAll('body'),...h.doc.querySelectorAll('body')[0].querySelectorAll('button,input,select,textarea,div,span,p,h2')];
  for(const node of new Set(nodes)){
    const original=node.setAttribute.bind(node); node.setAttribute=(...args)=>{writes+=1;return original(...args);};
    const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node),'textContent');
    Object.defineProperty(node,'textContent',{get(){return descriptor.get.call(this);},set(value){writes+=1;descriptor.set.call(this,value);},configurable:true});
  }
  h.ui.render();
  assert.equal(writes,0);
  h.ui.dispose();
});

test('closing a dialog whose original trigger became hidden restores game focus', () => {
  const h=mount();h.controller.guess(h.controller.getState().daily.answer);
  h.click(h.ref('results-button'));h.ref('results-button').hidden=true;
  h.key('Escape');
  assert.equal(h.doc.activeElement,h.ref('game-surface'));
  h.ui.dispose();
});
