export const environment = {
  production: false,
  // Publisher builds run on arbitrary tenant subdomains/custom domains — leave empty so
  // SeoService falls back to `window.location.origin` at runtime instead of a fixed host.
  SITE_URL: '',
  API_BASE_URL: 'https://staging.api.cms.itqan.dev/cms-api',
  API_DOCS_URL: 'https://staging.api.cms.itqan.dev/developers-api/docs',
  ADMIN_API_BASE_URL: 'https://staging.api.cms.itqan.dev/portal',
  sentryDsn: '',
  webauthnReplaceRpIdWithHostname: false,
};
