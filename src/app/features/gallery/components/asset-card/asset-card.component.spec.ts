import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideEye, lucideFileText, lucideLayers } from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';

import { Categories } from '../../../../core/enums/categories.enum';
import { Licenses } from '../../../../core/enums/licenses.enum';
import type { Asset } from '../../models/assets.model';
import { AssetCardComponent } from './asset-card.component';

describe('AssetCardComponent', () => {
  const asset: Asset = {
    id: 27,
    category: Categories.TEXT,
    tags: [{ slug: 'tafsir', name: 'Tafsir' }],
    name: 'Hassaan Tafsir',
    description: 'A tafsir',
    publisher: { id: 1, name: 'Dar Alfa' },
    license: Licenses.CC0,
    template: 'word',
    mushaf_layout: null,
    has_ayah_timings: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetCardComponent, TranslateModule.forRoot()],
      providers: [provideRouter([]), provideIcons({ lucideEye, lucideFileText, lucideLayers })],
    }).compileComponents();
  });

  it('shows the content template with the title, apart from the license', () => {
    const fixture = TestBed.createComponent(AssetCardComponent);
    fixture.componentRef.setInput('asset', asset);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const badge = el.querySelector('.text-content app-asset-template-badge');
    expect(badge?.textContent).toContain('ADMIN.ASSET_TEMPLATE.WORD');
    expect(el.querySelector('.asset-card__header-license app-asset-template-badge')).toBeNull();
  });

  it('shows the timing level of a timed recitation', () => {
    const fixture = TestBed.createComponent(AssetCardComponent);
    fixture.componentRef.setInput('asset', {
      ...asset,
      category: Categories.RECITATION,
      template: null,
      has_ayah_timings: true,
      timing_level: 'ayah',
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.asset-card__timed .timing-level-badge')?.textContent).toContain(
      'TIMING_LEVEL.AYAH'
    );
  });

  it('shows no timing level for an asset without timings', () => {
    const fixture = TestBed.createComponent(AssetCardComponent);
    fixture.componentRef.setInput('asset', { ...asset, timing_level: null });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.timing-level-badge')).toBeNull();
  });
});
