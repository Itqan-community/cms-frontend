export const environment = {
  production: false,
  /** App mode: browser OAuth redirect is only enabled when backend + SPA callback flow are wired. */
  oauthBrowserRedirectEnabled: false,
  /**
   * When true **and** `googleClientId` is set, Google uses GSI → `POST .../auth/app/v1/auth/provider/token`
   * (JWT `session_token`). Otherwise Google falls back to browser redirect when `oauthBrowserRedirectEnabled`.
   */
  socialGoogleUseAppToken: false,
  /** OAuth 2 Web client ID (same as backend `GOOGLE_CLIENT_ID`). Public; empty disables app-token Google. */
  googleClientId: '',
  API_BASE_URL: 'https://staging.api.cms.itqan.dev/cms-api',
  API_DOCS_URL: 'https://staging.api.cms.itqan.dev/docs',
  ADMIN_API_BASE_URL: 'https://staging.api.cms.itqan.dev/portal',
  sentryDsn: '',
  /**
   * Set `true` only when the API issues WebAuthn with `rp.id` / `rpId` matching `location.hostname`
   * (e.g. `localhost`). Replacing RP ID here without a matching server config will fail verification.
   */
  webauthnReplaceRpIdWithHostname: false,
};
