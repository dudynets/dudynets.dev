import {copyToClipboard} from './utils/copy';
import {macintosh} from './utils/platform-matchers';
import {isTouchDevice} from './utils/is-touch-device';
import {onIdle} from './utils/on-idle';
import {setAbortableTimeout} from './utils/set-abortable-timeout';

const DEFAULT_MODIFIER = 'Alt';
const MACINTOSH_MODIFIER = '⌥';

const TOOLTIP_TEXT = `${macintosh() ? MACINTOSH_MODIFIER : DEFAULT_MODIFIER} + click to copy`;
const COPIED_TEXT = 'Copied!';
const FAILED_TEXT = 'Failed to copy';

const TOOLTIP_HIDE_TIMEOUT = 2000;
const TOOLTIP_TEXT_RESET_TIMEOUT = TOOLTIP_HIDE_TIMEOUT + 150;

function getEmail(link: HTMLElement): string {
  const href = link.getAttribute('href');
  if (!href) return '';

  const email = href.split('mailto:').pop();
  return email ?? '';
}

function init() {
  if (isTouchDevice()) return;

  const emailLinks = Array.from(document.querySelectorAll('.email-link'));
  if (emailLinks.length === 0) return;

  emailLinks.forEach((link) => initLink(link as HTMLElement));
}

function initLink(link: HTMLElement) {
  link.setAttribute('data-tooltip', TOOLTIP_TEXT);

  const email = getEmail(link);
  let abortController = new AbortController();

  link.addEventListener('click', async (event) => {
    if (!event.altKey) return;
    event.preventDefault();

    const copied = await copyToClipboard(email);

    link.setAttribute('data-tooltip-visible', 'true');
    link.setAttribute('data-tooltip', copied ? COPIED_TEXT : FAILED_TEXT);

    if (abortController) abortController.abort();
    abortController = new AbortController();

    setAbortableTimeout(
      () => link.removeAttribute('data-tooltip-visible'),
      TOOLTIP_HIDE_TIMEOUT,
      abortController.signal,
    );

    setAbortableTimeout(
      () => link.setAttribute('data-tooltip', TOOLTIP_TEXT),
      TOOLTIP_TEXT_RESET_TIMEOUT,
      abortController.signal,
    );
  });
}

onIdle(() => init());
