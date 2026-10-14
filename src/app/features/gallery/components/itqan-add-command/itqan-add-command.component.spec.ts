import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy, lucideExternalLink, lucideTerminal } from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';

import type { AssetPackage } from '../../models/assets.model';
import { ITQAN_CLI_URL, ItqanAddCommandComponent } from './itqan-add-command.component';

describe('ItqanAddCommandComponent', () => {
  const pkg: AssetPackage = {
    slug: 'tafsir-jalalayn',
    languages: [
      { language: 'ar', is_source: true },
      { language: 'en', is_source: false },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItqanAddCommandComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideIcons({ lucideCheck, lucideCopy, lucideExternalLink, lucideTerminal }),
      ],
    }).compileComponents();
  });

  function render(language: string | null) {
    const fixture = TestBed.createComponent(ItqanAddCommandComponent);
    fixture.componentRef.setInput('package', pkg);
    fixture.componentRef.setInput('language', language);
    fixture.detectChanges();
    return fixture;
  }

  it('shows `itqan add <slug>` for the source language', () => {
    const el: HTMLElement = render('ar').nativeElement;

    expect(el.querySelector('code')?.textContent?.trim()).toBe('itqan add tafsir-jalalayn');
  });

  it('adds --language for another installable language', () => {
    const el: HTMLElement = render('en').nativeElement;

    expect(el.querySelector('code')?.textContent?.trim()).toBe(
      'itqan add tafsir-jalalayn --language en'
    );
  });

  it('falls back to the source language when the selected one is not installable', () => {
    const el: HTMLElement = render('fr').nativeElement;

    expect(el.querySelector('code')?.textContent?.trim()).toBe('itqan add tafsir-jalalayn');
  });

  it('names the language when the asset has no installable source language', () => {
    const fixture = TestBed.createComponent(ItqanAddCommandComponent);
    fixture.componentRef.setInput('package', {
      slug: 'quran-fr',
      languages: [{ language: 'fr', is_source: false }],
    });
    fixture.componentRef.setInput('language', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('code')?.textContent?.trim()).toBe(
      'itqan add quran-fr --language fr'
    );
  });

  it('copies the command to the clipboard', async () => {
    const writeText = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    const fixture = render('en');

    (fixture.nativeElement.querySelector('.copy-button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith('itqan add tafsir-jalalayn --language en');
  });

  it('links to the itqan CLI for users who do not have it', () => {
    const link: HTMLAnchorElement = render('ar').nativeElement.querySelector('.get-cli-link');

    expect(link.href).toBe(ITQAN_CLI_URL);
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });
});
