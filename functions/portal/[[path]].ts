import type { PagesFunction } from '@cloudflare/workers-types';

import { proxyToStagingApi } from '../_lib/staging-proxy';

interface Env {
  ASSETS: Fetcher;
}

function isPortalInvitationAcceptRoute(pathname: string): boolean {
  return pathname === '/portal/invitations/accept' || pathname === '/portal/invitations/accept/';
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (isPortalInvitationAcceptRoute(url.pathname)) {
    return env.ASSETS.fetch(new URL('/index.html', request.url));
  }

  return proxyToStagingApi(request);
};
