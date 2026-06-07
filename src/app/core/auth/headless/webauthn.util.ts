import { environment } from '../../../../environments/environment';
import type {
  WebAuthnCredentialCreationData,
  WebAuthnCredentialRequestData,
} from './headless-api.types';
import { assertOrPatchCreationRpId, assertOrPatchRequestRpId } from './webauthn-rp-id.util';

/**
 * Build JSON-serializable credential for django-allauth headless.
 */
export function publicKeyCredentialToJson(cred: PublicKeyCredential): unknown {
  const response = cred.response as AuthenticatorAssertionResponse;
  const attachment = (cred as PublicKeyCredential & { authenticatorAttachment?: string })
    .authenticatorAttachment;
  const userHandle =
    response.userHandle != null && response.userHandle.byteLength > 0
      ? bufferToBase64url(response.userHandle)
      : null;
  const credential: Record<string, unknown> = {
    type: cred.type,
    id: cred.id,
    rawId: bufferToBase64url(cred.rawId),
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      authenticatorData: bufferToBase64url(response.authenticatorData),
      signature: bufferToBase64url(response.signature),
      userHandle,
    },
    clientExtensionResults: cred.getClientExtensionResults(),
  };
  if (attachment != null && attachment !== '') {
    credential['authenticatorAttachment'] = attachment;
  }
  return {
    credential,
  };
}

/**
 * Build JSON-serializable credential creation payload for django-allauth headless.
 */
export function publicKeyCredentialCreationToJson(cred: PublicKeyCredential): unknown {
  const response = cred.response as AuthenticatorAttestationResponse;
  const attachment = (cred as PublicKeyCredential & { authenticatorAttachment?: string })
    .authenticatorAttachment;
  const transports =
    typeof response.getTransports === 'function' ? response.getTransports.call(response) : [];
  const credential: Record<string, unknown> = {
    type: cred.type,
    id: cred.id,
    rawId: bufferToBase64url(cred.rawId),
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      attestationObject: bufferToBase64url(response.attestationObject),
      transports,
    },
    clientExtensionResults: cred.getClientExtensionResults(),
  };
  if (attachment != null && attachment !== '') {
    credential['authenticatorAttachment'] = attachment;
  }
  return {
    credential,
  };
}

function bufferToBase64url(buf: ArrayBufferLike): string {
  const bytes = new Uint8Array(buf);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** `PublicKeyCredentialCreationOptionsJSON`-style payload (base64url strings, not `ArrayBuffer`). */
function looksLikePublicKeyCredentialCreationOptionsJSON(o: unknown): boolean {
  if (!o || typeof o !== 'object') {
    return false;
  }
  const x = o as Record<string, unknown>;
  if (typeof x['challenge'] !== 'string') {
    return false;
  }
  if (!x['rp'] || typeof x['rp'] !== 'object') {
    return false;
  }
  if (!x['user'] || typeof x['user'] !== 'object') {
    return false;
  }
  const u = x['user'] as Record<string, unknown>;
  return typeof u['id'] === 'string';
}

/**
 * Resolves the creation-options blob from the headless envelope (OpenAPI vs legacy).
 */
function extractCreationOptionsBlob(data: WebAuthnCredentialCreationData): unknown {
  const d = data as unknown as Record<string, unknown>;
  if (d['creation_options'] != null) {
    return d['creation_options'];
  }
  const ro = d['request_options'] as Record<string, unknown> | undefined;
  if (ro?.['publicKey'] != null) {
    return ro['publicKey'];
  }
  if (ro != null && typeof ro === 'object') {
    return ro;
  }
  return undefined;
}

/**
 * WebAuthn L3 JSON helpers expect **top-level** `PublicKeyCredentialRequestOptionsJSON`, not `{ publicKey: ... }`.
 */
function toRequestOptionsJSONInput(req: unknown): unknown {
  if (!req || typeof req !== 'object') {
    return req;
  }
  const o = req as Record<string, unknown>;
  if (typeof o['challenge'] === 'string') {
    return req;
  }
  if (o['publicKey'] != null && typeof o['publicKey'] === 'object') {
    return o['publicKey'];
  }
  return req;
}

function currentHostname(): string {
  return typeof globalThis !== 'undefined' && 'location' in globalThis
    ? (globalThis as unknown as Window).location.hostname
    : '';
}

function replaceRpIdWithHostname(): boolean {
  return environment.webauthnReplaceRpIdWithHostname === true;
}

/** Uses browser `parseRequestOptionsFromJSON` when available. */
export async function getWebAuthnRequestOptions(
  data: WebAuthnCredentialRequestData
): Promise<PublicKeyCredentialRequestOptions> {
  const pkc = PublicKeyCredential as unknown as {
    parseRequestOptionsFromJSON?: (x: unknown) => Promise<PublicKeyCredentialRequestOptions>;
  };
  const req = data.request_options;
  if (typeof pkc.parseRequestOptionsFromJSON === 'function' && req != null) {
    let input = toRequestOptionsJSONInput(req);
    if (input != null && typeof input === 'object') {
      const clone = structuredClone(input) as Record<string, unknown>;
      assertOrPatchRequestRpId(clone, currentHostname(), replaceRpIdWithHostname());
      input = clone;
    }
    return await pkc.parseRequestOptionsFromJSON(input);
  }
  const raw = data.request_options.publicKey;
  if (raw != null && typeof raw === 'object') {
    const pk = structuredClone(raw) as Record<string, unknown>;
    assertOrPatchRequestRpId(pk, currentHostname(), replaceRpIdWithHostname());
    return Promise.resolve(pk as unknown as PublicKeyCredentialRequestOptions);
  }
  return Promise.resolve({
    ...(data.request_options.publicKey as PublicKeyCredentialRequestOptions),
  });
}

/** Uses browser `parseCreationOptionsFromJSON` when the server sends `PublicKeyCredentialCreationOptionsJSON`. */
export async function getWebAuthnCreationOptions(
  data: WebAuthnCredentialCreationData
): Promise<PublicKeyCredentialCreationOptions> {
  let blob = extractCreationOptionsBlob(data);
  if (blob != null && typeof blob === 'object') {
    const o = blob as Record<string, unknown>;
    if (
      typeof o['challenge'] !== 'string' &&
      o['publicKey'] != null &&
      typeof o['publicKey'] === 'object'
    ) {
      blob = o['publicKey'];
    }
  }

  if (blob != null && typeof blob === 'object') {
    blob = structuredClone(blob) as Record<string, unknown>;
    assertOrPatchCreationRpId(
      blob as Record<string, unknown>,
      currentHostname(),
      replaceRpIdWithHostname()
    );
  }

  const pkc = PublicKeyCredential as unknown as {
    parseCreationOptionsFromJSON?: (x: unknown) => Promise<PublicKeyCredentialCreationOptions>;
  };

  if (looksLikePublicKeyCredentialCreationOptionsJSON(blob)) {
    if (typeof pkc.parseCreationOptionsFromJSON === 'function') {
      return await pkc.parseCreationOptionsFromJSON(blob);
    }
  }

  if (blob != null && typeof blob === 'object') {
    return Promise.resolve({ ...(blob as PublicKeyCredentialCreationOptions) });
  }

  throw new Error('WebAuthn: missing credential creation options');
}
