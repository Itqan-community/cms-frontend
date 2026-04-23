/**
 * Build JSON-serializable credential for django-allauth headless.
 */
export function publicKeyCredentialToJson(cred: PublicKeyCredential): unknown {
  const response = cred.response as AuthenticatorAssertionResponse;
  return {
    credential: {
      type: cred.type,
      id: cred.id,
      rawId: bufferToBase64url(cred.rawId),
      authenticatorAttachment: (cred as PublicKeyCredential & { authenticatorAttachment?: string })
        .authenticatorAttachment,
      response: {
        clientDataJSON: bufferToBase64url(response.clientDataJSON),
        authenticatorData: bufferToBase64url(response.authenticatorData),
        signature: bufferToBase64url(response.signature),
        userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
      },
      clientExtensionResults: cred.getClientExtensionResults(),
    },
  };
}

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

import type { WebAuthnCredentialRequestData } from './headless-api.types';

/** Uses browser `parseRequestOptionsFromJSON` when available. */
export async function getWebAuthnRequestOptions(
  data: WebAuthnCredentialRequestData
): Promise<PublicKeyCredentialRequestOptions> {
  const pkc = PublicKeyCredential as unknown as {
    parseRequestOptionsFromJSON?: (x: unknown) => Promise<PublicKeyCredentialRequestOptions>;
  };
  if (typeof pkc.parseRequestOptionsFromJSON === 'function') {
    return await pkc.parseRequestOptionsFromJSON(data.request_options);
  }
  const pk = data.request_options.publicKey as PublicKeyCredentialRequestOptions;
  return Promise.resolve({ ...pk });
}
