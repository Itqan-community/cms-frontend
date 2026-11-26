import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { StateKey, TransferState, makeStateKey } from '@angular/core';

export type SsrLoadStatus = 'not_found' | 'error';

export function ssrStatusKey(scope: string, id: string | number): StateKey<SsrLoadStatus> {
  return makeStateKey<SsrLoadStatus>(`ssr:${scope}:${id}`);
}

/**
 * Reads and immediately removes an SSR failure status from `TransferState` on the browser so initial
 * hydration renders the same state as the server without refetching, while subsequent manual
 * retries still hit the network.
 */
export function consumeSsrStatus(
  platformId: object,
  transferState: TransferState,
  key: StateKey<SsrLoadStatus>
): SsrLoadStatus | null {
  if (!isPlatformBrowser(platformId) || !transferState.hasKey(key)) {
    return null;
  }
  const status = transferState.get(key, null);
  transferState.remove(key);
  return status;
}

/**
 * Records an SSR load failure in `TransferState` and sets the HTTP status on `RESPONSE_INIT`
 * (404 for missing entities when `allow404` is enabled, 503 for upstream backend failures).
 */
export function recordSsrError(
  platformId: object,
  transferState: TransferState,
  responseInit: { status?: number } | null,
  key: StateKey<SsrLoadStatus>,
  err: unknown,
  options?: { allow404?: boolean }
): SsrLoadStatus {
  const isNotFound =
    options?.allow404 !== false && err instanceof HttpErrorResponse && err.status === 404;
  const status: SsrLoadStatus = isNotFound ? 'not_found' : 'error';
  if (isPlatformServer(platformId)) {
    transferState.set(key, status);
    if (responseInit) {
      responseInit.status = isNotFound ? 404 : 503;
    }
  }
  return status;
}
