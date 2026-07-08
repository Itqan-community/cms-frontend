import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

const DEFAULT_TITLE_AR = 'إتقان | نظام إدارة المحتوى';
const DEFAULT_TITLE_EN = 'ITQAN | Content Management System';
const DEFAULT_DESCRIPTION_AR =
  'إتقان - منصة إدارة المحتوى القرآني: تصفح وابحث في المصاحف والتلاوات والتفاسير والقراء.';
const DEFAULT_DESCRIPTION_EN =
  'ITQAN - Quranic content management platform: browse and search Mushafs, recitations, tafsir, and reciters.';

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

  private siteOrigin(): string {
    if (environment.SITE_URL) {
      return environment.SITE_URL;
    }
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  setSeo(config: SeoConfig): void {
    const url = `${this.siteOrigin()}${config.path}`;

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

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });

    if (config.image) {
      this.meta.updateTag({ property: 'og:image', content: config.image });
      this.meta.updateTag({ name: 'twitter:image', content: config.image });
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('name="twitter:image"');
    }

    this.setCanonicalUrl(url);
  }

  private setCanonicalUrl(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
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
