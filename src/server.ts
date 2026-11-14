import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { NextFunction, Request, Response as ExpressResponse } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import { resolveRequestLanguage, SsrRequestContext } from './app/core/i18n/ui-language';

/**
 * SSR server: public pages render here (see app.routes.server.ts); the rest gets the client shell.
 *
 * Env:
 * - `PORT` (default 4000)
 * - `API_PROXY_ORIGIN` (optional, e.g. https://staging.api.cms.itqan.dev): serve `/cms-api`,
 *   `/accounts` and `/portal` same-origin by proxying them there, like the staging Pages
 *   Functions in `functions/`. Must be the origin of the build's `API_BASE_URL`.
 */
const browserDistFolder = join(import.meta.dirname, '../browser');
let csrShell: string | null = null;
const apiProxyOrigin = process.env['API_PROXY_ORIGIN']?.replace(/\/+$/, '') || null;

const app = express();
const angularApp = new AngularNodeAppEngine();

// Behind Caddy/Cloudflare: req.protocol and the client IP come from X-Forwarded-*.
app.set('trust proxy', true);
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

if (apiProxyOrigin) {
  app.use(['/cms-api', '/accounts', '/portal'], proxyToApi(apiProxyOrigin));
}

/** Hashed build files never change; `assets/` keeps the year-long cache it had on Netlify. */
const HASHED_FILE = /-[A-Z0-9]{8}\.[a-z0-9]+$/;
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      const relative = filePath.slice(browserDistFolder.length);
      const immutable = HASHED_FILE.test(filePath) || relative.startsWith('/assets/');
      res.setHeader(
        'Cache-Control',
        immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate'
      );
    },
  })
);

app.use((req, res, next) => {
  const started = performance.now();
  const url = new URL(req.originalUrl, 'http://localhost');
  const { lang, fromCookie } = resolveRequestLanguage(url, req.headers.cookie);
  const context: SsrRequestContext = {
    lang,
    transferCacheOriginMap: apiProxyOrigin
      ? { [apiProxyOrigin]: `${req.protocol}://${req.get('host')}` }
      : undefined,
  };

  angularApp
    .handle(req, context)
    .then((response) => {
      if (!response) {
        next();
        return;
      }
      // HTML picked by the lang cookie must not be stored by shared caches for other users.
      response.headers.set(
        'Cache-Control',
        fromCookie ? 'private, no-cache' : 'public, max-age=0, must-revalidate'
      );
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
  csrShell ??= readFileSync(join(browserDistFolder, 'index.csr.html'), 'utf8');
  res.status(200).setHeader('Cache-Control', 'no-store').type('html').send(csrShell);
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

/** Mirrors functions/_lib/staging-proxy.ts. `/portal/invitations/accept` stays an app page. */
function proxyToApi(origin: string) {
  return async (req: Request, res: ExpressResponse, next: NextFunction): Promise<void> => {
    if (/^\/portal\/invitations\/accept\/?(\?|$)/.test(req.originalUrl)) {
      next();
      return;
    }
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
      const upstream = await fetch(`${origin}${req.originalUrl}`, {
        method: req.method,
        headers,
        redirect: 'manual',
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
      Readable.fromWeb(upstream.body as unknown as NodeWebReadableStream).pipe(res);
    } catch (err) {
      console.error(`API proxy failed for ${req.method} ${req.originalUrl}`, err);
      if (!res.headersSent) res.status(502).json({ detail: 'Bad gateway' });
    }
  };
}

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
