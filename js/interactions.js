/** Shared input pipeline for physical and on-screen keys. Uses the existing Phase 3 coordinator. */
export function isGameplayKey(event, dialogOpen = false) {
  if (dialogOpen || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.keyCode === 229) return false;
  const target = event.target;
  if (target?.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable=""],[role="textbox"]') || target?.isContentEditable) return false;
  // Enter/Space on focused buttons retain their native activation behavior.
  if (target?.closest?.('button,a[href]') && (event.key === 'Enter' || event.key === ' ')) return false;
  if (target?.closest?.('button:not([data-key]),a[href]')) return false;
  return /^[a-zA-Z]$/.test(event.key) || event.key === 'Backspace' || event.key === 'Enter';
}

export function createInputHandler({ controller, view, isDialogOpen = () => false }) {
  let busy = false;
  let disposed = false;
  async function input(key) {
    if (disposed || busy || isDialogOpen()) return false;
    if (controller.checkDay() && controller.getState().activeMode === 'daily') return false;
    const state = controller.getState();
    const session = state[state.activeMode];
    if (!session || session.status !== 'playing') return false;
    if (key === 'Enter') {
      busy = true;
      view.setBusy(true);
      let validationError;
      try {
        const result = controller.guess();
        if (!result.ok) { validationError = result.message; return false; }
        const after = controller.getState()[state.activeMode];
        const row = after.guesses.length - 1;
        await view.animate(row);
        if (disposed) return false;
        const latest = controller.getState()[controller.getState().activeMode];
        if (latest.id !== after.id || latest.guesses.length !== after.guesses.length) return false;
        const feedback = result.feedback.map((value, index) => `${after.guesses[row].word[index].toUpperCase()}: ${value === 'correct' ? 'right place' : value === 'present' ? 'wrong place' : 'not in word'}`).join(', ');
        view.announce(`Guess ${row + 1}. ${feedback}.`);
        view.sound(result.status === 'won' ? 'win' : result.status === 'lost' ? 'loss' : 'guess');
        if (result.status !== 'playing') view.complete(after);
        return true;
      } finally {
        busy = false;
        if (!disposed) { view.setBusy(false); if (validationError) view.error(validationError); }
      }
    }
    const value = key === 'Backspace' ? session.input.slice(0, -1)
      : /^[a-zA-Z]$/.test(key) && session.input.length < 5 ? session.input + key.toLowerCase() : null;
    if (value === null) return false;
    const result = controller.setInput(value);
    if (result.ok) view.sound('tap');
    return result.ok;
  }
  return { input, isBusy: () => busy,
    physical(event) {
      if (!isGameplayKey(event, isDialogOpen())) return;
      event.preventDefault();
      if (event.key === 'Enter' && event.repeat) return;
      return input(event.key);
    },
    dispose() { disposed = true; },
  };
}
