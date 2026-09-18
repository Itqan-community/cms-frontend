import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import { AssetContentGridComponent } from './asset-content-grid.component';

describe('AssetContentGridComponent column definitions', () => {
  function componentFor(template: string) {
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('template', template);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetContentGridComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    }).compileComponents();
  });

  it('shows only the label and text columns for the page template', () => {
    // Arrange / Act
    const fields = componentFor('page')
      .buildColumnDefs()
      .map((col: { field?: string }) => col.field)
      .filter(Boolean);

    // Assert
    expect(fields).toEqual(['label', 'text']);
  });

  it('shows the reference text column for the ayah template', () => {
    // Arrange / Act
    const fields = componentFor('ayah')
      .buildColumnDefs()
      .map((col: { field?: string }) => col.field)
      .filter(Boolean);

    // Assert
    expect(fields).toContain('reference_text');
  });

  it('keeps the surah floating filter off the page template', () => {
    // Arrange / Act
    const columns = componentFor('page').buildColumnDefs();

    // Assert
    expect(
      columns.some((col: { floatingFilterComponent?: unknown }) => col.floatingFilterComponent)
    ).toBe(false);
  });
});
