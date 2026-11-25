import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { NextFunction, Request, Response as ExpressResponse } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline, Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import {
  hasRequestLanguageQuery,
  isPublicSsrPath,
  LANG_QUERY_PARAM,
  normalizeUiLanguage,
  resolveRequestLanguage,
  resolveRequestTheme,
  SsrRequestContext,
} from './app/core/i18n/ui-language';
import { createCachedSitemapLoader } from './app/core/ssr/sitemap.util';
import { environment } from './environments/environment';

/**
 * SSR server: public pages render here (see app.routes.server.ts); the rest gets the client shell.
 *
 * Env:
 * - `PORT` (default 4000)
 * - `ALLOWED_HOSTS` / `NG_ALLOWED_HOSTS` (optional comma-separated extra hostnames for Host validation)
 * - `TRUST_PROXY_HOPS` (default 2, e.g. Cloudflare -> Caddy -> Node)
 * - `API_PROXY_ORIGIN` (optional, e.g. https://staging.api.cms.itqan.dev): serve `/cms-api`,
 *   `/accounts` and `/portal` same-origin by proxying them there, like the staging Pages
 *   Functions in `functions/`. Must be the origin of the build's `API_BASE_URL`.
 */
const browserDistFolder = join(import.meta.dirname, '../browser');
let csrShell: string | null = null;
const apiProxyOrigin = process.env['API_PROXY_ORIGIN']?.replace(/\/+$/, '') || null;

function parseHostList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function buildAllowedHosts(): string[] {
  const hosts = new Set<string>();
  try {
    if (environment.SITE_URL) {
      hosts.add(new URL(environment.SITE_URL).hostname.toLowerCase());
    }
  } catch {
    /* ignore invalid build-time SITE_URL */
  }
  for (const h of [
    ...parseHostList(process.env['ALLOWED_HOSTS']),
    ...parseHostList(process.env['NG_ALLOWED_HOSTS']),
  ]) {
    hosts.add(h);
  }
  if (!environment.production) {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
    hosts.add('staging.cms.itqan.dev');
    hosts.add('cms-frontend-staging.pages.dev');
  }
  return [...hosts];
}

function extractHostname(hostHeader: string | undefined): string | null {
  if (!hostHeader) return null;
  try {
    return new URL(`http://${hostHeader}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const allowedHosts = buildAllowedHosts();
const allowedHostSet = new Set(allowedHosts);

const sitemapLoader = createCachedSitemapLoader({
  apiBaseUrl: apiProxyOrigin ? `${apiProxyOrigin}/cms-api` : environment.API_BASE_URL,
  siteUrl: environment.SITE_URL || 'https://cms.itqan.dev',
  readFallback: () => {
    const fallbackPath = join(browserDistFolder, 'sitemap.xml');
    return existsSync(fallbackPath) ? readFileSync(fallbackPath, 'utf8') : null;
  },
});

const app = express();
const angularApp = new AngularNodeAppEngine({
  allowedHosts,
  trustProxyHeaders: [
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-port',
    'x-forwarded-proto',
  ],
});

const trustProxyHops = Number.parseInt(process.env['TRUST_PROXY_HOPS'] || '2', 10);
app.set('trust proxy', Number.isFinite(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 2);
app.disable('x-powered-by');

/** Same headers netlify.toml set for the static site. */
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use((req, res, next) => {
  if (req.path.endsWith('.map')) {
    res.status(404).end();
    return;
  }
  next();
});

app.get('/sitemap.xml', async (_req, res) => {
  if (!environment.production) {
    res.status(404).setHeader('X-Robots-Tag', 'noindex, nofollow').end();
    return;
  }
  const xml = await sitemapLoader.get();
  if (!xml) {
    res
      .status(503)
      .setHeader('Retry-After', '60')
      .type('text/plain')
      .send('Sitemap temporarily unavailable');
    return;
  }
  res
    .status(200)
    .setHeader('Content-Type', 'application/xml; charset=utf-8')
    .setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
    .send(xml);
});

if (apiProxyOrigin) {
  app.use(['/cms-api', '/accounts', '/portal'], proxyToApi(apiProxyOrigin));
}

/** Hashed build files never change; `assets/` keeps a year-long immutable cache. */
const HASHED_FILE = /-[A-Z0-9]{8}\.[a-z0-9]+$/;
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      const relative = filePath.slice(browserDistFolder.length).replace(/\\/g, '/');
      const immutable = HASHED_FILE.test(filePath) || relative.startsWith('/assets/');
      res.setHeader(
        'Cache-Control',
        immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate'
      );
    },
  })
);

app.get('/', (req, res) => {
  const url = new URL(req.originalUrl, 'http://localhost');
  // An explicit ?lang= wins over the cookie, so it has to survive the redirect (ar included).
  const lang = normalizeUiLanguage(url.searchParams.get(LANG_QUERY_PARAM));
  const target = lang ? `/gallery?${LANG_QUERY_PARAM}=${lang}` : '/gallery';
  res.setHeader('Vary', 'Cookie');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (!environment.production) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  res.redirect(301, target);
});

app.use((req, res, next) => {
  const started = performance.now();
  const url = new URL(req.originalUrl, 'http://localhost');
  const { lang, fromCookie } = resolveRequestLanguage(url, req.headers.cookie);
  const fromQuery = hasRequestLanguageQuery(url);
  const theme = resolveRequestTheme(req.headers.cookie) ?? undefined;
  const hostHeader = req.get('host');
  const hostname = extractHostname(hostHeader);
  const hostAllowed = hostname !== null && allowedHostSet.has(hostname);

  const context: SsrRequestContext = {
    lang,
    fromQuery,
    theme,
    transferCacheOriginMap:
      apiProxyOrigin && hostAllowed && hostHeader
        ? { [apiProxyOrigin]: `${req.protocol}://${hostHeader}` }
        : undefined,
  };

  angularApp
    .handle(req, context)
    .then((response) => {
      if (!response) {
        next();
        return;
      }
      response.headers.set('Vary', 'Cookie');
      // Cookie-personalized or non-2xx HTML must not be stored by shared caches for other users.
      const isPrivate = fromCookie || theme === 'dark' || response.status >= 400;
      response.headers.set(
        'Cache-Control',
        isPrivate ? 'private, no-cache' : 'public, max-age=0, must-revalidate'
      );
      if (!environment.production || !isPublicSsrPath(url.pathname) || response.status >= 400) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      }
      response.headers.set('Server-Timing', `ssr;dur=${(performance.now() - started).toFixed(1)}`);
      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/** A render that throws still serves the app: the browser renders the page itself. */
app.use((err: unknown, req: Request, res: ExpressResponse, next: NextFunction) => {
  console.error(`SSR failed for ${req.originalUrl}`, err);
  if (res.headersSent) {
    next(err);
    return;
  }
  try {
    csrShell ??= readFileSync(join(browserDistFolder, 'index.csr.html'), 'utf8');
  } catch (readErr) {
    console.error('Could not read index.csr.html fallback', readErr);
    res
      .status(500)
      .setHeader('Cache-Control', 'no-store')
      .setHeader('X-Robots-Tag', 'noindex, nofollow')
      .type('text/plain')
      .send('Internal Server Error');
    return;
  }
  res
    .status(200)
    .setHeader('Cache-Control', 'no-store')
    .setHeader('X-Robots-Tag', 'noindex, nofollow')
    .type('html')
    .send(csrShell);
});

const FORWARD_REQUEST_HEADERS = [
  'accept',
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
/** fetch() decodes the body, so the upstream encoding/length no longer describe it. */
const DROP_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'set-cookie',
  'transfer-encoding',
]);

const PROXY_PREFIXES = ['/cms-api', '/accounts', '/portal'] as const;

function isAllowedProxyPath(pathname: string): boolean {
  return PROXY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Mirrors functions/_lib/staging-proxy.ts. `/portal/invitations/accept` stays an app page. */
function proxyToApi(origin: string) {
  const baseOrigin = new URL(origin);

  return async (req: Request, res: ExpressResponse, next: NextFunction): Promise<void> => {
    if (/^\/portal\/invitations\/accept\/?(\?|$)/.test(req.originalUrl)) {
      next();
      return;
    }

    let target: URL;
    try {
      target = new URL(req.originalUrl, baseOrigin);
      const decodedCheck = new URL(decodeURIComponent(target.pathname), baseOrigin);
      if (
        target.origin !== baseOrigin.origin ||
        !isAllowedProxyPath(target.pathname) ||
        !isAllowedProxyPath(decodedCheck.pathname)
      ) {
        res.status(400).json({ detail: 'Invalid proxy path' });
        return;
      }
    } catch {
      res.status(400).json({ detail: 'Invalid proxy path' });
      return;
    }

    const clientAbort = new AbortController();
    const onClientClose = (): void => {
      if (!res.writableEnded) {
        clientAbort.abort();
      }
    };
    req.on('close', onClientClose);

    try {
      const headers = new Headers();
      for (const name of FORWARD_REQUEST_HEADERS) {
        const value = req.headers[name];
        if (typeof value === 'string') headers.set(name, value);
      }
      for (const [name, value] of Object.entries(req.headers)) {
        if (name.startsWith('x-') && typeof value === 'string' && !headers.has(name)) {
          headers.set(name, value);
        }
      }
      headers.set('X-Forwarded-Host', req.get('host') ?? '');
      headers.set('X-Forwarded-Proto', req.protocol);
      if (req.ip) headers.set('X-Forwarded-For', req.ip);

      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const signal = AbortSignal.any([clientAbort.signal, AbortSignal.timeout(30_000)]);
      const upstream = await fetch(target, {
        method: req.method,
        headers,
        redirect: 'manual',
        signal,
        body: hasBody ? (Readable.toWeb(req) as unknown as ReadableStream) : undefined,
        ...(hasBody ? { duplex: 'half' } : {}),
      } as RequestInit);

      res.status(upstream.status);
      upstream.headers.forEach((value, name) => {
        if (!DROP_RESPONSE_HEADERS.has(name)) res.setHeader(name, value);
      });
      const cookies = upstream.headers.getSetCookie();
      if (cookies.length) res.setHeader('Set-Cookie', cookies);

      if (!upstream.body) {
        res.end();
        return;
      }
      pipeline(Readable.fromWeb(upstream.body as unknown as NodeWebReadableStream), res, (err) => {
        if (err && !res.destroyed) {
          console.error(`API proxy stream failed for ${req.method} ${req.originalUrl}`, err);
        }
      });
    } catch (err) {
      if (clientAbort.signal.aborted) {
        return;
      }
      console.error(`API proxy failed for ${req.method} ${req.originalUrl}`, err);
      if (!res.headersSent) res.status(502).json({ detail: 'Bad gateway' });
    } finally {
      req.off('close', onClientClose);
    }
  };
}

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  const server = app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });

  const shutdown = (): void => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
