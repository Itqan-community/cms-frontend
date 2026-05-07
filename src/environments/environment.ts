export const environment = {
  production: false,
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
