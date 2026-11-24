import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { environment } from '../environments/environment';

import { routes } from './app.routes';
import { ar_EG, provideNzI18n } from 'ng-zorro-antd/i18n';
import { appLucideIconsProvider } from './icons/provide-app-lucide-icons';
import { isPlatformBrowser, registerLocaleData } from '@angular/common';
import ar from '@angular/common/locales/ar';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { headersInterceptor } from './core/interceptors/global.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { csrfResponseInterceptor } from './core/interceptors/csrf-response.interceptor';
import { appSessionTokenInterceptor } from './core/interceptors/app-session-token.interceptor';
import { tenantHeaderInterceptor } from './core/interceptors/tenant-header.interceptor';
import { ssrTimeoutInterceptor } from './core/interceptors/ssr-timeout.interceptor';
import { AuthService } from './core/auth/services/auth.service';
import { initializeAppTranslations } from './core/i18n/translate-app.initializer';
import { createAppSentryErrorHandler } from './core/sentry/sentry-error-handler';
registerLocaleData(ar);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    ...(environment.sentryDsn
      ? [
          {
            provide: ErrorHandler,
            useFactory: createAppSentryErrorHandler,
          },
          {
            provide: Sentry.TraceService,
            deps: [Router],
          },
          provideAppInitializer(() => {
            if (isPlatformBrowser(inject(PLATFORM_ID))) {
              inject(Sentry.TraceService);
            }
          }),
        ]
      : []),
    // SSR: reuse the server's DOM, and answer the first GETs from the data the server already
    // fetched (requests carrying auth headers are never cached).
    provideClientHydration(withEventReplay(), withHttpTransferCacheOptions({})),
    provideNzI18n(ar_EG),
    appLucideIconsProvider,
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([
        credentialsInterceptor,
        csrfResponseInterceptor,
        appSessionTokenInterceptor,
        tenantHeaderInterceptor,
        headersInterceptor,
        ssrTimeoutInterceptor,
        authErrorInterceptor,
        errorInterceptor,
      ])
    ),
    provideAppInitializer(() => initializeAppTranslations()),
    // Fire-and-forget: public pages paint immediately; protected routes wait on authReady.
    // The SSR server renders every page as a guest, so it never checks a session.
    provideAppInitializer(() => {
      if (isPlatformBrowser(inject(PLATFORM_ID))) {
        void inject(AuthService).bootstrapOnce();
      }
    }),
    // ngx-translate setup
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
        useHttpBackend: true,
      }),
      fallbackLang: 'ar',
    }),
  ],
};
