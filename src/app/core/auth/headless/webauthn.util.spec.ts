import { publicKeyCredentialCreationToJson, publicKeyCredentialToJson } from './webauthn.util';

function utf8Buf(s: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(s);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe('webauthn.util credential JSON', () => {
  describe('publicKeyCredentialCreationToJson', () => {
    it('matches @github/webauthn-json attestation response (no publicKey / publicKeyAlgorithm)', () => {
      const attResp = {
        clientDataJSON: utf8Buf('cd'),
        attestationObject: utf8Buf('ao'),
        getTransports: () => ['internal' as AuthenticatorTransport],
      } as unknown as AuthenticatorAttestationResponse;

      const cred = {
        type: 'public-key',
        id: 'cred-id',
        rawId: utf8Buf('rid'),
        response: attResp,
        getClientExtensionResults: () => ({}),
      } as unknown as PublicKeyCredential;

      const json = publicKeyCredentialCreationToJson(cred) as {
        credential: { response: Record<string, unknown> };
      };

      expect(Object.keys(json.credential.response).sort()).toEqual(
        ['attestationObject', 'clientDataJSON', 'transports'].sort()
      );
      expect(json.credential.response['transports']).toEqual(['internal']);
      expect(json.credential.response['publicKey']).toBeUndefined();
      expect(json.credential.response['publicKeyAlgorithm']).toBeUndefined();
    });

    it('omits authenticatorAttachment when unset', () => {
      const attResp = {
        clientDataJSON: utf8Buf('a'),
        attestationObject: utf8Buf('b'),
        getTransports: () => [],
      } as unknown as AuthenticatorAttestationResponse;

      const cred = {
        type: 'public-key',
        id: 'id',
        rawId: utf8Buf('r'),
        response: attResp,
        getClientExtensionResults: () => ({}),
      } as unknown as PublicKeyCredential;

      const json = publicKeyCredentialCreationToJson(cred) as {
        credential: Record<string, unknown>;
      };
      expect(json.credential['authenticatorAttachment']).toBeUndefined();
    });
  });

  describe('publicKeyCredentialToJson', () => {
    it('serializes userHandle as null when buffer is empty', () => {
      const empty = new ArrayBuffer(0);
      const assertResp = {
        clientDataJSON: utf8Buf('c'),
        authenticatorData: utf8Buf('d'),
        signature: utf8Buf('s'),
        userHandle: empty,
      } as unknown as AuthenticatorAssertionResponse;

      const cred = {
        type: 'public-key',
        id: 'id',
        rawId: utf8Buf('r'),
        response: assertResp,
        getClientExtensionResults: () => ({}),
      } as unknown as PublicKeyCredential;

      const json = publicKeyCredentialToJson(cred) as {
        credential: { response: { userHandle: unknown } };
      };
      expect(json.credential.response.userHandle).toBeNull();
    });
  });
});
