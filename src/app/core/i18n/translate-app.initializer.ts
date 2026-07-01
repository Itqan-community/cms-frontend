import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export const DEFAULT_UI_LANGUAGE = 'ar';

/** Load UI translations before bootstrap so Arabic (default) does not flash raw i18n keys. */
export function initializeAppTranslations(): Promise<unknown> {
  const translate = inject(TranslateService);
  const lang = localStorage.getItem('lang') || DEFAULT_UI_LANGUAGE;
  translate.addLangs(['ar', 'en']);
  translate.setFallbackLang(DEFAULT_UI_LANGUAGE);
  return firstValueFrom(translate.use(lang));
}
