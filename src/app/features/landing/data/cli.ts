/**
 * How the landing pages name the package-manager CLI (decided: show `quran-cli`, C11). The package
 * names are the agreed C11 names; until C11 ships, the published CLI is still `itqan`.
 */
export const CLI = {
  name: 'quran-cli',
  npm: 'npm install --save-dev quran-cli',
  brew: 'brew install itqan-community/tap/quran-cli',
  pipx: 'pipx install quran-cli',
  uv: 'uv tool install quran-cli',
  dart: 'dart pub global activate quran_cli',
  action: 'itqan-community/setup-quran-cli@v1',
} as const;

/** The public API host shown in the curl examples (the API hosts do not move with the rebrand). */
export const PUBLIC_API_URL = 'https://api.cms.itqan.dev';

export const CONTACT_EMAIL = 'connect@itqan.dev';
