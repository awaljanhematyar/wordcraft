/** Minimal deterministic DOM fixture for our own markup. Not a browser/layout emulator. */
import { readFileSync } from 'node:fs';
import { memoryStorage } from './helpers.js';

function matches(element, selector) {
  if (!element?.tagName) return false;
  return selector.split(',').some(part => {
    let value = part.trim();
    const not = value.match(/:not\(([^)]+)\)/);
    if (not) { if (matches(element, not[1])) return false; value = value.replace(not[0], ''); }
    const tag = value.match(/^[a-z]+/i)?.[0];
    if (tag && element.tagName !== tag.toUpperCase()) return false;
    const id = value.match(/#([\w-]+)/)?.[1];
    if (id && element.id !== id) return false;
    const className = value.match(/\.([\w-]+)/)?.[1];
    if (className && !element.classList.contains(className)) return false;
    for (const attr of value.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)) {
      if (!element.hasAttribute(attr[1]) || (attr[2] !== undefined && element.getAttribute(attr[1]) !== attr[2])) return false;
    }
    return true;
  });
}

class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.children = []; this.attrs = new Map();
    this.listeners = new Map(); this.style = {}; this._text = ''; this.value = ''; this.checked = false;
    const classes = () => new Set(this.className.split(/\s+/).filter(Boolean));
    this.classList = {
      contains: name => classes().has(name),
      add: (...names) => { this.className = [...new Set([...classes(), ...names])].join(' '); },
      remove: (...names) => { this.className = [...classes()].filter(x => !names.includes(x)).join(' '); },
      toggle: (name, force) => { const use = force ?? !classes().has(name); this.classList[use ? 'add' : 'remove'](name); return use; },
    };
    const attr = key => `data-${key.replace(/[A-Z]/g, x => `-${x.toLowerCase()}`)}`;
    this.dataset = new Proxy({}, { get: (_, key) => this.getAttribute(attr(key)) ?? undefined,
      set: (_, key, value) => { this.setAttribute(attr(key), value); return true; } });
  }
  get id() { return this.getAttribute('id') ?? ''; } set id(value) { this.setAttribute('id', value); }
  get className() { return this.getAttribute('class') ?? ''; } set className(value) { this.setAttribute('class', value); }
  get textContent() { return this._text + this.children.map(x => x.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get hidden() { return this.hasAttribute('hidden'); } set hidden(value) { value ? this.setAttribute('hidden', '') : this.attrs.delete('hidden'); }
  get disabled() { return this.hasAttribute('disabled'); } set disabled(value) { value ? this.setAttribute('disabled', '') : this.attrs.delete('disabled'); }
  get isConnected() { return this === this.ownerDocument || Boolean(this.parentNode?.isConnected); }
  setAttribute(key, value) { this.attrs.set(key, String(value)); }
  getAttribute(key) { return this.attrs.get(key) ?? null; }
  hasAttribute(key) { return this.attrs.has(key); }
  append(...nodes) { for (const node of nodes) { node.parentNode = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(matches(child, selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  closest(selector) { return matches(this, selector) ? this : this.parentNode?.closest(selector) ?? null; }
  contains(element) { return element === this || this.children.some(child => child.contains(element)); }
  addEventListener(type, listener) { const handlers = this.listeners.get(type) ?? new Set(); handlers.add(listener); this.listeners.set(type, handlers); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  dispatch(type, init = {}) {
    const event = { target: this, key: '', prevented: false, preventDefault() { this.prevented = true; }, ...init };
    const callbacks = [];
    let node = this;
    while (node) { for (const listener of node.listeners.get(type) ?? []) callbacks.push(listener(event)); node = node.parentNode; }
    return { event, callbacks };
  }
  focus() { this.ownerDocument.activeElement = this; }
  select() { this.selected = true; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

export function domFixture({ reducedMotion = false, clipboard = null } = {}) {
  const doc = new Element('document', null); doc.ownerDocument = doc;
  doc.createElement = name => new Element(name, doc);
  doc.createDocumentFragment = () => new Element('fragment', doc);
  const stack = [doc];
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const token of html.matchAll(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)) {
    const value = token[0];
    if (value.startsWith('<!')) continue;
    if (value.startsWith('</')) { stack.pop(); continue; }
    if (value.startsWith('<')) {
      const name = value.match(/^<([a-z0-9-]+)/i)?.[1];
      if (!name) continue;
      const element = doc.createElement(name);
      const attrs = value.slice(name.length + 1, -1);
      for (const match of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) element.setAttribute(match[1], match[2] ?? '');
      stack.at(-1).append(element);
      if (!['meta', 'link', 'input', 'br', 'hr'].includes(name) && !value.endsWith('/>')) stack.push(element);
    } else stack.at(-1)._text += value.trim();
  }
  doc.documentElement = doc.querySelector('html'); doc.body = doc.querySelector('body'); doc.activeElement = doc.body;
  const memory = memoryStorage(); const tasks = new Map(); let timer = 0;
  const win = { localStorage: memory.target, navigator: clipboard ? { clipboard } : {},
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: (callback, duration) => { const id = ++timer; tasks.set(id, { callback, duration }); return id; },
    clearTimeout: id => tasks.delete(id) };
  function flush(duration = Infinity) {
    for (const [id, task] of [...tasks]) if (task.duration <= duration) { tasks.delete(id); task.callback(); }
  }
  return { doc, win, memory, flush, ref: id => doc.querySelector(`#${id}`),
    click: element => element.dispatch('click'),
    key: (key, extra = {}) => doc.body.dispatch('keydown', { key, ...extra }) };
}
