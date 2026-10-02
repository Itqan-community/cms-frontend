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
 * then drives the datasource from the resulting `draftId`. Matched by slug
 * (not just `draft/`) so two fixtures' requests pending at once don't collide
 * on `expectOne`.
 */
function flushDraft(httpMock: HttpTestingController, slug: string, id: number): void {
  httpMock
    .expectOne((r) => r.url.includes(slug) && r.url.includes('languages/'))
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
  httpMock.expectOne((r) => r.url.includes('draft/') && r.url.includes(slug)).flush(draft);
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

  /** Answer any other pending entries request (e.g. the live grid's own first block). */
  function drainEntries(): void {
    httpMock
      .match((r) => r.url.includes('entries/'))
      .forEach((req) => req.flush({ results: [], count: 0 }));
  }

  it('translates a block request into a page request and reports the total', async () => {
    // Arrange
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'translation');
    fixture.componentRef.setInput('slug', 'a-translation');
    fixture.componentRef.setInput('template', 'word');
    fixture.detectChanges();

    // ngOnInit's initDraft() -> loadAllEntries(1) fires first; give it a
    // draft id and a word-shaped first page so it derives the template and
    // stops (word never finishes the client-side pagination loop).
    flushDraft(httpMock, 'a-translation', 7);
    httpMock
      .expectOne((r) => r.url.includes('entries/'))
      .flush({
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

    const datasource = fixture.componentInstance.buildDatasource();
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

    // Act — getRows saves pending edits first, then fetches
    datasource.getRows(params);
    await new Promise((resolve) => setTimeout(resolve));
    // The live grid (template bound) also fetched its own first block; drain it.
    const req = httpMock.expectOne(
      (r) => r.url.includes('entries/') && r.params.get('page') === '2'
    );
    req.flush({ results: [{ unit_id: 101, text: '' }], count: 77431 });
    drainEntries();

    // Assert
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('100');
    expect(req.request.params.has('filters')).toBeFalse();
    expect(successCallback).toHaveBeenCalledWith([{ unit_id: 101, text: '' }], 77431);
  });

  it('sends the grid filter model to the server and reports the filtered total', async () => {
    // Arrange
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'tafsir');
    fixture.componentRef.setInput('slug', 'a-filtered-tafsir');
    fixture.componentRef.setInput('template', 'ayah');
    fixture.detectChanges();
    flushDraft(httpMock, 'a-filtered-tafsir', 9);
    httpMock.expectOne((r) => r.url.includes('entries/')).flush({ results: [], count: 6236 });
    const filterModel = {
      sura: { filterType: 'number', type: 'equals', filter: 2 },
      text: { filterType: 'text', type: 'contains', filter: 'mercy' },
    };
    const successCallback = jasmine.createSpy('successCallback');

    // Act
    fixture.componentInstance.buildDatasource().getRows({
      api: {} as GridApi,
      context: {},
      startRow: 0,
      endRow: 100,
      successCallback,
      failCallback: jasmine.createSpy('failCallback'),
      sortModel: [],
      filterModel,
    });
    await new Promise((resolve) => setTimeout(resolve));
    // The live grid (template bound) also fetched its own first block; drain it.
    const req = httpMock.expectOne((r) => r.url.includes('entries/') && r.params.has('filters'));
    req.flush({ results: [], count: 12 });

    // Assert
    expect(JSON.parse(req.request.params.get('filters') ?? 'null')).toEqual(filterModel);
    expect(successCallback).toHaveBeenCalledWith([], 12);
    expect(fixture.componentInstance.entriesTotal()).toBe(12);
    drainEntries();
  });

  it('shows the loading overlay while a first block (e.g. after a filter change) is in flight', async () => {
    // Arrange
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'tafsir');
    fixture.componentRef.setInput('slug', 'a-loading-tafsir');
    fixture.componentRef.setInput('template', 'ayah');
    fixture.detectChanges();
    flushDraft(httpMock, 'a-loading-tafsir', 11);
    httpMock.expectOne((r) => r.url.includes('entries/')).flush({ results: [], count: 6236 });
    await new Promise((resolve) => setTimeout(resolve));
    drainEntries();
    const grid = fixture.componentInstance;
    const getRows = (startRow: number) =>
      grid.buildDatasource().getRows({
        api: {} as GridApi,
        context: {},
        startRow,
        endRow: startRow + 100,
        successCallback: jasmine.createSpy('successCallback'),
        failCallback: jasmine.createSpy('failCallback'),
        sortModel: [],
        filterModel: { text: { filterType: 'text', type: 'contains', filter: 'x' } },
      });

    // Act — a scroll block alone doesn't show the overlay
    getRows(100);
    await new Promise((resolve) => setTimeout(resolve));
    const scrollLoading = grid.refreshing();
    httpMock.expectOne((r) => r.url.includes('entries/')).flush({ results: [], count: 1 });

    // Act — a first block does, until its response arrives
    getRows(0);
    const loadingBeforeResponse = grid.refreshing();
    await new Promise((resolve) => setTimeout(resolve));
    httpMock.expectOne((r) => r.url.includes('entries/')).flush({ results: [], count: 1 });

    // Assert
    expect(scrollLoading).toBeFalse();
    expect(loadingBeforeResponse).toBeTrue();
    expect(grid.refreshing()).toBeFalse();
  });

  it('shows "all changes saved" only after an edit is saved, not on open', async () => {
    // Arrange — opening the editor always creates or reuses a draft
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'tafsir');
    fixture.componentRef.setInput('slug', 'a-saved-tafsir');
    fixture.detectChanges();
    flushDraft(httpMock, 'a-saved-tafsir', 9);
    httpMock.expectOne((r) => r.url.includes('entries/')).flush({ results: [], count: 0 });
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 50));
    for (const req of httpMock.match((r) => r.method === 'GET' && r.url.includes('entries/'))) {
      req.flush({ results: [], count: 0 });
    }
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    // Assert — nothing was edited, so nothing claims to be saved
    expect(el.querySelector('.content-grid__saved')).toBeNull();

    // Act — edit a cell and let it save
    const grid = fixture.componentInstance;
    grid.onCellValueChanged({ data: { unit_id: 1, text: 'new' }, oldValue: '' } as never);
    const saved = grid.keepDraftOnLeave();
    httpMock.expectOne((r) => r.method === 'PATCH' && r.url.includes('entries/')).flush([]);
    expect(await saved).toBeTrue();
    fixture.detectChanges();

    // Assert
    expect(el.querySelector('.content-grid__saved')).not.toBeNull();
  });

  it('scrolls an ayah asset through the infinite datasource too', async () => {
    // Arrange — no template bound: the one-row probe tells the grid it's ayah
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'tafsir');
    fixture.componentRef.setInput('slug', 'an-ayah-tafsir');
    fixture.detectChanges();
    flushDraft(httpMock, 'an-ayah-tafsir', 5);
    const probe = httpMock.expectOne((r) => r.url.includes('entries/'));
    expect(probe.request.params.get('page_size')).toBe('1');
    probe.flush({
      results: [
        {
          unit_type: 'ayah',
          unit_id: 1,
          label: '1:1',
          reference_text: '',
          sura: 1,
          aya: 1,
          text: '',
          order: 1,
        },
      ],
      count: 6236,
    });

    // Act
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert — the live grid asked the datasource for its first block
    const block = httpMock.expectOne((r) => r.url.includes('entries/'));
    expect(block.request.params.get('page')).toBe('1');
    expect(block.request.params.get('page_size')).toBe(
      String(fixture.componentInstance.cacheBlockSize)
    );
    block.flush({ results: [], count: 6236 });
  });

  it('scrolls a word asset through the infinite datasource when the template input is unbound', async () => {
    // Arrange — the real editor page binds no `template`, so the grid only
    // learns it from the first page of rows. `rowModelType` is an @initial AG
    // Grid option: the live grid must be created *after* that, or it stays
    // client-side with no rows and never asks the datasource for a block.
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'tafsir');
    fixture.componentRef.setInput('slug', 'a-word-tafsir');
    fixture.detectChanges();
    flushDraft(httpMock, 'a-word-tafsir', 3);
    httpMock
      .expectOne((r) => r.url.includes('entries/'))
      .flush({
        results: [
          {
            unit_type: 'word',
            unit_id: 1,
            label: '1:1:1',
            reference_text: 'بِسْمِ',
            sura: 1,
            aya: 1,
            text: '',
            order: 1,
          },
        ],
        count: 77431,
      });

    // Act
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert — the live grid requested its first block from the datasource.
    const block = httpMock.expectOne((r) => r.url.includes('entries/'));
    expect(block.request.params.get('page')).toBe('1');
    expect(block.request.params.get('page_size')).toBe(
      String(fixture.componentInstance.cacheBlockSize)
    );
    block.flush({ results: [], count: 77431 });
  });

  it('reports the total unit count for a word asset in the page title', () => {
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'tafsir');
    fixture.componentRef.setInput('slug', 'a-counted-tafsir');
    fixture.detectChanges();
    flushDraft(httpMock, 'a-counted-tafsir', 4);

    httpMock
      .expectOne((r) => r.url.includes('entries/'))
      .flush({
        results: [
          {
            unit_type: 'word',
            unit_id: 1,
            label: '1:1:1',
            reference_text: 'بِسْمِ',
            sura: 1,
            aya: 1,
            text: '',
            order: 1,
          },
        ],
        count: 77432,
      });

    expect(fixture.componentInstance.entriesTotal()).toBe(77432);
    fixture.destroy();
  });
});
