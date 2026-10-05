import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { AdminAuthService } from '../../services/admin-auth.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import { AssetContentGridComponent, suppressClearKeys } from './asset-content-grid.component';
import { ContentTextCellEditorComponent } from './content-text-cell-editor.component';

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
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        {
          provide: NzMessageService,
          useValue: { success: () => void 0, error: () => void 0, info: () => void 0 },
        },
        { provide: NzModalService, useValue: { confirm: () => void 0, info: () => void 0 } },
        { provide: AdminAuthService, useValue: { hasPermission: () => true } },
        { provide: LastActiveLanguageService, useValue: { get: () => null, set: () => void 0 } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
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

  it('gives the ayah and word templates server-side surah and ayah number filters', () => {
    for (const template of ['ayah', 'word']) {
      // Arrange / Act
      const columns = componentFor(template).buildColumnDefs();
      const sura = columns.find((col) => col.field === 'sura');
      const aya = columns.find((col) => col.field === 'aya');

      // Assert — plain number filters; the surah-name dropdown sits on the unit column
      expect(sura?.filter).withContext(template).toBe('agNumberColumnFilter');
      expect(sura?.floatingFilterComponent).withContext(template).toBeUndefined();
      expect(aya?.filter).withContext(template).toBe('agNumberColumnFilter');
      expect(aya?.floatingFilter).withContext(template).toBeTrue();
    }
  });

  it('keeps Delete and Backspace from clearing the read-only source column', () => {
    // Arrange — the source column of a translation (non-source language) editor
    const grid = componentFor('ayah');
    grid.languages.set([
      { language: 'ar', is_source: true, is_available: true },
      { language: 'fr', is_source: false, is_available: true },
    ]);
    grid.selectedLanguage.set('fr');
    const source = grid.buildColumnDefs().find((col) => col.field === 'source_text')!;
    const press = (key: string, editing = false) =>
      suppressClearKeys({ editing, event: new KeyboardEvent('keydown', { key }) } as never);

    // Act / Assert
    expect(source.suppressKeyboardEvent).toBe(suppressClearKeys);
    expect(press('Delete')).toBeTrue();
    expect(press('Backspace')).toBeTrue();
    expect(press('Enter')).toBeFalse();
    // Inside the open popup the keys are left alone
    expect(press('Delete', true)).toBeFalse();
  });

  it('shows the surah name beside its number while filtering on the number', () => {
    for (const template of ['ayah', 'word']) {
      // Arrange
      const sura = componentFor(template)
        .buildColumnDefs()
        .find((col) => col.field === 'sura')!;
      const format = sura.valueFormatter as (params: { value: number | null }) => string;

      // Act / Assert — the filter stays numeric; only the displayed text changes
      expect(format({ value: 2 }))
        .withContext(template)
        .toBe('2. Al-Baqarah');
      expect(format({ value: null }))
        .withContext(template)
        .toBe('');
      expect(sura.filter).withContext(template).toBe('agNumberColumnFilter');
    }
  });

  it('shows the Arabic surah name in the Arabic interface', () => {
    // Arrange
    TestBed.inject(TranslateService).use('ar');
    const sura = componentFor('ayah')
      .buildColumnDefs()
      .find((col) => col.field === 'sura')!;
    const format = sura.valueFormatter as (params: { value: number }) => string;

    // Act / Assert
    expect(format({ value: 2 })).toBe('2. البقرة');
  });

  it('puts the surah-name dropdown on the unit column wherever units have a surah', () => {
    for (const template of ['surah', 'ayah', 'word']) {
      // Arrange / Act
      const label = componentFor(template)
        .buildColumnDefs()
        .find((col) => col.field === 'label');

      // Assert — keyed `surah` so the server filters the surah number, not the label text
      expect(label?.colId).withContext(template).toBe('surah');
      expect(label?.filter).withContext(template).toBe('agNumberColumnFilter');
      expect(label?.floatingFilterComponent).withContext(template).toBeTruthy();
    }
  });

  it('gives every text column a text filter and keeps rows one line tall', () => {
    // Arrange / Act
    const textColumns = componentFor('ayah')
      .buildColumnDefs()
      .filter((col) => col.field === 'reference_text' || col.field === 'text');

    // Assert — long text is cut off in the cell rather than growing the row
    expect(textColumns.length).toBe(2);
    for (const col of textColumns) {
      expect(col.filter).withContext(String(col.field)).toBe('agTextColumnFilter');
      expect(col.wrapText).withContext(String(col.field)).toBeFalsy();
      expect(col.autoHeight).withContext(String(col.field)).toBeFalsy();
    }
  });

  it('opens the source column in the read-only text popup', () => {
    // Arrange
    const grid = componentFor('ayah');
    grid.languages.set([
      { language: 'en', is_source: true, is_available: true },
      { language: 'ar', is_source: false, is_available: true },
    ] as never);
    grid.selectedLanguage.set('ar');

    // Act
    const columns = grid.buildColumnDefs();
    const source = columns.find((col) => col.field === 'source_text');
    const text = columns.find((col) => col.field === 'text');

    // Assert — the source cell opens read-only; the text editor gets its heading
    expect(source?.editable).toBeTrue();
    expect(source?.cellEditor).toBe(ContentTextCellEditorComponent);
    expect(source?.cellEditorParams).toEqual(jasmine.objectContaining({ readOnly: true }));
    expect(text?.cellEditorParams?.sourceTitle).toContain('ADMIN.CONTENT_EDITOR.COLUMNS.SOURCE');
  });

  it('paints text cells the draft changed since the last publish', () => {
    // Arrange
    const text = componentFor('ayah')
      .buildColumnDefs()
      .find((col) => col.field === 'text');
    const rule = text?.cellClassRules?.['content-grid__cell--changed'] as (p: unknown) => boolean;

    // Act / Assert
    expect(rule({ data: { changed: true } })).toBeTrue();
    expect(rule({ data: { changed: false } })).toBeFalse();
  });

  it('marks an edited cell as changed right away', () => {
    // Arrange
    const grid = componentFor('ayah');
    const row = { unit_id: 5, text: 'new', changed: false };

    // Act
    grid.onCellValueChanged({ data: row, oldValue: 'old', source: 'edit' } as never);

    // Assert
    expect(row.changed).toBeTrue();
  });

  it('takes the changed flag from the autosave response', async () => {
    // Arrange — the user typed the published text back in
    const grid = componentFor('ayah');
    const httpMock = TestBed.inject(HttpTestingController);
    const row = { unit_id: 5, text: 'published', changed: false };
    const refreshCells = jasmine.createSpy('refreshCells');
    grid.onGridReady({
      api: { getRowNode: (id: string) => (id === '5' ? { data: row } : undefined), refreshCells },
    } as never);
    grid.draftId.set(7);
    grid.onCellValueChanged({ data: row, oldValue: 'edited', source: 'edit' } as never);

    // Act
    const saved = grid.keepDraftOnLeave();
    httpMock
      .expectOne((r) => r.method === 'PATCH')
      .flush([{ unit_id: 5, text: 'published', changed: false }]);
    await saved;

    // Assert
    expect(row.changed).toBeFalse();
    expect(refreshCells).toHaveBeenCalled();
  });

  it('undoes and redoes a text edit by queueing the restored value for autosave', () => {
    // Arrange
    const grid = componentFor('ayah');
    const row = { unit_id: 5, text: 'new' } as never;
    grid.onCellValueChanged({ data: row, oldValue: 'old', source: 'edit' } as never);

    // Act
    grid.undo();

    // Assert
    expect(grid.canUndo()).toBeFalse();
    expect(grid.canRedo()).toBeTrue();
    expect(grid.hasUnsavedWork()).toBeTrue();

    // Act
    grid.redo();

    // Assert
    expect(grid.canUndo()).toBeTrue();
    expect(grid.canRedo()).toBeFalse();
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

  it('localizes the grid loading overlay through the app translations', () => {
    // Arrange / Act — no translations are loaded in tests, so the key comes back as-is
    const localeText = componentFor('ayah').localeText();

    // Assert
    expect(localeText['loadingOoo']).toBe('COMMON.LOADING');
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
    httpMock.expectOne((req) => req.url.includes('pending-diff/')).flush({ results: [], count: 0 });
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

  it('localizes the grid filter UI from the translation files', () => {
    // Arrange
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('ar', {
      COMMON: { LOADING: 'جارٍ التحميل...' },
      ADMIN: { CONTENT_EDITOR: { GRID: { equals: 'يساوي', greaterThan: 'أكبر من' } } },
    });
    translate.use('ar');

    // Act
    const localeText = componentFor('ayah').localeText();

    // Assert
    expect(localeText).toEqual({
      loadingOoo: 'جارٍ التحميل...',
      equals: 'يساوي',
      greaterThan: 'أكبر من',
    });
  });

  it('falls back to the grid defaults when the filter texts are missing', () => {
    // Arrange / Act — no translations loaded, so instant() echoes the key
    const localeText = componentFor('ayah').localeText();

    // Assert
    expect(Object.keys(localeText)).toEqual(['loadingOoo']);
  });

  describe('read-only version view', () => {
    function openViewer() {
      const fixture = TestBed.createComponent(AssetContentGridComponent);
      fixture.componentRef.setInput('kind', 'tafsir');
      fixture.componentRef.setInput('slug', 'demo-tafsir');
      fixture.componentRef.setInput('viewVersionId', 7);
      fixture.detectChanges();
      const httpMock = TestBed.inject(HttpTestingController);
      httpMock
        .expectOne((req) => req.url.includes('languages/'))
        .flush([
          { language: 'ar', is_source: true, is_available: true },
          { language: 'fr', is_source: false, is_available: true },
        ]);
      httpMock
        .expectOne((req) => req.method === 'GET' && req.url.endsWith('versions/7/'))
        .flush({
          id: 7,
          asset_id: 1,
          language: 'fr',
          name: 'v3',
          summary: '',
          state: 'published',
          entries_count: 1,
          created_at: '2026-01-01T00:00:00Z',
        });
      return { fixture, httpMock };
    }

    it('loads the given version instead of opening a draft', () => {
      // Arrange / Act
      const { fixture, httpMock } = openViewer();

      // Assert — rows come from the viewed version; no draft is created
      httpMock.expectNone((req) => req.url.includes('draft/'));
      const entries = httpMock.expectOne((req) => req.url.includes('versions/7/entries/'));
      expect(entries.request.method).toBe('GET');
      const grid = fixture.componentInstance;
      expect(grid.viewedVersion()?.name).toBe('v3');
      expect(grid.selectedLanguage()).toBe('fr');
    });

    it('opens text cells read-only and never reports unsaved work', () => {
      // Arrange
      const { fixture } = openViewer();
      const grid = fixture.componentInstance;

      // Act
      const text = grid.buildColumnDefs().find((col) => col.field === 'text')!;

      // Assert
      expect(grid.readOnly()).toBeTrue();
      expect((text.cellEditorParams as { readOnly: boolean }).readOnly).toBeTrue();
      expect(grid.hasUnsavedWork()).toBeFalse();
    });

    it('ignores a cell value that changes anyway (e.g. Delete on a focused cell)', () => {
      // Arrange
      const { fixture } = openViewer();
      const grid = fixture.componentInstance;

      // Act — what AG Grid reports when a key clears a cell directly
      grid.onCellValueChanged({ data: { unit_id: 1, text: '' }, oldValue: 'text' } as never);

      // Assert — nothing is queued for autosave
      expect(grid.dirty()).toBeFalse();
      expect(grid.hasUnsavedWork()).toBeFalse();
    });

    it('hides every editing control but keeps copying', () => {
      // Arrange
      const { fixture } = openViewer();
      fixture.detectChanges();
      const toolbar: HTMLElement = fixture.nativeElement.querySelector('.content-grid__toolbar');

      // Assert
      const labels = Array.from(toolbar.querySelectorAll('button')).map((b) => b.textContent ?? '');
      expect(labels.some((l) => l.includes('ADMIN.CONTENT_EDITOR.COPY.BUTTON'))).toBeTrue();
      expect(labels.some((l) => l.includes('ADMIN.CONTENT_EDITOR.COMMIT.BUTTON'))).toBeFalse();
      expect(labels.some((l) => l.includes('ADMIN.CONTENT_EDITOR.DISCARD'))).toBeFalse();
      expect(labels.some((l) => l.includes('ADMIN.CONTENT_EDITOR.LANGUAGE.ADD'))).toBeFalse();
      expect(toolbar.querySelector('nz-select')).toBeNull();
    });
  });

  describe('commit button', () => {
    function openEditor(pendingCount: number) {
      const fixture = TestBed.createComponent(AssetContentGridComponent);
      fixture.componentRef.setInput('kind', 'tafsir');
      fixture.componentRef.setInput('slug', 'demo-tafsir');
      fixture.detectChanges();
      const httpMock = TestBed.inject(HttpTestingController);
      httpMock
        .expectOne((req) => req.url.includes('languages/'))
        .flush([{ language: 'ar', is_source: true, is_available: true }]);
      httpMock
        .expectOne((req) => req.url.includes('draft/'))
        .flush({
          id: 3,
          asset_id: 1,
          language: 'ar',
          name: 'draft',
          summary: '',
          state: 'draft',
          entries_count: 0,
          created_at: '2026-01-01T00:00:00Z',
        });
      const count = httpMock.expectOne((req) => req.url.includes('pending-diff/'));
      expect(count.request.params.get('page_size')).toBe('1');
      count.flush({ results: [], count: pendingCount });
      fixture.detectChanges();
      return fixture;
    }

    function commitButton(fixture: ReturnType<typeof openEditor>): HTMLButtonElement {
      return fixture.nativeElement.querySelector('.content-grid__commit button');
    }

    it('is disabled with an explanation when the draft has no changes', () => {
      // Arrange / Act
      const fixture = openEditor(0);

      // Assert
      expect(fixture.componentInstance.nothingToCommit()).toBeTrue();
      expect(commitButton(fixture).disabled).toBeTrue();
    });

    it('is enabled when the draft differs from the latest version', () => {
      // Arrange / Act
      const fixture = openEditor(2);

      // Assert
      expect(fixture.componentInstance.nothingToCommit()).toBeFalse();
      expect(commitButton(fixture).disabled).toBeFalse();
    });

    it('ignores an older count that answers after a newer one', () => {
      // Arrange — the count on opening is still in flight…
      const fixture = TestBed.createComponent(AssetContentGridComponent);
      fixture.componentRef.setInput('kind', 'tafsir');
      fixture.componentRef.setInput('slug', 'demo-tafsir');
      fixture.detectChanges();
      const httpMock = TestBed.inject(HttpTestingController);
      httpMock
        .expectOne((req) => req.url.includes('languages/'))
        .flush([{ language: 'ar', is_source: true, is_available: true }]);
      httpMock
        .expectOne((req) => req.url.includes('draft/'))
        .flush({
          id: 3,
          asset_id: 1,
          language: 'ar',
          name: 'draft',
          summary: '',
          state: 'draft',
          entries_count: 0,
          created_at: '2026-01-01T00:00:00Z',
        });
      const opening = httpMock.expectOne((req) => req.url.includes('pending-diff/'));
      // …when a save asks again (as autosave does after it succeeds)
      (
        fixture.componentInstance as unknown as { refreshPendingCount(): void }
      ).refreshPendingCount();
      const afterSave = httpMock.expectOne((req) => req.url.includes('pending-diff/'));

      // Act — the newer answer arrives first, then the stale one
      afterSave.flush({ results: [], count: 2 });
      opening.flush({ results: [], count: 0 });

      // Assert
      expect(fixture.componentInstance.pendingCount()).toBe(2);
    });

    it('is enabled as soon as there is an unsaved edit', () => {
      // Arrange
      const fixture = openEditor(0);

      // Act — an edit waiting for autosave
      fixture.componentInstance.dirty.set(true);
      fixture.detectChanges();

      // Assert
      expect(commitButton(fixture).disabled).toBeFalse();
    });
  });
});
