import {onDOMLoaded} from './utils/on-dom-loaded';

const NO_MOTION_CLASS = 'no-motion';

onDOMLoaded(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove(NO_MOTION_CLASS);
    });
  });
});
