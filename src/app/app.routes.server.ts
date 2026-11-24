import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Public content pages render on the server (SEO: status codes, title, meta, canonical, hreflang,
 * JSON-LD in the HTML). Portal, account, auth flows, and legacy blank routes get the client shell
 * or explicit HTTP status codes.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'gallery', renderMode: RenderMode.Server },
  { path: 'gallery/asset/:id', renderMode: RenderMode.Server },
  { path: 'publisher/:id', renderMode: RenderMode.Server },
  { path: 'reciters', renderMode: RenderMode.Server },
  { path: 'reciters/:slug', renderMode: RenderMode.Server },
  { path: 'license/:id', renderMode: RenderMode.Server },
  { path: 'content-standards', renderMode: RenderMode.Server },

  // Client-only routes (auth, portal, private account flows, empty /publishers placeholder)
  { path: '', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'account/**', renderMode: RenderMode.Client },
  { path: 'accounts/**', renderMode: RenderMode.Client },
  { path: 'portal/**', renderMode: RenderMode.Client },
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'register', renderMode: RenderMode.Client },
  { path: 'verify-email', renderMode: RenderMode.Client },
  { path: 'forgot-password', renderMode: RenderMode.Client },
  { path: 'reset-password', renderMode: RenderMode.Client },
  { path: 'login-by-code', renderMode: RenderMode.Client },
  { path: 'mfa', renderMode: RenderMode.Client },
  { path: 'reauthenticate', renderMode: RenderMode.Client },
  { path: 'provider-signup', renderMode: RenderMode.Client },
  { path: 'passkey', renderMode: RenderMode.Client },
  { path: 'passkey/setup', renderMode: RenderMode.Client },
  { path: 'auth/oauth/callback', renderMode: RenderMode.Client },
  { path: 'complete-profile', renderMode: RenderMode.Client },
  { path: 'unauthorized', renderMode: RenderMode.Client },
  { path: 'publishers', renderMode: RenderMode.Client },

  // Unknown routes render a proper HTTP 404 NotFoundPage with noindex
  { path: '**', renderMode: RenderMode.Server, status: 404 },
];
