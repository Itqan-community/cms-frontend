import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  DEFAULT_UI_LANGUAGE,
  persistUiLanguage,
  resolveBrowserLanguageWithSource,
  UI_LANGUAGE,
  UI_LANGUAGES,
} from './ui-language';

export { DEFAULT_UI_LANGUAGE } from './ui-language';

const LANG_RELOAD_FLAG = 'itqan-lang-ssr-reload';

async function loadLanguage(translate: TranslateService, lang: string): Promise<unknown> {
  return firstValueFrom(translate.use(lang));
}

function clearReloadFlag(): void {
  try {
    sessionStorage.removeItem(LANG_RELOAD_FLAG);
  } catch {
    /* ignore storage failures */
  }
}

/**
 * A saved language from before the `lang` cookie existed: the server rendered Arabic, the user
 * chose English. Reload once now that the cookie is set, so the server renders their language and
 * hydration sees the same DOM. Returns true when a reload was started.
 */
function reloadIfServerRenderedOtherLanguage(document: Document, lang: string): boolean {
  const serverRendered = document.querySelector('[ng-server-context]') !== null;
  if (!serverRendered || document.documentElement.lang === lang) {
    if (document.documentElement.lang === lang) {
      clearReloadFlag();
    }
    return false;
  }
  try {
    if (sessionStorage.getItem(LANG_RELOAD_FLAG)) {
      return false;
    }
    sessionStorage.setItem(LANG_RELOAD_FLAG, '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Load UI translations before bootstrap so Arabic (default) does not flash raw i18n keys.
 * Retries once on failure; on final failure boots anyway (avoids unhandled ErrorHandler noise).
 */
export async function initializeAppTranslations(): Promise<unknown> {
  const translate = inject(TranslateService);
  const lang = inject(UI_LANGUAGE);
  translate.addLangs([...UI_LANGUAGES]);
  translate.setFallbackLang(DEFAULT_UI_LANGUAGE);

  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    const doc = inject(DOCUMENT);
    const { source } = resolveBrowserLanguageWithSource();
    if (source === 'storage') {
      persistUiLanguage(lang);
      if (reloadIfServerRenderedOtherLanguage(doc, lang)) {
        return new Promise<never>(() => undefined);
      }
    } else if (doc.documentElement.lang === lang) {
      clearReloadFlag();
    }
  }

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
