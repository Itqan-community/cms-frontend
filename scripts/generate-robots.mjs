// Writes dist/browser/robots.txt based on the deployment CONTEXT env var so
// PR previews, staging, and arbitrary branch deploys never advertise indexing or
// point crawlers at the production sitemap URL.
import { writeFileSync } from 'node:fs';

const context = process.env.CONTEXT ?? 'local';
const outPath = 'dist/browser/robots.txt';

const PRODUCTION_ROBOTS = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /account/
Disallow: /accounts/
Disallow: /portal/
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /login-by-code
Disallow: /mfa
Disallow: /passkey
Disallow: /reauthenticate
Disallow: /provider-signup
Disallow: /auth/
Disallow: /complete-profile
Disallow: /unauthorized

Sitemap: https://cms.itqan.dev/sitemap.xml
`;

const DISALLOW_ALL_ROBOTS = `User-agent: *
Disallow: /
`;

const content = context === 'production' ? PRODUCTION_ROBOTS : DISALLOW_ALL_ROBOTS;

writeFileSync(outPath, content);
console.log(`generate-robots: wrote ${outPath} for context "${context}"`);
