import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
    provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import ar from '@angular/common/locales/ar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { ar_EG, provideNzI18n } from 'ng-zorro-antd/i18n';
import { routes } from './app.routes';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { headersInterceptor } from './core/interceptors/global.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

registerLocaleData(ar);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideNzI18n(ar_EG),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([loadingInterceptor, headersInterceptor, authErrorInterceptor])),
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
