import {onDOMLoaded} from './on-dom-loaded';

export function onIdle(callback: () => void) {
  onDOMLoaded(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback);
    } else {
      setTimeout(callback, 0);
    }
  });
}
