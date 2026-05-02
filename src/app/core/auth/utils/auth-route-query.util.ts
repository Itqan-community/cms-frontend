import type { ParamMap } from '@angular/router';

/** Official SPA uses `next`; legacy CMS used `returnUrl`. */
export function readContinueUrl(params: ParamMap): string {
  const raw = params.get('next') || params.get('returnUrl') || '/gallery';
  return raw.startsWith('/') ? raw : '/gallery';
}
