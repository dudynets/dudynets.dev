export function iOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function iPadOS() {
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function macintosh() {
  return navigator.userAgent.toLowerCase().includes('mac');
}
