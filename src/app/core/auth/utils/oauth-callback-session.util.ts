import type { AuthenticatedOrChallenge } from '../headless/headless-auth-api.service';
import { authInfo } from '../headless/allauth-auth.hooks';

/**
 * True when a headless session envelope already carries a **user** and is “logged in” per allauth
 * (`200`, or **`401` + `meta.is_authenticated`** for continuation envelopes). Used after OAuth return
 * so we prefer a cookie/browser session response over an anonymous app `/session` read.
 */
export function isOauthReturnSessionEstablished(res: AuthenticatedOrChallenge): boolean {
  const info = authInfo(res);
  if (!info.user) {
    return false;
  }
  if (res.status === 200) {
    return true;
  }
  if (res.status === 401 && res.meta?.is_authenticated === true) {
    return true;
  }
  return false;
}
