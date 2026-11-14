import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy, lucideExternalLink } from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';

import { environment } from '../../../../../environments/environment';
import type { AssetPackage } from '../../models/assets.model';
import { ITQAN_CLI_URL } from '../itqan-add-command/itqan-add-command.component';
import { AssetGetCtaComponent } from './asset-get-cta.component';

describe('AssetGetCtaComponent', () => {
  const pkg: AssetPackage = {
    slug: 'tafsir-jalalayn',
    languages: [{ language: 'ar', is_source: true }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetGetCtaComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideIcons({ lucideCheck, lucideCopy, lucideExternalLink }),
      ],
    }).compileComponents();
  });

  function render(category: string, assetPackage: AssetPackage | null): HTMLElement {
    const fixture = TestBed.createComponent(AssetGetCtaComponent);
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('package', assetPackage);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('points recitations to the public API, not the CLI', () => {
    const el = render('recitation', pkg);

    expect(el.textContent).toContain('GALLERY.GET_ASSET.RECITATION_HINT');
    expect(el.querySelector('code')).toBeNull();
    expect(el.querySelector('.cli-link')).toBeNull();
    expect((el.querySelector('.api-docs-link') as HTMLAnchorElement).href).toContain(
      environment.API_DOCS_URL
    );
  });

  it('shows the itqan add command for an installable asset', () => {
    const el = render('text', pkg);

    expect(el.querySelector('code')?.textContent?.trim()).toBe('itqan add tafsir-jalalayn');
    expect(el.querySelector('.copy-button')).not.toBeNull();
    expect((el.querySelector('.get-cli-link') as HTMLAnchorElement).href).toBe(ITQAN_CLI_URL);
    expect(el.querySelector('.api-docs-link')).not.toBeNull();
  });

  it('links to the CLI and the API when the CLI cannot install the asset', () => {
    const el = render('font', null);

    expect(el.textContent).toContain('GALLERY.GET_ASSET.NOT_INSTALLABLE_HINT');
    expect(el.querySelector('code')).toBeNull();
    const cli = el.querySelector('.cli-link') as HTMLAnchorElement;
    expect(cli.href).toBe(ITQAN_CLI_URL);
    expect(cli.rel).toContain('noopener');
    expect(el.querySelector('.api-docs-link')).not.toBeNull();
  });

  it('offers no download link', () => {
    for (const el of [render('recitation', null), render('text', pkg), render('font', null)]) {
      expect(el.querySelector('a[download]')).toBeNull();
      expect(el.textContent?.toLowerCase()).not.toContain('download');
    }
  });
});
