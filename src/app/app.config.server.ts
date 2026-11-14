import { FetchBackend, HTTP_TRANSFER_CACHE_ORIGIN_MAP, HttpBackend } from '@angular/common/http';
import { ApplicationConfig, inject, mergeApplicationConfig, REQUEST_CONTEXT } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { from, Observable } from 'rxjs';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { SsrRequestContext } from './core/i18n/ui-language';

/** Translations from the bundle: the server never fetches its own `/i18n/*.json` over HTTP. */
class ServerTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    const file =
      lang === 'en' ? import('../../public/i18n/en.json') : import('../../public/i18n/ar.json');
    return from(file.then((m) => m.default as TranslationObject));
  }
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: TranslateLoader, useClass: ServerTranslateLoader },
    // Node's fetch keeps API connections alive between renders (the XHR backend opens a new TLS
    // connection per request). Server only: the browser keeps XHR for upload progress events.
    FetchBackend,
    { provide: HttpBackend, useExisting: FetchBackend },
    // When the server proxies the API (same-origin for the browser), it still fetches the API
    // directly; map that origin to the browser's so the browser reuses the server's responses.
    {
      provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP,
      useFactory: (): Record<string, string> => {
        const context = inject(REQUEST_CONTEXT, { optional: true }) as SsrRequestContext | null;
        return context?.transferCacheOriginMap ?? {};
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
