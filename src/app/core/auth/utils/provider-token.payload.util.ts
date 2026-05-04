import {
  ALLAUTH_SOCIAL_PROVIDER_GITHUB,
  ALLAUTH_SOCIAL_PROVIDER_GOOGLE,
} from '../headless/allauth-urls';

export type ProviderTokenRequestBody =
  | {
      provider: typeof ALLAUTH_SOCIAL_PROVIDER_GOOGLE;
      process: 'login' | 'connect';
      token: { id_token: string; client_id: string };
    }
  | {
      provider: typeof ALLAUTH_SOCIAL_PROVIDER_GITHUB;
      process: 'login' | 'connect';
      token: string;
    };

export function buildGoogleProviderTokenRequestBody(
  process: 'login' | 'connect',
  idToken: string,
  clientId: string
): ProviderTokenRequestBody {
  return {
    provider: ALLAUTH_SOCIAL_PROVIDER_GOOGLE,
    process,
    token: {
      id_token: idToken,
      client_id: clientId.trim(),
    },
  };
}

export function buildGithubProviderTokenRequestBody(
  process: 'login' | 'connect',
  accessToken: string
): ProviderTokenRequestBody {
  return {
    provider: ALLAUTH_SOCIAL_PROVIDER_GITHUB,
    process,
    token: accessToken,
  };
}
