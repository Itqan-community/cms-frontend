import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { AdminAuthService } from '../../services/admin-auth.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import type { AssetColumn } from '../../models/asset-content.models';
import { AssetContentGridComponent } from './asset-content-grid.component';

const QA: AssetColumn[] = [
  { key: 'question', label_en: 'Question', label_ar: 'السؤال', order: 0, committed: false },
  { key: 'answer', label_en: 'Answer', label_ar: '', order: 1, committed: false },
];

describe('AssetContentGridComponent text columns', () => {
  function grid(): AssetContentGridComponent {
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('template', 'ayah');
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.columns.set(QA);
    component.columnKeys.set(['question', 'answer']);
    return component;
  }

  function colIds(component: AssetContentGridComponent): string[] {
    return component.buildColumnDefs().map((col) => String(col.colId ?? col.field));
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

  it('shows one editable column per text column, in order, after the reference text', () => {
    // Arrange
    const component = grid();

    // Act
    const ids = colIds(component);

    // Assert
    expect(ids.slice(ids.indexOf('reference_text') + 1)).toEqual([
      'cell__question',
      'cell__answer',
    ]);
  });

  it('reads and writes the cell of its own column', () => {
    // Arrange
    const column = grid()
      .buildColumnDefs()
      .find((col) => col.colId === 'cell__answer')!;
    const row = { unit_id: 1, cells: { question: 'Q', answer: 'A' }, text: 'Q' };

    // Act
    const value = (column.valueGetter as (p: unknown) => string)({ data: row });
    (column.valueSetter as (p: unknown) => boolean)({ data: row, newValue: 'A2' });

    // Assert
    expect(value).toBe('A');
    expect(row.cells.answer).toBe('A2');
  });

  it('puts each source column before its translation only while the toggle is on', () => {
    // Arrange
    const component = grid();
    component.languages.set([
      { language: 'ar', is_source: true, is_available: true },
      { language: 'en', is_source: false, is_available: true },
    ]);
    component.selectedLanguage.set('en');

    // Act
    const hidden = colIds(component);
    component.showSource.set(true);
    const shown = colIds(component);

    // Assert
    expect(hidden.some((id) => id.startsWith('source__'))).toBeFalse();
    expect(shown.slice(shown.indexOf('reference_text') + 1)).toEqual([
      'source__question',
      'cell__question',
      'source__answer',
      'cell__answer',
    ]);
  });

  it('heads a column with its label in the interface language, then the other label, then the key', () => {
    // Arrange
    const component = grid();
    const translate = TestBed.inject(TranslateService);
    component.columns.set([
      ...QA,
      { key: 'extra', label_en: '', label_ar: '', order: 2, committed: false },
    ]);
    component.columnKeys.set(['question', 'answer', 'extra']);

    // Act
    translate.use('ar');
    const arabic = component.buildColumnDefs().map((col) => col.headerName);
    translate.use('en');
    const english = component.buildColumnDefs().map((col) => col.headerName);

    // Assert
    expect(arabic).toContain('السؤال');
    expect(arabic).toContain('Answer');
    expect(english).toContain('Question');
    expect(english).toContain('extra');
  });

  it('saves edits to two cells of one row as two patches, and undoes them in reverse order', async () => {
    // Arrange
    const component = grid();
    const httpMock = TestBed.inject(HttpTestingController);
    const row = { unit_id: 5, cells: { question: 'Q2', answer: 'A2' }, text: 'Q2' };
    component.draftId.set(7);
    component.onCellValueChanged({
      data: row,
      oldValue: 'Q',
      newValue: 'Q2',
      colDef: { colId: 'cell__question' },
      source: 'edit',
    } as never);
    component.onCellValueChanged({
      data: row,
      oldValue: 'A',
      newValue: 'A2',
      colDef: { colId: 'cell__answer' },
      source: 'edit',
    } as never);

    // Act
    const saved = component.keepDraftOnLeave();
    const patch = httpMock.expectOne((r) => r.method === 'PATCH');
    const rows = patch.request.body.rows;
    patch.flush([]);
    await saved;
    component.undo();
    component.undo();
    const undone = component.keepDraftOnLeave();
    const undoPatch = httpMock.expectOne((r) => r.method === 'PATCH');
    const undoRows = undoPatch.request.body.rows;
    undoPatch.flush([]);
    await undone;

    // Assert
    expect(rows).toEqual([
      { unit_id: 5, column: 'question', text: 'Q2' },
      { unit_id: 5, column: 'answer', text: 'A2' },
    ]);
    expect(undoRows).toEqual(
      jasmine.arrayWithExactContents([
        { unit_id: 5, column: 'answer', text: 'A' },
        { unit_id: 5, column: 'question', text: 'Q' },
      ])
    );
  });

  it('clears filters and reloads the columns when a filtered column no longer exists', () => {
    // Arrange
    const component = grid();
    const httpMock = TestBed.inject(HttpTestingController);
    const setFilterModel = jasmine.createSpy('setFilterModel');
    component.onGridReady({ api: { setFilterModel } } as never);
    httpMock.match((r) => r.url.endsWith('/columns/')).forEach((req) => req.flush(QA)); // the initial load

    // Act
    component.handleEntriesError(
      new HttpErrorResponse({ status: 400, error: { error_name: 'unknown_filter_column' } })
    );

    // Assert
    expect(setFilterModel).toHaveBeenCalledWith(null);
    httpMock.expectOne((r) => r.method === 'GET' && r.url.endsWith('/columns/')).flush(QA);
  });

  it('copies every text column', () => {
    // Arrange
    const component = grid();

    // Act
    const table = component.copyTable([
      {
        unit_id: 1,
        order: 1,
        label: '1:1',
        reference_text: 'r',
        cells: { question: 'Q', answer: 'A' },
      } as never,
    ]);

    // Assert
    expect(table).toEqual([
      ['label', 'reference_text', 'question', 'answer'],
      ['1:1', 'r', 'Q', 'A'],
    ]);
  });
});

describe('AssetContentGridComponent column management access', () => {
  function gridWith(granted: string[]): AssetContentGridComponent {
    TestBed.configureTestingModule({
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
        {
          provide: AdminAuthService,
          useValue: { hasPermission: (code: string) => granted.includes(code) },
        },
        { provide: LastActiveLanguageService, useValue: { get: () => null, set: () => void 0 } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('template', 'ayah');
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function headerParams(component: AssetContentGridComponent): { canManage: boolean } {
    const column = component.buildColumnDefs().find((col) => col.colId === 'cell__text')!;
    return column.headerComponentParams as { canManage: boolean };
  }

  it('lets users with both permissions manage columns', () => {
    // Arrange / Act
    const component = gridWith(['portal_manage_asset_columns', 'portal_access_all_languages']);

    // Assert
    expect(component.canManageColumns()).toBeTrue();
    expect(headerParams(component).canManage).toBeTrue();
  });

  it('hides column management without access to every language', () => {
    // Arrange / Act
    const component = gridWith(['portal_manage_asset_columns']);

    // Assert
    expect(component.canManageColumns()).toBeFalse();
    expect(headerParams(component).canManage).toBeFalse();
  });

  it('hides column management without the manage permission', () => {
    // Arrange / Act
    const component = gridWith(['portal_access_all_languages']);

    // Assert
    expect(component.canManageColumns()).toBeFalse();
  });
});

describe('AssetContentGridComponent commit after a column reorder', () => {
  let message: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };

  beforeEach(async () => {
    message = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info'),
    };
    await TestBed.configureTestingModule({
      imports: [AssetContentGridComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: NzMessageService, useValue: message },
        { provide: NzModalService, useValue: { confirm: () => void 0, info: () => void 0 } },
        { provide: AdminAuthService, useValue: { hasPermission: () => true } },
        { provide: LastActiveLanguageService, useValue: { get: () => null, set: () => void 0 } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();
  });

  function grid(): AssetContentGridComponent {
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('template', 'ayah');
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('opens the commit dialog on a major version with minor unavailable', async () => {
    // Arrange
    const component = grid();
    component.draftId.set(7);
    component.commitRequiresMajor.set(true);

    // Act
    component.openCommit();
    await Promise.resolve();
    await Promise.resolve();

    // Assert
    expect(component.commitBump()).toBe('major');
  });

  it('switches to major and explains why when the server requires it', () => {
    // Arrange
    const component = grid();
    component.commitDialogVisible.set(true);
    component.commitBump.set('minor');

    // Act
    component.handleCommitError(
      new HttpErrorResponse({
        status: 400,
        error: { error_name: 'major_bump_required', message: 'x' },
      })
    );

    // Assert
    expect(component.commitDialogVisible()).toBeTrue();
    expect(component.commitBump()).toBe('major');
    expect(component.commitRequiresMajor()).toBeTrue();
    expect(message.error).not.toHaveBeenCalled();
  });
});
