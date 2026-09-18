import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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

  it('derives the template from the loaded rows when the input is left unbound', () => {
    // Arrange
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'tafsir');
    fixture.componentRef.setInput('slug', 'demo-tafsir');

    // Act: ngOnInit kicks off listLanguages() -> createDraft() -> getEntries();
    // flush all three with page-template rows and no explicit `template` input
    // bound anywhere.
    fixture.detectChanges();
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock
      .expectOne((req) => req.url.includes('languages/'))
      .flush([{ language: 'ar', is_source: true, is_available: true }]);
    httpMock
      .expectOne((req) => req.url.includes('draft/'))
      .flush({
        id: 1,
        asset_id: 1,
        name: 'draft',
        summary: '',
        state: 'draft',
        entries_count: 1,
        created_at: '2026-01-01T00:00:00Z',
      });
    httpMock
      .expectOne((req) => req.url.includes('entries/'))
      .flush({
        results: [
          {
            unit_type: 'page',
            unit_id: 1,
            label: 'Page 1',
            reference_text: '',
            sura: null,
            aya: null,
            text: '',
            order: 1,
          },
        ],
        count: 1,
      });

    const fields = fixture.componentInstance
      .buildColumnDefs()
      .map((col: { field?: string }) => col.field)
      .filter(Boolean);

    // Assert: page columns (no reference_text) even though `template` was
    // never set — proves buildColumnDefs reads the derived template, not the
    // raw (unset) input.
    expect(fields).toEqual(['label', 'text']);

    httpMock.verify();
  });
});
