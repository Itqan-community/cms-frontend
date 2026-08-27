/**
 * On Cloudflare Pages staging (`staging.cms.itqan.dev`, `cms-frontend-staging.pages.dev`),
 * API traffic is same-origin via repo-root `functions/` proxies so Django session cookies from
 * `/accounts/.../callback` are visible to `/cms-api/...` XHR (split-host + SameSite=Lax fix).
 * Google/GitHub console + Django must allow `https://<staging-host>/accounts/.../callback`.
 */
const STAGING_CMS_HOSTS = ['staging.cms.itqan.dev', 'cms-frontend-staging.pages.dev'] as const;
const STAGING_CMS_HOST = STAGING_CMS_HOSTS[0];

function stagingCmsOrigin(): string | undefined {
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return undefined;
  }

  return (STAGING_CMS_HOSTS as readonly string[]).includes(window.location.hostname)
    ? window.location.origin
    : undefined;
}

const cmsOrigin = stagingCmsOrigin();

export const environment = {
  production: false,
  SITE_URL: cmsOrigin ?? `https://${STAGING_CMS_HOST}`,
  API_BASE_URL: cmsOrigin ? `${cmsOrigin}/cms-api` : 'https://staging.api.cms.itqan.dev/cms-api',
  API_DOCS_URL: 'https://docs.cms.itqan.dev',
  ADMIN_API_BASE_URL: cmsOrigin
    ? `${cmsOrigin}/portal`
    : 'https://staging.api.cms.itqan.dev/portal',
  sentryDsn:
    'https://dce9e26dda3c82231e15b1c029696db0@o4510669335232512.ingest.de.sentry.io/4511206115508304',
  webauthnReplaceRpIdWithHostname: false,
  useProgramsMockApi: true,
};
