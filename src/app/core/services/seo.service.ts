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
  /** Page number (> 1 adds `?page=N` to canonical and hreflang URLs). */
  page?: number;
  /** Absolute image URL; falls back to the branded default OG image on indexable pages. */
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

  brandName(): string {
    return SITE_NAMES[this.lang];
  }

  canonicalUrl(path: string, page?: number): string {
    return this.pageUrl(path, this.lang, page);
  }

  private siteOrigin(): string {
    if (environment.SITE_URL) {
      return environment.SITE_URL;
    }
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  /** Arabic is the default (no query); English carries `?lang=en`; page > 1 adds `?page=N`. */
  private pageUrl(path: string, lang: UiLanguage, page?: number): string {
    const params = new URLSearchParams();
    if (lang === 'en') {
      params.set(LANG_QUERY_PARAM, 'en');
    }
    if (page && page > 1) {
      params.set('page', String(page));
    }
    const query = params.toString();
    const base = `${this.siteOrigin()}${path}`;
    return query ? `${base}?${query}` : base;
  }

  setSeo(config: SeoConfig): void {
    const url = this.pageUrl(config.path, this.lang, config.page);
    const origin = this.siteOrigin();
    const image =
      config.image ||
      (!config.noIndex && origin ? `${origin}/assets/images/og-default.png` : undefined);

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
      content: image ? 'summary_large_image' : 'summary',
    });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });

    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
      this.meta.updateTag({ name: 'twitter:image', content: image });
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('name="twitter:image"');
    }

    this.setLink('link[rel="canonical"]', { rel: 'canonical' }, url);
    this.setAlternates(config.path, !!config.noIndex, config.page);
  }

  /** hreflang links for both languages, plus x-default (Arabic). Not for noindex pages. */
  private setAlternates(path: string, noIndex: boolean, page?: number): void {
    const alternates: [string, string][] = [
      ['ar', this.pageUrl(path, 'ar', page)],
      ['en', this.pageUrl(path, 'en', page)],
      ['x-default', this.pageUrl(path, 'ar', page)],
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
      path: '/gallery',
    });
  }
}
