import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Public pages render on the server (SEO: title, meta, canonical, hreflang, JSON-LD in the HTML).
 * Everything else (portal, account, auth flows) gets the client-rendered shell: those pages need
 * the user's session, which only the browser has.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'gallery', renderMode: RenderMode.Server },
  { path: 'gallery/asset/:id', renderMode: RenderMode.Server },
  { path: 'publishers', renderMode: RenderMode.Server },
  { path: 'publisher/:id', renderMode: RenderMode.Server },
  { path: 'reciters', renderMode: RenderMode.Server },
  { path: 'reciters/:slug', renderMode: RenderMode.Server },
  { path: 'license/:id', renderMode: RenderMode.Server },
  { path: 'content-standards', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
