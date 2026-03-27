import {onIdle} from './utils/on-idle';

const TIMEZONE = 'Europe/Kyiv';
const UPDATE_INTERVAL_MS = 1_000;

function formatLocalTime(): string {
  const now = new Date();

  const time = now.toLocaleTimeString(undefined, {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
  });

  const date = now.toLocaleDateString(undefined, {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
  });

  return `${time} • ${date}`;
}

function init() {
  const element = document.querySelector('.local-time');
  if (!element) return;

  element.setAttribute('tabindex', '0');
  element.setAttribute('role', 'note');
  element.setAttribute('data-haptics', 'true');

  const update = () => {
    const text = formatLocalTime();

    element.setAttribute('data-tooltip', text);
    element.setAttribute(
      'aria-label',
      `${element.textContent} (local time: ${text})`,
    );
  };

  update();
  setInterval(update, UPDATE_INTERVAL_MS);
}

onIdle(() => init());
