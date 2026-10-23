import { attribute } from './dom.js';
/** Preferences only. Theme application and audio effects are Phase 4. */
export const DEFAULT_SETTINGS = Object.freeze({ theme: 'dark', sound: false, hardMode: false });
export function validateSettings(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.freeze({
    theme: input.theme === 'light' ? 'light' : 'dark',
    sound: typeof input.sound === 'boolean' ? input.sound : false,
    hardMode: typeof input.hardMode === 'boolean' ? input.hardMode : false,
  });
}

export function updateSettings(settings, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('Provide a settings patch.');
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(DEFAULT_SETTINGS, key) || (key === 'theme' ? !['dark', 'light'].includes(value) : typeof value !== 'boolean')) {
      throw new TypeError('Invalid preference.');
    }
  }
  return validateSettings({ ...settings, ...patch });
}

/** Apply validated preferences without fetching assets or changing system settings. */
export function applyTheme(settings, document) {
  attribute(document.documentElement, 'data-theme', settings.theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) attribute(meta, 'content', settings.theme === 'light' ? '#f5f7f2' : '#101720');
}

/** Audio is created lazily from an input gesture. Unsupported/blocked audio never interrupts play. */
export function createSoundPlayer(window) {
  let context;
  let disposed = false;
  return {
    async play(kind, enabled) {
      if (!enabled || disposed) return false;
      try {
        const Audio = window.AudioContext ?? window.webkitAudioContext;
        if (!Audio) return false;
        context ??= new Audio();
        if (context.state === 'suspended') await context.resume();
        if (disposed) return false;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const duration = kind === 'win' ? 0.25 : kind === 'loss' ? 0.18 : 0.07;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(kind === 'win' ? 660 : kind === 'loss' ? 180 : 440, context.currentTime);
        gain.gain.setValueAtTime(0.035, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(); oscillator.stop(context.currentTime + duration);
        return true;
      } catch { return false; }
    },
    dispose() {
      disposed = true;
      try { const closing = context?.close(); closing?.catch?.(() => {}); } catch { /* Ignore unavailable audio cleanup. */ }
    },
  };
}
