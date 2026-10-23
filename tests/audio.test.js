import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundPlayer } from '../js/settings.js';

function fakeAudio({ suspended = false, resumeError = false, closeError = false } = {}) {
  const calls = [];
  class Audio {
    constructor() { calls.push('construct'); this.state = suspended ? 'suspended' : 'running'; this.currentTime = 1; this.destination = {}; }
    async resume() { calls.push('resume'); if (resumeError) throw new Error('blocked'); }
    createOscillator() { return { frequency: { setValueAtTime: frequency => calls.push(frequency) }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    close() { calls.push('close'); if (closeError) throw new Error('closed'); return Promise.resolve(); }
  }
  return { Audio, calls };
}

test('sound off does not even instantiate AudioContext', async () => {
  const { Audio, calls } = fakeAudio(); const player = createSoundPlayer({ AudioContext: Audio });
  assert.equal(await player.play('tap', false), false); assert.deepEqual(calls, []); player.dispose();
});

test('tap, win, and loss use lazy, reused audio with short synthesized tones', async () => {
  const { Audio, calls } = fakeAudio({ suspended: true }); const player = createSoundPlayer({ AudioContext: Audio });
  for (const type of ['tap', 'win', 'loss']) assert.equal(await player.play(type, true), true);
  assert.equal(calls.filter(value => value === 'construct').length, 1);
  assert.ok(calls.includes(440)); assert.ok(calls.includes(660)); assert.ok(calls.includes(180));
  player.dispose(); assert.equal(await player.play('tap', true), false); assert.ok(calls.includes('close'));
});

test('unsupported or denied audio fails quietly and does not block play', async () => {
  assert.equal(await createSoundPlayer({}).play('tap', true), false);
  const { Audio } = fakeAudio({ suspended: true, resumeError: true });
  assert.equal(await createSoundPlayer({ AudioContext: Audio }).play('tap', true), false);
  const failure = createSoundPlayer({ AudioContext: class { constructor() { throw new Error('failed'); } } });
  assert.equal(await failure.play('tap', true), false);
});

test('legacy audio constructor and cleanup errors are supported safely', async () => {
  const { Audio } = fakeAudio({ closeError: true }); const player = createSoundPlayer({ webkitAudioContext: Audio });
  assert.equal(await player.play('tap', true), true); assert.doesNotThrow(() => player.dispose());
});
