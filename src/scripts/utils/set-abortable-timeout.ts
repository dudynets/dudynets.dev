export function setAbortableTimeout(
  callback: () => void,
  timeout: number,
  signal: AbortSignal,
): () => void {
  signal.addEventListener('abort', handleAbort);

  const internalTimer = setTimeout(internalCallback, timeout);

  function internalCallback(): void {
    signal.removeEventListener('abort', handleAbort);
    callback();
  }

  function handleAbort(): void {
    clearTimeout(internalTimer);
  }

  return () => handleAbort();
}
