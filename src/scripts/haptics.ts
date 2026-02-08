import {onDOMLoaded} from './utils/on-dom-loaded';
import {iOS, iPadOS} from './utils/platform-matchers';

const INPUT_ID = '_haptics-input';
const HAPTICS_TRIGGER_SELECTOR = 'a, [data-haptics="true"]';

let input: HTMLInputElement | null = null;
let label: HTMLLabelElement | null = null;

let initialized = false;

function isSupported() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined')
    return false;

  const preferesReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  return (iOS() || iPadOS()) && !preferesReducedMotion;
}

function performClickHaptics() {
  if (!isSupported()) return;

  if (!initialized) init();
  label?.click();
}

function init() {
  if (!isSupported() || initialized) return;

  input = document.createElement('input');
  input.type = 'checkbox';
  input.id = INPUT_ID;
  input.setAttribute('switch', '');
  input.style.display = 'none';
  input.setAttribute('aria-hidden', 'true');
  input.setAttribute('role', 'presentation');
  document.body.appendChild(input);

  label = document.createElement('label');
  label.htmlFor = INPUT_ID;
  label.style.display = 'none';
  label.setAttribute('aria-hidden', 'true');
  label.setAttribute('role', 'presentation');
  document.body.appendChild(label);

  initialized = true;
}

function setListeners() {
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest(HAPTICS_TRIGGER_SELECTOR)) performClickHaptics();
  });
}

onDOMLoaded(() => {
  init();
  setListeners();
});
