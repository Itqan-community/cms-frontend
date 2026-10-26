import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RowStyleModule } from 'ag-grid-community';
import type { ColDef, GridApi, SuppressKeyboardEventParams } from 'ag-grid-community';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { of, throwError } from 'rxjs';
import type {
  AssetLanguage,
  ContentDraftVersion,
  ContentEntry,
} from '../../models/asset-content.models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetContentService } from '../../services/asset-content.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import { AssetContentGridComponent, GRID_MODULES } from './asset-content-grid.component';
import { GroupRangeCellComponent, type GroupRangeCellParams } from './group-range-cell.component';

const SOURCE: AssetLanguage = { language: 'ar', is_source: true, is_available: true };
const ENGLISH: AssetLanguage = { language: 'en', is_source: false, is_available: true };

function draft(template: ContentDraftVersion['template']): ContentDraftVersion {
  return {
    id: 7,
    asset_id: 1,
    language: 'ar',
    name: '',
    state: 'draft',
    entries_count: 0,
    created_at: '2026-10-26T00:00:00Z',
    column_keys: ['text'],
    requires_major: false,
    template,
    label_en: '',
    label_ar: '',
    summary_en: '',
    summary_ar: '',
  };
}

function row(overrides: Partial<ContentEntry> = {}): ContentEntry {
  return {
    unit_type: 'ayah_group',
    unit_id: 1000003,
    label: '1:1 → 1:3',
    reference_text: 'a1 a2 a3',
    sura: 1,
    aya: 1,
    cells: { text: 't' },
    text: 't',
    order: 1000003,
    group_from: { surah: 1, ayah: 1, word: null },
    group_to: { surah: 1, ayah: 3, word: null },
    orphaned: false,
    ...overrides,
  };
}

describe('AssetContentGridComponent groups', () => {
  let service: jasmine.SpyObj<AssetContentService>;
  let message: jasmine.SpyObj<NzMessageService>;
  let modal: jasmine.SpyObj<NzModalService>;
  let gridApi: jasmine.SpyObj<GridApi<ContentEntry>>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<AssetContentService>('AssetContentService', [
      'listColumns',
      'listLanguages',
      'createDraft',
      'pendingChanges',
      'getEntries',
      'addGroup',
      'moveGroup',
      'deleteGroup',
      'appendGroup',
      'extendGroup',
      'commit',
    ]);
    service.listColumns.and.returnValue(of([]));
    service.listLanguages.and.returnValue(of([SOURCE, ENGLISH]));
    service.createDraft.and.returnValue(of(draft('ayah_group')));
    service.pendingChanges.and.returnValue(of({ results: [], count: 0 }));
    service.getEntries.and.returnValue(of({ results: [], count: 0 }));
    message = jasmine.createSpyObj<NzMessageService>('NzMessageService', [
      'success',
      'error',
      'info',
      'warning',
    ]);
    modal = jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm', 'info']);
    gridApi = jasmine.createSpyObj<GridApi<ContentEntry>>('GridApi', [
      'refreshInfiniteCache',
      'getRowNode',
      'refreshCells',
      'ensureIndexVisible',
      'setFocusedCell',
    ]);
    TestBed.configureTestingModule({
      imports: [AssetContentGridComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: AssetContentService, useValue: service },
        { provide: NzMessageService, useValue: message },
        { provide: AdminAuthService, useValue: { hasPermission: () => true } },
        { provide: LastActiveLanguageService, useValue: { get: () => null, set: () => void 0 } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    // The component imports NzModalModule, whose own provider shadows a root one.
    TestBed.overrideProvider(NzModalService, { useValue: modal });
    await TestBed.compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      ADMIN: {
        CONTENT_EDITOR: {
          ERRORS: { GROUP_EXISTS: 'Range exists', ORPHANED_GROUPS: 'Orphans: {{groups}}' },
        },
      },
    });
    translate.use('en');
  });

  function grid(): AssetContentGridComponent {
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'tafsir');
    fixture.componentRef.setInput('slug', 'grouped');
    fixture.detectChanges();
    const component = fixture.componentInstance;
    (component as unknown as { gridApi: GridApi<ContentEntry> }).gridApi = gridApi;
    return component;
  }

  function colIds(component: AssetContentGridComponent): string[] {
    return component.buildColumnDefs().map((col) => String(col.colId ?? col.field));
  }

  function textColumn(component: AssetContentGridComponent): ColDef<ContentEntry> {
    return component.buildColumnDefs().find((col) => col.colId === 'cell__text')!;
  }

  it('builds group columns and offers Add group for an empty group draft', () => {
    // Arrange / Act
    const component = grid();

    // Assert
    expect(component.effectiveTemplate()).toBe('ayah_group');
    expect(component.canEditGroups()).toBeTrue();
    expect(colIds(component)).toEqual(['surah', 'reference_text', 'cell__text', 'group_actions']);
  });

  it('keeps the previous column ids for an ayah asset', () => {
    // Arrange
    service.createDraft.and.returnValue(of(draft('ayah')));

    // Act
    const component = grid();

    // Assert
    expect(colIds(component)).toEqual(['surah', 'sura', 'aya', 'reference_text', 'cell__text']);
    expect(component.canEditGroups()).toBeFalse();
  });

  it('offers only Delete, and only on orphaned rows, on a translated language', () => {
    // Arrange
    const component = grid();

    // Act
    component.selectedLanguage.set('en');

    // Assert
    expect(component.canEditGroups()).toBeFalse();
    expect(component.groupActionsFor(row())).toEqual({ move: false, remove: false });
    expect(component.groupActionsFor(row({ orphaned: true }))).toEqual({
      move: false,
      remove: true,
    });
    component.selectedLanguage.set('ar');
    expect(component.groupActionsFor(row())).toEqual({ move: true, remove: true });
  });

  it("opens an orphaned row's text read-only", () => {
    // Arrange
    const component = grid();
    const column = textColumn(component);

    // Act
    const orphan = column.cellEditorSelector!({ data: row({ orphaned: true }) } as never);
    const normal = column.cellEditorSelector!({ data: row() } as never);

    // Assert
    expect(orphan?.params.readOnly).toBeTrue();
    expect(normal?.params.readOnly).toBeFalse();
  });

  it('saves pending edits, adds the group and refreshes the rows', async () => {
    // Arrange
    service.addGroup.and.returnValue(of([row()]));
    const component = grid();
    component.openAddGroup();

    // Act
    await component.confirmGroup({
      start: { surah: 1, ayah: 1 },
      end: { surah: 1, ayah: 3 },
      cells: { text: 't' },
    });

    // Assert
    expect(service.addGroup).toHaveBeenCalledWith(
      'tafsir',
      'grouped',
      7,
      { surah: 1, ayah: 1 },
      { surah: 1, ayah: 3 },
      { text: 't' }
    );
    expect(gridApi.refreshInfiniteCache).toHaveBeenCalled();
    expect(component.groupModal()).toBeNull();
  });

  it('keeps the dialog open with the error when the range already exists', async () => {
    // Arrange
    service.addGroup.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { error_name: 'group_exists' } })
      )
    );
    const component = grid();
    component.openAddGroup();

    // Act
    await component.confirmGroup({
      start: { surah: 1, ayah: 1 },
      end: { surah: 1, ayah: 3 },
      cells: { text: 't' },
    });

    // Assert
    expect(component.groupModal()).not.toBeNull();
    expect(component.groupError()).toBe('Range exists');
    expect(gridApi.refreshInfiniteCache).not.toHaveBeenCalled();
  });

  it("moves the row's group by its unit id", async () => {
    // Arrange
    service.moveGroup.and.returnValue(of([row({ unit_id: 2000003 })]));
    const component = grid();
    component.openMoveGroup(row());

    // Act
    await component.confirmGroup({
      start: { surah: 1, ayah: 2 },
      end: { surah: 1, ayah: 3 },
      cells: {},
    });

    // Assert
    expect(service.moveGroup).toHaveBeenCalledWith(
      'tafsir',
      'grouped',
      7,
      1000003,
      { surah: 1, ayah: 2 },
      { surah: 1, ayah: 3 }
    );
    expect(gridApi.refreshInfiniteCache).toHaveBeenCalled();
  });

  it('deletes a group once confirmed', async () => {
    // Arrange
    service.deleteGroup.and.returnValue(of(undefined));
    const component = grid();

    // Act
    component.confirmDeleteGroup(row());
    const options = modal.confirm.calls.mostRecent().args[0] as { nzOnOk: () => Promise<void> };
    await options.nzOnOk();

    // Assert
    expect(service.deleteGroup).toHaveBeenCalledWith('tafsir', 'grouped', 7, 1000003);
    expect(gridApi.refreshInfiniteCache).toHaveBeenCalled();
  });

  it('lists the orphaned groups when a commit is refused for them', () => {
    // Arrange
    const component = grid();

    // Act
    component.handleCommitError(
      new HttpErrorResponse({
        status: 400,
        error: { error_name: 'orphaned_groups', extra: { groups: ['1:1 → 1:3'] } },
      })
    );

    // Assert
    expect(message.error).toHaveBeenCalledWith('Orphans: \u20661:1 → 1:3\u2069', {
      nzDuration: 0,
    });
  });

  it('ignores Delete and Backspace on an orphaned cell but not on a normal one', () => {
    // Arrange
    const suppress = textColumn(grid()).suppressKeyboardEvent!;
    const press = (data: ContentEntry) =>
      ({
        editing: false,
        event: { key: 'Delete' },
        data,
      }) as unknown as SuppressKeyboardEventParams<ContentEntry>;

    // Act / Assert
    expect(suppress(press(row({ orphaned: true })))).toBeTrue();
    expect(suppress(press(row()))).toBeFalse();
  });

  it('skips orphaned rows when pasting down a column', () => {
    // Arrange
    const component = grid();
    const nodes = [
      { data: row({ unit_id: 1 }), setDataValue: jasmine.createSpy('first') },
      { data: row({ unit_id: 2, orphaned: true }), setDataValue: jasmine.createSpy('orphan') },
      { data: row({ unit_id: 3 }), setDataValue: jasmine.createSpy('third') },
    ];
    (component as unknown as { gridApi: unknown }).gridApi = {
      getEditingCells: () => [],
      getFocusedCell: () => ({ rowIndex: 0, column: { getColId: () => 'cell__text' } }),
      getAllDisplayedColumns: () => [{ getColId: () => 'cell__text' }],
      getDisplayedRowAtIndex: (index: number) => nodes[index],
    };
    const event = {
      clipboardData: { getData: () => 'a\nb\nc' },
      preventDefault: () => void 0,
    } as unknown as ClipboardEvent;

    // Act
    component.onPaste(event);

    // Assert
    expect(nodes[0].setDataValue).toHaveBeenCalledWith('cell__text', 'a');
    expect(nodes[1].setDataValue).not.toHaveBeenCalled();
    expect(nodes[2].setDataValue).toHaveBeenCalledWith('cell__text', 'c');
  });

  it('drops edits of ranges the source no longer has instead of retrying them forever', async () => {
    // Arrange
    service.patchEntries = jasmine
      .createSpy('patchEntries')
      .and.returnValue(
        throwError(
          () => new HttpErrorResponse({ status: 400, error: { error_name: 'group_not_in_source' } })
        )
      );
    const component = grid();
    const internals = component as unknown as {
      pendingRows: Map<string, unknown>;
      flushPending: () => Promise<boolean>;
    };
    internals.pendingRows.set('1000003:text', { unit_id: 1000003, column: 'text', text: 'x' });

    // Act
    await internals.flushPending();
    const second = await internals.flushPending();

    // Assert
    expect(internals.pendingRows.size).toBe(0);
    expect(second).toBeTrue();
    expect(gridApi.refreshInfiniteCache).toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalled();
  });

  it('registers the row-style module that rowClassRules needs', () => {
    // Arrange / Act / Assert
    expect(GRID_MODULES).toContain(RowStyleModule);
  });

  it('keeps the orphaned-groups error on screen and caps the list at ten', () => {
    // Arrange
    const component = grid();
    const groups = Array.from({ length: 12 }, (_, i) => `1:${i + 1}`);

    // Act
    component.handleCommitError(
      new HttpErrorResponse({
        status: 400,
        error: { error_name: 'orphaned_groups', extra: { groups } },
      })
    );

    // Assert
    const [text, options] = message.error.calls.mostRecent().args;
    expect(options).toEqual({ nzDuration: 0 });
    expect((text as string).endsWith('…')).toBeTrue();
    expect((text as string).match(/1:/g)?.length).toBe(10);
  });

  it('shows range labels left-to-right so the arrow reads start to end in Arabic', () => {
    // Arrange
    const component = grid();

    // Act
    const unit = component.buildColumnDefs().find((col) => col.colId === 'surah')!;

    // Assert
    expect(unit.cellStyle).toEqual(
      jasmine.objectContaining({ direction: 'ltr', unicodeBidi: 'isolate' })
    );
  });

  it('edits the range in its cell: editable on the source, read-only on a translation', () => {
    // Arrange
    const component = grid();
    const unit = component.buildColumnDefs().find((col) => col.colId === 'surah')!;
    const params = unit.cellRendererParams as GroupRangeCellParams;

    // Act / Assert
    expect(unit.cellRenderer).toBe(GroupRangeCellComponent);
    expect(params.editable(row())).toBeTrue();
    component.selectedLanguage.set('en');
    expect(params.editable(row())).toBeFalse();
  });

  it('lets keys typed in the range boxes reach them instead of the grid', () => {
    // Arrange
    const unit = grid()
      .buildColumnDefs()
      .find((col) => col.colId === 'surah')!;
    const input = document.createElement('input');

    // Act / Assert
    expect(
      unit.suppressKeyboardEvent!({
        event: { target: input },
      } as unknown as SuppressKeyboardEventParams<ContentEntry>)
    ).toBeTrue();
  });

  it('grows a group by one step from its cell', async () => {
    // Arrange
    service.extendGroup.and.returnValue(of([row({ unit_id: 1000004 })]));
    const component = grid();

    // Act
    await component.extendGroupBy(row(), 1);

    // Assert
    expect(service.extendGroup).toHaveBeenCalledWith('tafsir', 'grouped', 7, 1000003, 1);
    expect(gridApi.refreshInfiniteCache).toHaveBeenCalled();
  });

  it('saves a range typed in its cell', async () => {
    // Arrange
    service.moveGroup.and.returnValue(of([row({ unit_id: 2000003 })]));
    const component = grid();

    // Act
    await component.changeGroupRange(row(), { surah: 1, ayah: 2 }, { surah: 1, ayah: 3 });

    // Assert
    expect(service.moveGroup).toHaveBeenCalledWith(
      'tafsir',
      'grouped',
      7,
      1000003,
      { surah: 1, ayah: 2 },
      { surah: 1, ayah: 3 }
    );
  });

  it('adds the next group, then scrolls to it and focuses its text', async () => {
    // Arrange
    service.appendGroup.and.returnValue(of([row({ unit_id: 4000004 })]));
    service.getEntries.and.returnValue(of({ results: [], count: 120 }));
    const component = grid();
    const datasource = component.buildDatasource();
    const blockParams = (startRow: number) => ({
      startRow,
      endRow: startRow + 50,
      filterModel: {},
      sortModel: [],
      successCallback: () => void 0,
      failCallback: () => void 0,
      context: undefined,
    });

    // Act
    await component.appendGroup();
    datasource.getRows(blockParams(0) as never);
    await Promise.resolve();
    await Promise.resolve();
    datasource.getRows(blockParams(100) as never);
    await Promise.resolve();
    await Promise.resolve();

    // Assert
    expect(service.appendGroup).toHaveBeenCalledWith('tafsir', 'grouped', 7);
    expect(gridApi.ensureIndexVisible).toHaveBeenCalledWith(119, 'bottom');
    expect(gridApi.setFocusedCell).toHaveBeenCalledWith(119, 'cell__text');
  });

  it('shrinks the source group grid to its rows so Add next group sits under the last one', () => {
    // Arrange
    const component = grid();
    const sizes = { rowHeight: 34, headerHeight: 40 };

    // Act
    component.onGridReady({ api: { getSizesForCurrentTheme: () => sizes } } as never);
    component.entriesTotal.set(11);

    // Assert — header + filter row, 11 rows, borders and slack; capped at the usual height
    expect(component.fittedTableHeight()).toBe('min(70vh, 458px)');
    component.entriesTotal.set(0);
    expect(component.fittedTableHeight()).toBe('min(70vh, 186px)');
  });

  it('keeps the usual grid height where groups are not edited', () => {
    // Arrange
    const component = grid();
    component.onGridReady({
      api: { getSizesForCurrentTheme: () => ({ rowHeight: 34, headerHeight: 40 }) },
    } as never);

    // Act
    component.selectedLanguage.set('en');

    // Assert
    expect(component.fittedTableHeight()).toBeNull();
  });
});
