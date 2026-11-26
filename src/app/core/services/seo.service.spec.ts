import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { UI_LANGUAGE, UiLanguage } from '../i18n/ui-language';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  const site = environment.SITE_URL || window.location.origin;

  function setup(lang: UiLanguage) {
    TestBed.configureTestingModule({ providers: [{ provide: UI_LANGUAGE, useValue: lang }] });
    return { seo: TestBed.inject(SeoService), doc: TestBed.inject(DOCUMENT) };
  }

  function href(doc: Document, selector: string): string | null | undefined {
    return doc.head.querySelector(selector)?.getAttribute('href');
  }

  afterEach(() => {
    document.head
      .querySelectorAll(
        'link[rel="canonical"], link[rel="alternate"][hreflang], meta[property="og:image"], meta[name="twitter:image"]'
      )
      .forEach((node) => node.remove());
  });

  it('exposes localized brand names', () => {
    expect(setup('ar').seo.brandName()).toBe('إتقان');
    TestBed.resetTestingModule();
    expect(setup('en').seo.brandName()).toBe('ITQAN');
  });

  it('points an Arabic page at the URL without a query, with hreflang for both languages', () => {
    const { seo, doc } = setup('ar');
    seo.setSeo({ title: 'T', description: 'D', path: '/gallery' });

    expect(href(doc, 'link[rel="canonical"]')).toBe(`${site}/gallery`);
    expect(href(doc, 'link[hreflang="ar"]')).toBe(`${site}/gallery`);
    expect(href(doc, 'link[hreflang="en"]')).toBe(`${site}/gallery?lang=en`);
    expect(href(doc, 'link[hreflang="x-default"]')).toBe(`${site}/gallery`);
    expect(doc.head.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe(
      'ar_AR'
    );
    expect(doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      `${site}/assets/images/og-default.png`
    );
    expect(doc.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe(
      'summary_large_image'
    );
  });

  it('gives an English page a ?lang=en canonical', () => {
    const { seo, doc } = setup('en');
    seo.setSeo({ title: 'T', description: 'D', path: '/gallery/asset/7' });

    expect(href(doc, 'link[rel="canonical"]')).toBe(`${site}/gallery/asset/7?lang=en`);
    expect(doc.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      `${site}/gallery/asset/7?lang=en`
    );
  });

  it('includes ?page=N on canonical and hreflang when page > 1', () => {
    const { seo, doc } = setup('en');
    seo.setSeo({ title: 'T', description: 'D', path: '/gallery', page: 2 });

    expect(seo.canonicalUrl('/gallery', 2)).toBe(`${site}/gallery?lang=en&page=2`);
    expect(href(doc, 'link[rel="canonical"]')).toBe(`${site}/gallery?lang=en&page=2`);
    expect(href(doc, 'link[hreflang="ar"]')).toBe(`${site}/gallery?page=2`);
    expect(href(doc, 'link[hreflang="en"]')).toBe(`${site}/gallery?lang=en&page=2`);
    expect(href(doc, 'link[hreflang="x-default"]')).toBe(`${site}/gallery?page=2`);
  });

  it('updates the links in place and drops hreflang and default og:image on noindex pages', () => {
    const { seo, doc } = setup('ar');
    seo.setSeo({ title: 'T', description: 'D', path: '/gallery' });
    seo.setSeo({ title: 'T', description: 'D', path: '/reciters' });

    expect(doc.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(href(doc, 'link[hreflang="en"]')).toBe(`${site}/reciters?lang=en`);

    seo.setSeo({ title: 'T', description: 'D', path: '/x', noIndex: true });
    expect(doc.head.querySelector('link[rel="alternate"][hreflang]')).toBeNull();
    expect(doc.head.querySelector('meta[property="og:image"]')).toBeNull();
    expect(doc.head.querySelector('meta[name="twitter:image"]')).toBeNull();
    expect(doc.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe(
      'summary'
    );
  });
});
