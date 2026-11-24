import { DOCUMENT } from '@angular/common';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UI_LANGUAGE } from '../../../../core/i18n/ui-language';
import { appLucideIconsProvider } from '../../../../icons/provide-app-lucide-icons';
import { NotFoundPage } from './not-found.page';

describe('NotFoundPage', () => {
  afterEach(() => {
    document.head
      .querySelectorAll(
        'link[rel="canonical"], link[rel="alternate"][hreflang], meta[name="robots"]'
      )
      .forEach((node) => node.remove());
  });

  it('sets HTTP 404 RESPONSE_INIT status and noindex robots tag', async () => {
    const responseInit: { status?: number } = {};
    await TestBed.configureTestingModule({
      imports: [NotFoundPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        appLucideIconsProvider,
        { provide: UI_LANGUAGE, useValue: 'en' },
        { provide: RESPONSE_INIT, useValue: responseInit },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotFoundPage);
    fixture.detectChanges();

    expect(responseInit.status).toBe(404);
    const doc = TestBed.inject(DOCUMENT);
    expect(doc.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow'
    );
    const link = fixture.nativeElement.querySelector('a[href="/gallery?lang=en"]');
    expect(link).not.toBeNull();
  });
});
