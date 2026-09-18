import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import type { GridApi, IGetRowsParams } from 'ag-grid-community';

import { AssetContentGridComponent } from './asset-content-grid.component';
import type { ContentDraftVersion } from '../../models/asset-content.models';

/**
 * `versionId` is not a real input on `AssetContentGridComponent` — the draft
 * version is created internally by `loadForLanguage()` and exposed via the
 * `draftId` signal, not bound from outside. So every scenario here flushes
 * the `languages/` and `draft/` requests the same way the running app would,
 * then drives the datasource from the resulting `draftId`.
 */
function flushDraft(httpMock: HttpTestingController, id: number): void {
  httpMock
    .expectOne((r) => r.url.includes('languages/'))
    .flush([{ language: 'ar', is_source: true, is_available: true }]);
  const draft: ContentDraftVersion = {
    id,
    asset_id: 1,
    language: 'ar',
    name: 'draft',
    summary: '',
    state: 'draft',
    entries_count: 0,
    created_at: '2026-01-01T00:00:00Z',
  };
  httpMock.expectOne((r) => r.url.includes('draft/')).flush(draft);
}

describe('AssetContentGridComponent word datasource', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetContentGridComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('uses the infinite row model only for the word template', () => {
    // Arrange
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'translation');
    fixture.componentRef.setInput('slug', 'a-translation');

    // Act
    fixture.componentRef.setInput('template', 'word');
    fixture.detectChanges();
    const wordModel = fixture.componentInstance.rowModelType();
    fixture.componentRef.setInput('template', 'ayah');
    fixture.detectChanges();
    const ayahModel = fixture.componentInstance.rowModelType();

    // Assert
    expect(wordModel).toBe('infinite');
    expect(ayahModel).toBe('clientSide');

    // Drain the draft + first-page requests that ngOnInit kicked off.
    flushDraft(httpMock, 1);
    httpMock.expectOne((r) => r.url.includes('entries/')).flush({ results: [], count: 0 });
  });

  it('translates a block request into a page request and reports the total', () => {
    // Arrange
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'translation');
    fixture.componentRef.setInput('slug', 'a-translation');
    fixture.componentRef.setInput('template', 'word');
    fixture.detectChanges();

    // ngOnInit's initDraft() -> loadAllEntries(1) fires first; give it a
    // draft id and a word-shaped first page so it derives the template and
    // stops (word never finishes the client-side pagination loop).
    flushDraft(httpMock, 7);
    httpMock.expectOne((r) => r.url.includes('entries/')).flush({
      results: [
        {
          unit_type: 'word',
          unit_id: 1,
          label: '1:1:1',
          reference_text: '',
          sura: 1,
          aya: 1,
          text: '',
          order: 1,
        },
      ],
      count: 77431,
    });

    const datasource = fixture.componentInstance.buildWordDatasource();
    const successCallback = jasmine.createSpy('successCallback');
    const params: IGetRowsParams = {
      api: {} as GridApi,
      context: {},
      startRow: 100,
      endRow: 200,
      successCallback,
      failCallback: jasmine.createSpy('failCallback'),
      sortModel: [],
      filterModel: {},
    };

    // Act
    datasource.getRows(params);
    const req = httpMock.expectOne((r) => r.url.includes('entries/'));
    req.flush({ results: [{ unit_id: 101, text: '' }], count: 77431 });

    // Assert
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('100');
    expect(successCallback).toHaveBeenCalledWith([{ unit_id: 101, text: '' }], 77431);
  });
});
