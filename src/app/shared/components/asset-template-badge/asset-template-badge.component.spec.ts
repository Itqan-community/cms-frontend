import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AssetTemplateBadgeComponent } from './asset-template-badge.component';

describe('AssetTemplateBadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetTemplateBadgeComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  function componentFor(template: string | null, layoutName: string | null = null) {
    const fixture = TestBed.createComponent(AssetTemplateBadgeComponent);
    fixture.componentRef.setInput('template', template);
    fixture.componentRef.setInput('layoutName', layoutName);
    fixture.detectChanges();
    return fixture;
  }

  it('uses the plain key for a template that is not page based', () => {
    // Arrange / Act
    const fixture = componentFor('word');

    // Assert
    expect(fixture.componentInstance.translationKey()).toBe('ADMIN.ASSET_TEMPLATE.WORD');
    expect(fixture.componentInstance.translationParams()).toEqual({});
  });

  it('names the layout when a page based asset has one', () => {
    // Arrange / Act
    const fixture = componentFor('page', 'Madani 604');

    // Assert
    expect(fixture.componentInstance.translationKey()).toBe(
      'ADMIN.ASSET_TEMPLATE.PAGE_WITH_LAYOUT'
    );
    expect(fixture.componentInstance.translationParams()).toEqual({ layout: 'Madani 604' });
  });

  it('falls back to the plain page key when a page based asset has no layout', () => {
    // Arrange / Act
    const fixture = componentFor('page', null);

    // Assert — never "Page based ()" and never a crash
    expect(fixture.componentInstance.translationKey()).toBe('ADMIN.ASSET_TEMPLATE.PAGE');
    expect(fixture.componentInstance.translationParams()).toEqual({});
  });

  it('renders nothing when the asset has no template', () => {
    // Arrange / Act
    const fixture = componentFor(null);

    // Assert — no empty pill, no wrapper element
    expect(fixture.nativeElement.textContent.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('nz-tag')).toBeNull();
  });

  it('marks the label with a layers icon so it reads as the content template', () => {
    const fixture = componentFor('surah');

    expect(fixture.nativeElement.querySelector('ng-icon[name="lucideLayers"]')).not.toBeNull();
  });
});
