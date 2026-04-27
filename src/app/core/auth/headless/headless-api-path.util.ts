/** Allauth app client base path under `API_BASE_URL` (X-Session-Token transport). */
export const HEADLESS_APP_AUTH_PATH_FRAGMENT = '/auth/app/v1/';

export function isHeadlessAppAuthUrl(url: string): boolean {
  return url.includes(HEADLESS_APP_AUTH_PATH_FRAGMENT);
}
