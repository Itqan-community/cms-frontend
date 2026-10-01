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
import { AssetContentGridComponent } from './asset-content-grid.component';
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
});
