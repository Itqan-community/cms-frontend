import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { LANG_QUERY_PARAM, UI_LANGUAGE, UiLanguage } from '../i18n/ui-language';

const DEFAULT_TITLE_AR = 'إتقان | نظام إدارة المحتوى';
const DEFAULT_TITLE_EN = 'ITQAN | Content Management System';
const DEFAULT_DESCRIPTION_AR =
  'إتقان - منصة إدارة المحتوى القرآني: تصفح وابحث في المصاحف والتلاوات والتفاسير والقراء.';
const DEFAULT_DESCRIPTION_EN =
  'ITQAN - Quranic content management platform: browse and search Mushafs, recitations, tafsir, and reciters.';
const OG_LOCALES: Record<UiLanguage, string> = { ar: 'ar_AR', en: 'en_US' };
const SITE_NAMES: Record<UiLanguage, string> = { ar: 'إتقان', en: 'ITQAN' };

export interface SeoConfig {
  title: string;
  description: string;
  /** Route path starting with '/', e.g. '/reciters/mishary-alafasy'. Used to build canonical + og:url. */
  path: string;
  /** Absolute image URL; falls back to no og:image/twitter:image if omitted. */
  image?: string;
  type?: 'website' | 'profile';
  noIndex?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly lang = inject(UI_LANGUAGE);

  private siteOrigin(): string {
    if (environment.SITE_URL) {
      return environment.SITE_URL;
    }
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  /** Arabic is the default (no query); English pages carry `?lang=en`. */
  private pageUrl(path: string, lang: UiLanguage): string {
    const base = `${this.siteOrigin()}${path}`;
    return lang === 'ar' ? base : `${base}?${LANG_QUERY_PARAM}=${lang}`;
  }

  setSeo(config: SeoConfig): void {
    const url = this.pageUrl(config.path, this.lang);

    this.title.setTitle(config.title);

    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({
      name: 'robots',
      content: config.noIndex ? 'noindex, nofollow' : 'index, follow',
    });

    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: config.type ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAMES[this.lang] });
    this.meta.updateTag({ property: 'og:locale', content: OG_LOCALES[this.lang] });
    this.meta.updateTag({
      property: 'og:locale:alternate',
      content: OG_LOCALES[this.lang === 'ar' ? 'en' : 'ar'],
    });

    this.meta.updateTag({
      name: 'twitter:card',
      content: config.image ? 'summary_large_image' : 'summary',
    });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });

    if (config.image) {
      this.meta.updateTag({ property: 'og:image', content: config.image });
      this.meta.updateTag({ name: 'twitter:image', content: config.image });
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('name="twitter:image"');
    }

    this.setLink('link[rel="canonical"]', { rel: 'canonical' }, url);
    this.setAlternates(config.path, !!config.noIndex);
  }

  /** hreflang links for both languages, plus x-default (Arabic). Not for noindex pages. */
  private setAlternates(path: string, noIndex: boolean): void {
    const alternates: [string, string][] = [
      ['ar', this.pageUrl(path, 'ar')],
      ['en', this.pageUrl(path, 'en')],
      ['x-default', this.pageUrl(path, 'ar')],
    ];
    for (const [hreflang, href] of alternates) {
      const selector = `link[rel="alternate"][hreflang="${hreflang}"]`;
      if (noIndex) {
        this.document.head.querySelector(selector)?.remove();
      } else {
        this.setLink(selector, { rel: 'alternate', hreflang }, href);
      }
    }
  }

  private setLink(selector: string, attrs: Record<string, string>, href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = this.document.createElement('link');
      for (const [name, value] of Object.entries(attrs)) {
        link.setAttribute(name, value);
      }
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  /** Restores the app-wide default title/description so leaving an entity page doesn't leak its tags. */
  resetToDefault(lang: string): void {
    const isAr = lang === 'ar';
    this.setSeo({
      title: isAr ? DEFAULT_TITLE_AR : DEFAULT_TITLE_EN,
      description: isAr ? DEFAULT_DESCRIPTION_AR : DEFAULT_DESCRIPTION_EN,
      path: '/',
    });
  }
}
