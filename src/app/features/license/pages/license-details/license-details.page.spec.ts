import { DOCUMENT } from '@angular/common';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UI_LANGUAGE } from '../../../../core/i18n/ui-language';
import { appLucideIconsProvider } from '../../../../icons/provide-app-lucide-icons';
import { LicenseDetailsPage } from './license-details.page';

describe('LicenseDetailsPage', () => {
  afterEach(() => {
    document.head
      .querySelectorAll(
        'link[rel="canonical"], link[rel="alternate"][hreflang], meta[name="robots"]'
      )
      .forEach((node) => node.remove());
  });

  function renderWithId(id: string) {
    const responseInit: { status?: number } = {};
    TestBed.configureTestingModule({
      imports: [LicenseDetailsPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        appLucideIconsProvider,
        { provide: UI_LANGUAGE, useValue: 'en' },
        { provide: RESPONSE_INIT, useValue: responseInit },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(LicenseDetailsPage);
    fixture.detectChanges();
    return { fixture, responseInit, doc: TestBed.inject(DOCUMENT) };
  }

  it('renders a known SPDX license with indexable SEO tags', () => {
    const { fixture, responseInit, doc } = renderWithId('CC-BY');
    expect(fixture.componentInstance.isValidLicense).toBeTrue();
    expect(responseInit.status).toBeUndefined();
    expect(doc.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow'
    );
    expect(fixture.nativeElement.querySelector('h1.license-code')?.textContent?.trim()).toBe(
      'CC-BY'
    );
  });

  it('sets HTTP 404 and noindex for an unknown license code', () => {
    const { fixture, responseInit, doc } = renderWithId('not-a-license');
    expect(fixture.componentInstance.isValidLicense).toBeFalse();
    expect(responseInit.status).toBe(404);
    expect(doc.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow'
    );
    expect(fixture.nativeElement.querySelector('h1.license-code')).toBeNull();
  });
});
