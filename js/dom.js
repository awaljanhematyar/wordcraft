/** Avoid rewriting unchanged DOM state, preserving focus and reducing mutation/accessibility noise. */
export function property(element, name, value) {
  if (element[name] !== value) element[name] = value;
}
export function attribute(element, name, value) {
  const text = String(value);
  if (element.getAttribute(name) !== text) element.setAttribute(name, text);
}
export function toggleClass(element, name, enabled) {
  if (element.classList.contains(name) !== enabled) element.classList.toggle(name, enabled);
}
