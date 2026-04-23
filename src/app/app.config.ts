import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { environment } from '../environments/environment';

import { routes } from './app.routes';
import { ar_EG, provideNzI18n } from 'ng-zorro-antd/i18n';
import { appLucideIconsProvider } from './icons/provide-app-lucide-icons';
import { registerLocaleData } from '@angular/common';
import ar from '@angular/common/locales/ar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { headersInterceptor } from './core/interceptors/global.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { csrfResponseInterceptor } from './core/interceptors/csrf-response.interceptor';
import { HeadlessAuthApiService } from './core/auth/headless/headless-auth-api.service';
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
            useValue: Sentry.createErrorHandler(),
          },
          {
            provide: Sentry.TraceService,
            deps: [Router],
          },
          provideAppInitializer(() => {
            inject(Sentry.TraceService);
          }),
        ]
      : []),
    provideNzI18n(ar_EG),
    appLucideIconsProvider,
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([
        credentialsInterceptor,
        csrfResponseInterceptor,
        headersInterceptor,
        authErrorInterceptor,
        errorInterceptor,
      ])
    ),
    provideAppInitializer(() => {
      const headless = inject(HeadlessAuthApiService);
      // Prime `csrftoken` on the API host before unsafe methods / OAuth form POST
      return firstValueFrom(headless.getConfig().pipe(catchError(() => of(undefined))));
    }),
    // ngx-translate setup
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'ar',
      lang: 'ar',
    }),
  ],
};
