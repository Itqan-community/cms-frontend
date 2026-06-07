import {
  assertOrPatchCreationRpId,
  assertOrPatchRequestRpId,
  WebAuthnRpIdMismatchError,
  isRpIdAllowedForHostname,
} from './webauthn-rp-id.util';

describe('webauthn-rp-id.util', () => {
  it('isRpIdAllowedForHostname allows exact match', () => {
    expect(isRpIdAllowedForHostname('localhost', 'localhost')).toBe(true);
    expect(isRpIdAllowedForHostname('cms.itqan.dev', 'cms.itqan.dev')).toBe(true);
  });

  it('isRpIdAllowedForHostname allows subdomain of rpId', () => {
    expect(isRpIdAllowedForHostname('itqan.dev', 'app.itqan.dev')).toBe(true);
  });

  it('isRpIdAllowedForHostname rejects unrelated domains', () => {
    expect(isRpIdAllowedForHostname('cms.itqan.dev', 'localhost')).toBe(false);
    expect(isRpIdAllowedForHostname('itqan.dev', 'localhost')).toBe(false);
  });

  it('assertOrPatchCreationRpId throws when mismatch and not replacing', () => {
    const o = {
      rp: { id: 'cms.itqan.dev', name: 'x' },
      challenge: 'x',
      user: { id: '1', name: 'u' },
    };
    expect(() =>
      assertOrPatchCreationRpId(o as unknown as Record<string, unknown>, 'localhost', false)
    ).toThrowError(WebAuthnRpIdMismatchError);
  });

  it('assertOrPatchCreationRpId patches rp.id when replacing', () => {
    const o = {
      rp: { id: 'cms.itqan.dev', name: 'x' },
      challenge: 'x',
      user: { id: '1', name: 'u' },
    };
    assertOrPatchCreationRpId(o as unknown as Record<string, unknown>, 'localhost', true);
    expect((o.rp as { id: string }).id).toBe('localhost');
  });

  it('assertOrPatchRequestRpId patches rpId when replacing', () => {
    const o = { rpId: 'cms.itqan.dev', challenge: 'x' };
    assertOrPatchRequestRpId(o as Record<string, unknown>, 'localhost', true);
    expect(o['rpId']).toBe('localhost');
  });
});
