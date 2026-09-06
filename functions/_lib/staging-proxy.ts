export const STAGING_PROXY_HOSTS = [
  'staging.cms.itqan.dev',
  'cms-frontend-staging.pages.dev',
] as const;

export const STAGING_API_ORIGIN = 'https://staging.api.cms.itqan.dev';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

const FORWARD_REQUEST_HEADERS = [
  'accept',
  'accept-encoding',
  'accept-language',
  'authorization',
  'content-type',
  'content-length',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-csrftoken',
  'x-session-token',
  'x-requested-with',
];

export function isStagingProxyHost(hostname: string): boolean {
  return (STAGING_PROXY_HOSTS as readonly string[]).includes(hostname);
}

export async function proxyToStagingApi(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (!isStagingProxyHost(url.hostname)) {
    return new Response('Not Found', { status: 404 });
  }

  const upstreamUrl = new URL(`${url.pathname}${url.search}`, STAGING_API_ORIGIN);
  const headers = new Headers();

  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower.startsWith('x-') && !headers.has(lower) && !HOP_BY_HOP_HEADERS.has(lower)) {
      headers.set(key, value);
    }
  });

  headers.set('X-Forwarded-Host', url.hostname);
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

  const clientIp =
    request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For');
  if (clientIp) {
    headers.set('X-Forwarded-For', clientIp);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  const upstreamResponse = await fetch(upstreamUrl.toString(), init);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}
