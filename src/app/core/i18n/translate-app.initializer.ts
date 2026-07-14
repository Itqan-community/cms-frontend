import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export const DEFAULT_UI_LANGUAGE = 'ar';

async function loadLanguage(translate: TranslateService, lang: string): Promise<unknown> {
  return firstValueFrom(translate.use(lang));
}

/**
 * Load UI translations before bootstrap so Arabic (default) does not flash raw i18n keys.
 * Retries once on failure; on final failure boots anyway (avoids unhandled ErrorHandler noise).
 */
export async function initializeAppTranslations(): Promise<unknown> {
  const translate = inject(TranslateService);
  const lang = localStorage.getItem('lang') || DEFAULT_UI_LANGUAGE;
  translate.addLangs(['ar', 'en']);
  translate.setFallbackLang(DEFAULT_UI_LANGUAGE);

  try {
    return await loadLanguage(translate, lang);
  } catch {
    try {
      return await loadLanguage(translate, lang);
    } catch (err) {
      console.error('Failed to load UI translations after retry', err);
      return undefined;
    }
  }
}
