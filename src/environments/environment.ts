export const environment = {
  production: false,
  SITE_URL: 'http://localhost:4200',
  API_BASE_URL: 'https://staging.api.cms.itqan.dev/cms-api',
  API_DOCS_URL: 'https://docs.cms.itqan.dev',
  ADMIN_API_BASE_URL: 'https://staging.api.cms.itqan.dev/portal',
  sentryDsn: '',
  /**
   * Set `true` only when the API issues WebAuthn with `rp.id` / `rpId` matching `location.hostname`
   * (e.g. `localhost`). Replacing RP ID here without a matching server config will fail verification.
   */
  webauthnReplaceRpIdWithHostname: false,
  /** In-memory programs CRUD until portal programs API is live. */
  useProgramsMockApi: true,
  /**
   * Recitation folder public visibility toggle. Off until the portal API exposes
   * `is_visible` on folders — a toggle that cannot actually hide a folder would tell
   * admins something untrue, so the control is not rendered rather than mocked.
   */
  recitationFolderVisibility: true,
};
