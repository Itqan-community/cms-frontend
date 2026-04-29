export const environment = {
  production: false,
  API_BASE_URL: 'https://elated-lugged-frays.ngrok-free.dev/cms-api',
  API_DOCS_URL: 'https://elated-lugged-frays.ngrok-free.dev/docs',
  ADMIN_API_BASE_URL: 'https://elated-lugged-frays.ngrok-free.dev/portal',
  sentryDsn:
    'https://dce9e26dda3c82231e15b1c029696db0@o4510669335232512.ingest.de.sentry.io/4511206115508304',
  /** Set `true` only if this API issues WebAuthn with `rp.id` / `rpId` equal to `location.hostname`. */
  webauthnReplaceRpIdWithHostname: false,
};
