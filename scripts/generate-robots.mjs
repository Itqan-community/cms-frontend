// Writes dist/browser/robots.txt based on Netlify's CONTEXT env var, so
// PR previews (deploy-preview), arbitrary branch deploys, and any
// non-production context never ship the production sitemap URL.
// Netlify sets CONTEXT to 'production', 'deploy-preview', 'branch-deploy',
// or the matching [context.<name>] key (e.g. 'staging', 'publisher').
import { writeFileSync } from 'node:fs';

const context = process.env.CONTEXT ?? 'local';
const outPath = 'dist/browser/robots.txt';

const PRODUCTION_ROBOTS = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /accounts/
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
