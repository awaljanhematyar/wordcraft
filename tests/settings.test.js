import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, validateSettings, updateSettings } from '../js/settings.js';

test('missing and malformed settings recover typed defaults', () => {
  for (const input of [null, undefined, [], 1, 'dark', { theme: 'sepia', sound: 'yes', hardMode: 1 }]) {
    assert.deepEqual(validateSettings(input), DEFAULT_SETTINGS);
  }
});

test('valid preferences survive normalization; unknown properties are stripped', () => {
  assert.deepEqual(validateSettings({ theme: 'light', sound: true, hardMode: true, extra: 'x' }), { theme: 'light', sound: true, hardMode: true });
});

test('updates are immutable and preserve unspecified preferences', () => {
  const value = updateSettings(DEFAULT_SETTINGS, { sound: true });
  assert.equal(value.sound, true);
  assert.equal(value.theme, 'dark');
  assert.equal(DEFAULT_SETTINGS.sound, false);
  assert.ok(Object.isFrozen(value));
});

for (const patch of [null, [], { theme: 'sepia' }, { sound: 'true' }, { hardMode: 1 }, { extra: true }]) {
  test(`invalid preference patch rejected: ${JSON.stringify(patch)}`, () => assert.throws(() => updateSettings(DEFAULT_SETTINGS, patch), TypeError));
}
