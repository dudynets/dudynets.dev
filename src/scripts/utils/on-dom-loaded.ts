export function onDOMLoaded(callback: () => void) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, {once: true});
  } else {
    callback();
  }
}
