import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Set on a request whose caller shows its own error message, so the global toast stays quiet. */
export const CALLER_SHOWS_ERRORS = new HttpContextToken<boolean>(() => false);

export function callerShowsErrors(): HttpContext {
  return new HttpContext().set(CALLER_SHOWS_ERRORS, true);
}
