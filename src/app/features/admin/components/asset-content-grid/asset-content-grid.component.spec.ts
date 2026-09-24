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

  it('labels the reference column as the surah name for the surah template', () => {
    // Arrange / Act
    const reference = componentFor('surah')
      .buildColumnDefs()
      .find((col: { field?: string }) => col.field === 'reference_text');

    // Assert — for surah assets the reference text is the surah's name, not Quran text
    expect(reference?.headerName).toBe('ADMIN.CONTENT_EDITOR.COLUMNS.SURAH_NAME');
  });

  it('keeps the Quran text label for the ayah template', () => {
    // Arrange / Act
    const reference = componentFor('ayah')
      .buildColumnDefs()
      .find((col: { field?: string }) => col.field === 'reference_text');

    // Assert
    expect(reference?.headerName).toBe('ADMIN.CONTENT_EDITOR.COLUMNS.REFERENCE');
  });

  it('adds filterable surah and ayah number columns for the ayah template', () => {
    // Arrange / Act
    const columns = componentFor('ayah').buildColumnDefs();
    const sura = columns.find((col: { field?: string }) => col.field === 'sura');
    const aya = columns.find((col: { field?: string }) => col.field === 'aya');

    // Assert — rows are all loaded client-side, so number filters work in place
    expect(sura?.filter).toBe('agNumberColumnFilter');
    expect(sura?.floatingFilter).toBeTrue();
    expect(aya?.filter).toBe('agNumberColumnFilter');
    expect(aya?.floatingFilter).toBeTrue();
  });

  it('shows surah and ayah number columns for the word template without client-side filters', () => {
    // Arrange / Act
    const columns = componentFor('word').buildColumnDefs();
    const sura = columns.find((col: { field?: string }) => col.field === 'sura');
    const aya = columns.find((col: { field?: string }) => col.field === 'aya');

    // Assert — the word grid loads page by page, so a column filter would only
    // see the loaded block; the toolbar's server-side surah filter stays instead
    expect(sura).toBeDefined();
    expect(aya).toBeDefined();
    expect(sura?.filter).toBeFalsy();
    expect(aya?.filter).toBeFalsy();
  });

  it('keeps surah and ayah number columns off the surah and page templates', () => {
    // Arrange / Act
    const fields = (template: string) =>
      componentFor(template)
        .buildColumnDefs()
        .map((col: { field?: string }) => col.field);

    // Assert
    expect(fields('surah')).not.toContain('aya');
    expect(fields('page')).not.toContain('sura');
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
