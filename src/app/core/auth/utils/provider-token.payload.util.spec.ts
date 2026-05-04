import {
  ALLAUTH_SOCIAL_PROVIDER_GITHUB,
  ALLAUTH_SOCIAL_PROVIDER_GOOGLE,
} from '../headless/allauth-urls';
import {
  buildGoogleProviderTokenRequestBody,
  buildGithubProviderTokenRequestBody,
} from './provider-token.payload.util';

describe('provider-token.payload.util', () => {
  it('buildGoogleProviderTokenRequestBody nests id_token and client_id', () => {
    expect(
      buildGoogleProviderTokenRequestBody('login', 'jwt.val', '  cid.apps.example  ')
    ).toEqual({
      provider: ALLAUTH_SOCIAL_PROVIDER_GOOGLE,
      process: 'login',
      token: { id_token: 'jwt.val', client_id: 'cid.apps.example' },
    });
  });

  it('buildGithubProviderTokenRequestBody uses string token', () => {
    expect(buildGithubProviderTokenRequestBody('connect', 'gho_abc')).toEqual({
      provider: ALLAUTH_SOCIAL_PROVIDER_GITHUB,
      process: 'connect',
      token: 'gho_abc',
    });
  });
});
