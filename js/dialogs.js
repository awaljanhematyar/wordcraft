/** Native modal dialogs plus explicit focus return, Escape handling, and a keyboard focus boundary. */
export function createDialogs(document) {
  let current = null;
  let previousFocus = null;
  const elements = Array.from(document.querySelectorAll('dialog'));
  function close(restore = true) {
    if (!current) return;
    const dialog = current;
    current = null;
    dialog.close();
    if (restore) {
      const usable = previousFocus && previousFocus.isConnected !== false && !previousFocus.disabled
        && !previousFocus.hidden && !previousFocus.closest?.('[hidden]');
      if (usable) previousFocus.focus();
      else (document.querySelector('#game-surface') ?? document.querySelector('#main'))?.focus();
    }
  }
  function open(name, trigger = document.activeElement) {
    const dialog = document.querySelector(`#${name}-dialog`);
    if (!dialog) return false;
    if (current === dialog) return true;
    close(false);
    previousFocus = trigger;
    current = dialog;
    dialog.showModal();
    dialog.querySelector('[data-close]')?.focus();
    return true;
  }
  function keydown(event) {
    if (!current) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(current.querySelectorAll('button,input,select,textarea,a[href],[tabindex]'))
      .filter(element => !element.disabled && !element.hidden && !element.closest('[hidden]') && element.getAttribute('tabindex') !== '-1');
    if (!focusable.length) { event.preventDefault(); current.focus(); return; }
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !current.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !current.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }
  const cancel = event => { event.preventDefault(); close(); };
  for (const dialog of elements) dialog.addEventListener('cancel', cancel);
  document.addEventListener('keydown', keydown);
  return { open, close, getCurrent: () => current,
    dispose() {
      close(false);
      for (const dialog of elements) dialog.removeEventListener('cancel', cancel);
      document.removeEventListener('keydown', keydown);
    } };
}
