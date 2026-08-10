/** sessionStorage key: one automatic reload after a chunk/module-import failure. */
export const CHUNK_LOAD_RECOVERY_FLAG = 'cms.chunkLoadRecoveryAttempted';

const CHUNK_LOAD_MESSAGE_PATTERNS: RegExp[] = [
  /Importing a module script failed/i,
  /Loading chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /ChunkLoadError/i,
];

function errorMessage(error: unknown): string {
  if (error == null) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message || error.name || '';
  }
  if (typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return String(error);
}

/** True when the error is a failed lazy chunk / dynamic module import. */
export function isChunkLoadError(error: unknown): boolean {
  const message = errorMessage(error);
  if (CHUNK_LOAD_MESSAGE_PATTERNS.some((re) => re.test(message))) {
    return true;
  }
  if (error instanceof Error && error.name === 'ChunkLoadError') {
    return true;
  }
  return false;
}

/**
 * On first chunk/module-import failure in this tab, hard-reload once.
 * Returns true when recovery was triggered (caller should not rethrow/report).
 */
export function tryRecoverFromChunkLoadError(
  error: unknown,
  storage: Storage = sessionStorage,
  reload: () => void = () => location.reload()
): boolean {
  if (!isChunkLoadError(error)) {
    return false;
  }
  try {
    if (storage.getItem(CHUNK_LOAD_RECOVERY_FLAG) === '1') {
      return false;
    }
    storage.setItem(CHUNK_LOAD_RECOVERY_FLAG, '1');
  } catch {
    // Private mode / blocked storage: still attempt a single reload path via flag miss.
  }
  reload();
  return true;
}
