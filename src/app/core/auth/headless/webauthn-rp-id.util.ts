/**
 * WebAuthn: RP ID must be the current host or a registrable parent of it.
 * See https://www.w3.org/TR/webauthn/#rp-id — mismatch (e.g. API returns prod rp.id while you use localhost) causes SecurityError.
 */

export class WebAuthnRpIdMismatchError extends Error {
  override readonly name = 'WebAuthnRpIdMismatchError';

  constructor(
    readonly rpId: string,
    readonly hostname: string
  ) {
    super(`WebAuthn rp.id "${rpId}" is not valid for host "${hostname}".`);
  }
}

/** Suffix check only; omits full PSL (good enough for common localhost / subdomain cases). */
export function isRpIdAllowedForHostname(rpId: string, hostname: string): boolean {
  if (rpId === hostname) {
    return true;
  }
  if (hostname.length > rpId.length + 1 && hostname.endsWith('.' + rpId)) {
    return true;
  }
  return false;
}

function creationRpId(o: Record<string, unknown>): string | undefined {
  const rp = o['rp'];
  if (!rp || typeof rp !== 'object') {
    return undefined;
  }
  const id = (rp as Record<string, unknown>)['id'];
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

function requestRpId(o: Record<string, unknown>): string | undefined {
  const id = o['rpId'];
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

/**
 * @param replaceWithHostname — only when API is configured to verify attestations for that RP ID (e.g. dev).
 */
export function assertOrPatchCreationRpId(
  o: Record<string, unknown>,
  hostname: string,
  replaceWithHostname: boolean
): void {
  if (!hostname) {
    return;
  }
  const rpId = creationRpId(o);
  if (rpId === undefined) {
    return;
  }
  if (isRpIdAllowedForHostname(rpId, hostname)) {
    return;
  }
  if (replaceWithHostname) {
    const rp = o['rp'];
    if (rp && typeof rp === 'object') {
      (rp as Record<string, unknown>)['id'] = hostname;
    }
    return;
  }
  throw new WebAuthnRpIdMismatchError(rpId, hostname);
}

export function assertOrPatchRequestRpId(
  o: Record<string, unknown>,
  hostname: string,
  replaceWithHostname: boolean
): void {
  if (!hostname) {
    return;
  }
  const rpId = requestRpId(o);
  if (rpId === undefined) {
    return;
  }
  if (isRpIdAllowedForHostname(rpId, hostname)) {
    return;
  }
  if (replaceWithHostname) {
    o['rpId'] = hostname;
    return;
  }
  throw new WebAuthnRpIdMismatchError(rpId, hostname);
}
