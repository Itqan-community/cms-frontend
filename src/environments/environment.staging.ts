/**
 * On Netlify `staging.cms.itqan.dev`, API traffic is same-origin via `deploy/netlify/staging/_redirects`
 * so Django session cookies from `/accounts/.../callback` are visible to `/cms-api/...` XHR (split-host + SameSite=Lax fix).
 * Google/GitHub console + Django must allow `https://staging.cms.itqan.dev/accounts/.../callback` (see deploy/netlify/staging/_redirects).
 */
const STAGING_CMS_HOST = 'staging.cms.itqan.dev';

function stagingCmsOrigin(): string | undefined {
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return undefined;
  }
  return window.location.hostname === STAGING_CMS_HOST ? window.location.origin : undefined;
}

const cmsOrigin = stagingCmsOrigin();

export const environment = {
  production: false,
  oauthBrowserRedirectEnabled: true,
  API_BASE_URL: cmsOrigin ? `${cmsOrigin}/cms-api` : 'https://staging.api.cms.itqan.dev/cms-api',
  API_DOCS_URL: 'https://staging.api.cms.itqan.dev/docs',
  ADMIN_API_BASE_URL: cmsOrigin ? `${cmsOrigin}/portal` : 'https://staging.api.cms.itqan.dev/portal',
  sentryDsn:
    'https://dce9e26dda3c82231e15b1c029696db0@o4510669335232512.ingest.de.sentry.io/4511206115508304',
  webauthnReplaceRpIdWithHostname: false,
};
