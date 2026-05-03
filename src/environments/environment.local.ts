/**
 * Local Django: `python manage.py runserver 127.0.0.1:8000`
 * Set BE `FRONTEND_BASE_URL` to the SPA origin you open (e.g. http://localhost:4200).
 * For passkeys, prefer opening the app at http://localhost:4200 with `WEBAUTHN_RP_ID=localhost`.
 */
export const environment = {
  production: false,
  oauthBrowserRedirectEnabled: true,
  API_BASE_URL: 'http://127.0.0.1:8000/cms-api',
  API_DOCS_URL: 'http://127.0.0.1:8000/docs',
  ADMIN_API_BASE_URL: 'http://127.0.0.1:8000/portal',
  sentryDsn: '',
  /** Set `true` only if this API issues WebAuthn with `rp.id` / `rpId` equal to `location.hostname`. */
  webauthnReplaceRpIdWithHostname: false,
};
