import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  Input,
  OnInit,
  computed,
  inject,
  input,
  isDevMode,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type {
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridReadyEvent,
  IsFullWidthRowParams,
  BodyScrollEvent,
  GridApi,
  IDatasource,
  IGetRowsParams,
  INumberFilterParams,
  ITextFilterParams,
  LocaleText,
  RowSelectionOptions,
  SuppressKeyboardEventParams,
} from 'ag-grid-community';
import {
  CellStyleModule,
  ColumnApiModule,
  CustomEditorModule,
  CustomFilterModule,
  InfiniteRowModelModule,
  LocaleModule,
  ModuleRegistry,
  NumberFilterModule,
  PinnedRowModule,
  RenderApiModule,
  RowApiModule,
  RowSelectionModule,
  RowStyleModule,
  TextFilterModule,
  TooltipModule,
  ValidationModule,
  themeQuartz,
} from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subject, catchError, debounceTime, forkJoin, of, takeUntil, type Observable } from 'rxjs';
import type {
  AssetColumn,
  AssetLanguage,
  AssetTemplate,
  AssetVersionParentKind,
  ContentChange,
  ContentDraftVersion,
  ContentEntry,
  ContentEntryPatch,
  QuranPosition,
} from '../../models/asset-content.models';
import { isGroupTemplate } from '../../models/asset-content.models';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';
import type { VersionBump } from '../../models/asset-versions.models';
import { AssetContentService } from '../../services/asset-content.service';
import { AssetVersionsService } from '../../services/asset-versions.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import {
  mapClipboardToColumns,
  parseClipboardTable,
  serializeCsv,
} from '../../utils/clipboard-table.util';
import { columnLabel } from '../../utils/column-label.util';
import { ISO_639_LANGUAGES, localizedLanguageName } from '../../utils/iso-639.util';
import { isVersionNumber } from '../../utils/version-number.util';
import { ContentChangesComponent } from '../content-changes/content-changes.component';
import { VersionNumberFieldComponent } from '../version-number-field/version-number-field.component';
import {
  ManageColumnsModalComponent,
  type ColumnsChange,
} from '../manage-columns-modal/manage-columns-modal.component';
import {
  GroupRangeModalComponent,
  type GroupRangeResult,
} from '../group-range-modal/group-range-modal.component';
import { ContentColumnHeaderComponent } from './content-column-header.component';
import { GroupRangeCellComponent, type GroupRangeCellParams } from './group-range-cell.component';
import {
  GroupActionsCellComponent,
  type GroupActionsCellParams,
} from './group-actions-cell.component';
import {
  ContentTextCellEditorComponent,
  type ContentTextEditorParams,
} from './content-text-cell-editor.component';
import { surahLabel } from '../../models/quran-metadata';
import { SurahFloatingFilterComponent } from './surah-floating-filter.component';
import {
  EMPTY_VERSION_TEXT,
  hasVersionSummary,
  trimVersionText,
  type VersionText,
} from '../../utils/version-text.util';

// Only the features this grid uses, not `AllCommunityModule`: it keeps the editor's
// download smaller. Dev builds add `ValidationModule`, which names any module a
// new grid option or API call needs (AG Grid error #200) instead of failing quietly.
export const GRID_MODULES = [
  InfiniteRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  CustomFilterModule,
  CustomEditorModule,
  RowSelectionModule,
  // `rowClassRules` (orphaned group rows).
  RowStyleModule,
  // The blank row under a group grid's rows (`addNextSpacer`).
  PinnedRowModule,
  CellStyleModule,
  TooltipModule,
  LocaleModule,
  RowApiModule,
  RenderApiModule,
  ColumnApiModule,
  ...(isDevMode() ? [ValidationModule] : []),
];
ModuleRegistry.registerModules(GRID_MODULES);

/**
 * Stops AG Grid clearing a focused cell on Delete/Backspace for a column that is
 * "editable" only to open its read-only popup. Keys inside an open editor still work.
 */
export function suppressClearKeys(params: SuppressKeyboardEventParams<ContentEntry>): boolean {
  return !params.editing && (params.event.key === 'Delete' || params.event.key === 'Backspace');
}

/** Columns the positional paste is allowed to write into. */
/** Column ids of a text column's own cells and of its source-language reference. */
const CELL_PREFIX = 'cell__';
const SOURCE_PREFIX = 'source__';
/** Before the asset's columns load, a grid shows the single default column. */
const DEFAULT_COLUMN_KEYS = ['text'];

/** Whether a grid column holds editable cells (a text column of the edited version). */
function isCellColumn(colId: string | undefined): colId is string {
  return !!colId && colId.startsWith(CELL_PREFIX);
}

/** Language codes that should render with RTL direction in the source column. */
const RTL_LANGUAGE_CODES = new Set(['ar', 'fa', 'ur', 'ps', 'ku', 'he', 'yi', 'sd', 'ug']);

const AUTOSAVE_DEBOUNCE_MS = 800;
/** Orphaned groups named in a refused commit's message. */
const ORPHANS_SHOWN = 10;
/** Diameter of the floating "Add next group" button, in px. */
const ADD_NEXT_SIZE = 36;
/** Space between the last row and the floating "Add next group" button, in px. */
const ADD_NEXT_GAP = 6;
/** The pinned blank row under a group grid's rows (see `addNextSpacer`). */
const ADD_NEXT_SPACER = { unit_id: -1 } as ContentEntry;
/**
 * Rows per infinite-scroll block. Must equal the `cacheBlockSize` bound in
 * the template: AG Grid always requests blocks aligned to that size, so
 * `endRow - startRow` derives the page size safely from it — pin both to
 * this one constant instead of hardcoding it twice.
 */
const CACHE_BLOCK_SIZE = 50;
/** Edits kept for undo/redo. */
const UNDO_LIMIT = 50;
/** `setDataValue` source for undo/redo, so replayed edits aren't recorded again. */
const HISTORY_SOURCE = 'history';

/** A text-cell edit, replayable by undo/redo. */
interface CellEdit {
  unitId: number;
  /** Text column key. */
  column: string;
  oldValue: string;
  newValue: string;
}

/** Server-side text filter: every AG Grid text option, case-insensitive on the backend. */
const TEXT_FILTER_PARAMS: ITextFilterParams = { maxNumConditions: 2, trimInput: true };
/** Server-side number filter over whole numbers; `inRange` is inclusive on the backend. */
const NUMBER_FILTER_PARAMS: INumberFilterParams = {
  maxNumConditions: 2,
  inRangeInclusive: true,
  allowedCharPattern: '\\d',
};

/** Whether `row`'s cell in column `key` differs from the published version:
 *  per column when the backend names them, else the whole row's flag. */
function cellChanged(row: ContentEntry | undefined, key: string): boolean {
  if (!row?.changed) return false;
  return row.changed_columns ? row.changed_columns.includes(key) : true;
}

@Component({
  selector: 'app-asset-content-grid',
  standalone: true,
  imports: [
    AgGridAngular,
    ContentChangesComponent,
    TranslateModule,
    NgIcon,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzSwitchModule,
    NzToolTipModule,
    ManageColumnsModalComponent,
    VersionNumberFieldComponent,
    GroupRangeModalComponent,
  ],
  templateUrl: './asset-content-grid.component.html',
  styleUrl: './asset-content-grid.component.less',
})
export class AssetContentGridComponent implements OnInit {
  /** Which asset type this grid edits. */
  @Input({ required: true }) kind!: AssetVersionParentKind;
  /** Asset slug. */
  @Input({ required: true }) slug!: string;
  /** Content granularity of the asset; drives which columns are shown. Optional
   *  override — when unset, the template is derived from the loaded rows
   *  themselves (see `derivedTemplate`). Task 17 and tests bind this directly. */
  readonly template = input<AssetTemplate | null>(null);
  /** Mushaf layout name, when the asset's template is page-based. */
  readonly layoutName = input<string | null>(null);
  /**
   * Read-only mode: show this committed version instead of opening a draft.
   * Same columns, filters and copy as the editor; nothing can be edited.
   */
  readonly viewVersionId = input<number | null>(null);
  readonly readOnly = computed(() => this.viewVersionId() !== null);
  /** The version being viewed (read-only mode), once loaded. */
  readonly viewedVersion = signal<ContentDraftVersion | null>(null);

  /**
   * Template as declared by the asset, derived from the rows themselves.
   *
   * Every entry carries `unit_type`, and the endpoint always returns the
   * template's full canonical unit set, so row 0 always exists and every row
   * agrees (the template is immutable per asset). This avoids a second
   * request purely to learn something already on the wire — the host
   * component has no `asset.template` to bind today.
   */
  private readonly derivedTemplate = signal<AssetTemplate | null>(null);

  /** The template to actually build columns from: the explicit input, falling
   *  back to the value derived from the loaded rows. */
  readonly effectiveTemplate = computed(() => this.template() ?? this.derivedTemplate());

  /**
   * Every template scrolls through server-fetched blocks (AG Grid's infinite
   * row model), with sorting off and filters applied on the server — the grid
   * never holds the whole asset. Rows keep one fixed line height, so long
   * text is cut off in the cell and read in full in the cell editor.
   *
   * The grid is only created once the template is known (bound, or derived
   * from a one-row probe), or loading ended without one (no rows / load
   * error), so its first columns — and their filters — are already right.
   */
  readonly canCreateGrid = computed(() => this.effectiveTemplate() !== null || !this.loading());

  /** Rows per infinite-scroll block; bind the same value to `cacheBlockSize`. */
  readonly cacheBlockSize = CACHE_BLOCK_SIZE;

  /** Stable row ids, so undo/redo can find a row again by its unit. */
  readonly getRowId = (params: GetRowIdParams<ContentEntry>): string => String(params.data.unit_id);

  private readonly contentService = inject(AssetContentService);
  private readonly versionsService = inject(AssetVersionsService);
  private readonly lastLanguage = inject(LastActiveLanguageService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly adminAuth = inject(AdminAuthService);

  /** Starting a new language is controlled separately from editing one. */
  readonly canAddLanguage = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ADD_ASSET_LANGUAGE)
  );

  private gridApi?: GridApi<ContentEntry>;
  private readonly autosave$ = new Subject<void>();
  /** Bumped on each language load so stale draft/entry responses are ignored. */
  private loadGeneration = 0;
  /** Bumped per change-count request: only the newest answer may set `pendingCount`. */
  private pendingCountRequest = 0;

  /** Unit ids with unsaved edits pending the next autosave flush. */
  /** Unsaved cells keyed `${unit_id}:${column}`. */
  private readonly pendingRows = new Map<string, ContentEntryPatch>();
  /** The asset's text columns (keys, labels), for headers. */
  readonly columns = signal<AssetColumn[]>([]);
  /** The shown version's text column keys, in file order. */
  readonly columnKeys = signal<string[]>(DEFAULT_COLUMN_KEYS);
  /** Translating: show each source column beside its translation. */
  readonly showSource = signal(false);
  /** Adding, labelling, reordering and deleting columns: few users may, and only
   *  with access to every language (a column applies to all of them). */
  readonly canManageColumns = computed(
    () =>
      this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_MANAGE_ASSET_COLUMNS) &&
      this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS_ALL_LANGUAGES)
  );
  readonly manageColumnsVisible = signal(false);
  readonly manageColumnsFocus = signal<string | null>(null);

  /** Undo/redo history. AG Grid's built-in undo only covers the client-side
   *  row model, so text edits are tracked here instead. */
  private readonly undoStack: CellEdit[] = [];
  private readonly redoStack: CellEdit[] = [];

  readonly draftId = signal<number | null>(null);
  /** Real differences between the draft and the latest version (server-side,
   *  so text edited back to its original does not count). `null` = not known yet. */
  readonly pendingCount = signal<number | null>(null);
  /** Nothing to commit: the saved draft matches the latest version and no edit
   *  is waiting to be saved. Unknown counts never block committing. */
  readonly nothingToCommit = computed(
    () => this.pendingCount() === 0 && !this.dirty() && !this.saving()
  );
  /** True once an edit has been saved to the draft since the editor opened
   *  (or the language changed). Opening always loads a draft, so `draftId`
   *  alone would show "all changes saved" before anything was edited. */
  readonly savedOnce = signal(false);
  /** First-block requests in flight — the initial load, or a refetch after a
   *  filter change resets the grid to row 0. Scroll blocks don't count. */
  private readonly firstBlocksInFlight = signal(0);
  /** Drives the grid's loading overlay while the first block is on its way. */
  readonly refreshing = computed(() => this.firstBlocksInFlight() > 0);
  readonly loading = signal(true);

  /** Languages the asset provides content in (source first). */
  readonly languages = signal<AssetLanguage[]>([]);
  /** The language currently being edited (exactly one at a time). */
  readonly selectedLanguage = signal<string | null>(null);
  /** True when editing the source language (no reference column, no seeding). */
  readonly isEditingSource = computed(() => {
    const sel = this.selectedLanguage();
    return this.languages().find((l) => l.language === sel)?.is_source ?? true;
  });
  /** The asset's rows are publisher-chosen ranges (ayah_group / word_group). */
  readonly isGroup = computed(() => isGroupTemplate(this.effectiveTemplate()));
  /** Groups are added, moved and deleted in the source language's draft only. */
  readonly canEditGroups = computed(
    () => this.isGroup() && this.isEditingSource() && !this.readOnly()
  );
  /** The add-group dialog is open. */
  readonly addGroupOpen = signal(false);
  readonly groupBusy = signal(false);
  /** "Add next group" ran: scroll to and focus the last row once it loads. */
  private focusLastRow = false;
  readonly groupError = signal<string | null>(null);
  /** Text column titles for the add dialog's text boxes. */
  readonly groupColumnTitles = computed(() =>
    Object.fromEntries(this.columnKeys().map((key) => [key, this.columnTitle(key)]))
  );
  /** Orphaned rows (a translation's text for a range its source dropped) are marked. */
  readonly rowClassRules = {
    'content-grid__row--orphaned': (params: { data?: ContentEntry }) => !!params.data?.orphaned,
  };

  /** Localized language name for the current UI language (e.g. fr → "الفرنسية"). */
  readonly langName = (code: string): string =>
    localizedLanguageName(code, this.translate.currentLang || 'en');

  /** "Add language" modal state. */
  readonly addLanguageVisible = signal(false);
  readonly addLanguageBusy = signal(false);
  readonly newLanguage = signal<string | null>(null);
  /** Optional file to seed the new language with (uploaded as its first version). */
  private newLanguageFile: File | null = null;
  readonly newLanguageFileName = signal<string | null>(null);
  /** The seed file becomes the language's first version: its name and starting number. */
  /** The new language's first version name, per language. */
  readonly newLanguageLabels = signal({ label_en: '', label_ar: '' });
  readonly newLanguageStart = signal('');
  readonly addLanguageBlocked = computed(
    () =>
      !this.newLanguage() ||
      (this.newLanguageFileName() !== null && !isVersionNumber(this.newLanguageStart()))
  );
  /** ISO options not already on the asset, labelled + sorted in the UI language. */
  readonly addableLanguages = computed(() => {
    const existing = new Set(this.languages().map((l) => l.language));
    return ISO_639_LANGUAGES.filter((l) => !existing.has(l.code))
      .map((l) => ({ code: l.code, label: this.langName(l.code) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });
  readonly saving = signal(false);
  readonly publishing = signal(false);
  readonly savingDraft = signal(false);
  readonly dirty = signal(false);

  /** Commit dialog state (required message + change review). */
  readonly commitDialogVisible = signal(false);
  /** The commit's message (its summary, at least one language) and version name
   *  (prefilled from the draft), per language. */
  readonly commitText = signal<VersionText>(EMPTY_VERSION_TEXT);
  readonly commitHasMessage = computed(() => hasVersionSummary(this.commitText()));
  /** The language's latest version number; null when this commit is its first. */
  readonly commitLatest = signal<string | null>(null);
  readonly commitLatestLoading = signal(false);
  /** The lookup failed: the number can't be derived, so committing is blocked. */
  readonly commitLatestError = signal(false);
  /** Emits to drop a lookup that reopening the dialog replaced. */
  private readonly cancelCommitLatest$ = new Subject<void>();
  readonly commitStart = signal('');
  readonly commitBump = signal<VersionBump>('minor');
  /** The draft's columns were reordered since the last version: only major is allowed. */
  readonly commitRequiresMajor = signal(false);
  readonly commitNumberIncomplete = computed(
    () =>
      this.commitLatestLoading() ||
      this.commitLatestError() ||
      (this.commitLatest() === null && !isVersionNumber(this.commitStart()))
  );
  /** The open draft's version name, carried over from the version it was seeded from. */
  /** The draft's version name per language, to prefill the commit. */
  private draftLabels = { label_en: '', label_ar: '' };
  readonly committing = signal(false);
  readonly pendingLoading = signal(false);
  readonly pendingError = signal(false);
  readonly pendingChanges = signal<ContentChange[]>([]);
  private activePatchesCount = 0;
  private activePatchError = false;
  readonly selectedCount = signal(0);
  readonly entriesTotal = signal(0);
  /** Row and header heights of the grid's theme, known once the grid is ready. */
  private readonly gridSizes = signal<{ rowHeight: number; headerHeight: number } | null>(null);
  /** How far the grid's rows are scrolled. */
  private readonly scrollTop = signal(0);
  /** A blank row pinned under the rows, so the floating "Add next group" button
   *  never covers the last row once the grid is full. */
  readonly addNextSpacer = computed(() => (this.canEditGroups() ? [ADD_NEXT_SPACER] : undefined));
  readonly isAddNextSpacer = (params: IsFullWidthRowParams<ContentEntry>): boolean =>
    params.rowNode.rowPinned === 'bottom';
  readonly blankRow = (): string => '';
  /** The floating "Add next group" button's top: just under the last row, and
   *  never below the pinned blank row at the bottom of the grid. */
  readonly addNextTop = computed(() => {
    const sizes = this.gridSizes();
    if (!sizes || !this.canEditGroups()) return null;
    const inset = (sizes.rowHeight - ADD_NEXT_SIZE) / 2;
    // Header + floating filter row, then the rows above the scroll position.
    const underLastRow =
      2 * sizes.headerHeight +
      this.entriesTotal() * sizes.rowHeight -
      this.scrollTop() +
      ADD_NEXT_GAP;
    // The pinned row's top, plus the grid's bottom border.
    return `min(${underLastRow}px, calc(100% - ${sizes.rowHeight + 1 - inset}px))`;
  });
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  readonly rtl = computed(() => this.translate.currentLang === 'ar');

  readonly theme = themeQuartz;

  /** Grid-owned text in the UI language. `localeText` is an @initial grid
   *  option, read once when the grid is created (after translations load;
   *  switching language reloads the page). `ADMIN.CONTENT_EDITOR.GRID` holds
   *  the filter UI texts under AG Grid's own locale keys (`equals`, …). */
  readonly localeText = computed<LocaleText>(() => {
    const grid: unknown = this.translate.instant('ADMIN.CONTENT_EDITOR.GRID');
    return {
      loadingOoo: this.translate.instant('COMMON.LOADING'),
      // instant() echoes the key string when the block is missing.
      ...(typeof grid === 'object' && grid !== null ? (grid as LocaleText) : {}),
    };
  });

  /** Checkbox multi-row selection (Community feature). */
  readonly rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    checkboxes: true,
    // The infinite row model has no select-all box (AG Grid warning #129).
    headerCheckbox: false,
  };

  readonly defaultColDef: ColDef<ContentEntry> = {
    resizable: true,
    // Rows come back in canonical order; the endpoint has no sort to apply.
    sortable: false,
    filter: false,
  };

  readonly columnDefs = computed(() => this.buildColumnDefs());

  ngOnInit(): void {
    this.autosave$
      .pipe(debounceTime(AUTOSAVE_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.flushPending());
    this.showSource.set(this.readShowSource());
    this.loadColumns();
    this.loadLanguages();
  }

  /** Load the asset's text columns (labels for headers; reloaded after edits to them). */
  loadColumns(): void {
    this.contentService
      .listColumns(this.kind, this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (columns) => {
          this.columns.set(columns);
          if (this.draftId() === null || !this.readOnly()) {
            this.columnKeys.set(
              columns.length > 0 ? columns.map((c) => c.key) : DEFAULT_COLUMN_KEYS
            );
          }
        },
        // A backend without columns (404) keeps the single text column, silently.
        error: (err: HttpErrorResponse) => {
          if (err?.status !== 404) this.showError(err);
        },
      });
  }

  /** Open the columns dialog, optionally on one column (its header gear). */
  openManageColumns(focusKey: string | null = null): void {
    this.manageColumnsFocus.set(focusKey);
    this.manageColumnsVisible.set(true);
  }

  /** The columns changed: reload them (their labels head the grid). A structural
   *  change also reloads the draft (its keys) and its rows, which now carry the
   *  new cells; a label edit needs neither. */
  onColumnsChanged(change: ColumnsChange = 'structure'): void {
    this.loadColumns();
    if (change === 'labels') return;
    void this.flushPending().then((ok) => {
      if (!ok || this.readOnly()) return;
      const language = this.selectedLanguage();
      if (!language) return;
      this.contentService
        .createDraft(this.kind, this.slug, language)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (draft) => {
            this.columnKeys.set(
              draft.column_keys?.length ? draft.column_keys : DEFAULT_COLUMN_KEYS
            );
            this.commitRequiresMajor.set(!!draft.requires_major);
            this.gridApi?.refreshInfiniteCache();
          },
          error: (err: HttpErrorResponse) => this.showError(err),
        });
    });
  }

  /** Show or hide the source columns while translating (remembered per asset). */
  setShowSource(show: boolean): void {
    this.showSource.set(show);
    try {
      localStorage.setItem(this.showSourceKey(), show ? '1' : '0');
    } catch {
      // Storage unavailable (private mode): the choice lasts for this page only.
    }
  }

  private readShowSource(): boolean {
    try {
      return localStorage.getItem(this.showSourceKey()) === '1';
    } catch {
      return false;
    }
  }

  private showSourceKey(): string {
    return `content-grid:show-source:${this.slug}`;
  }

  /** True while there are edits not yet persisted to the draft. */
  hasUnsavedWork(): boolean {
    if (this.readOnly()) return false;
    return this.dirty() || this.pendingRows.size > 0 || this.saving();
  }

  onGridReady(event: GridReadyEvent<ContentEntry>): void {
    this.gridApi = event.api;
    this.gridSizes.set(event.api.getSizesForCurrentTheme());
  }

  onBodyScroll(event: BodyScrollEvent<ContentEntry>): void {
    if (event.direction === 'vertical') this.scrollTop.set(event.top);
  }

  onCellValueChanged(event: CellValueChangedEvent<ContentEntry>): void {
    // A committed version is never edited here (the grid also sets readOnlyEdit).
    if (this.readOnly()) return;
    const row = event.data;
    const colId = event.colDef?.colId;
    const column = isCellColumn(colId) ? colId.slice(CELL_PREFIX.length) : this.columnKeys()[0];
    const text =
      (event.newValue as string | null | undefined) ?? row.cells?.[column] ?? row.text ?? '';
    // Assume the edit differs from the published text until the autosave
    // response says otherwise (see `applySavedRows`).
    row.changed = true;
    if (row.changed_columns && !row.changed_columns.includes(column)) {
      row.changed_columns = [...row.changed_columns, column];
    }
    // `force`: the grid has already drawn the new value, so a plain refresh skips it.
    if (event.node) {
      this.gridApi?.refreshCells({
        rowNodes: [event.node],
        columns: [CELL_PREFIX + column],
        force: true,
      });
    }
    this.pendingRows.set(`${row.unit_id}:${column}`, { unit_id: row.unit_id, column, text });
    this.dirty.set(true);
    this.autosave$.next();
    if (event.source !== HISTORY_SOURCE) {
      this.undoStack.push({
        unitId: row.unit_id,
        column,
        oldValue: (event.oldValue as string | null) ?? '',
        newValue: text,
      });
      if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
      this.redoStack.length = 0;
    }
    this.refreshUndoState();
  }

  /** Undo the last cell edit (autosaves the reverted value). */
  undo(): void {
    this.replay(this.undoStack, this.redoStack, 'oldValue');
  }

  /** Redo the last undone cell edit. */
  redo(): void {
    this.replay(this.redoStack, this.undoStack, 'newValue');
  }

  /** Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes — outside a cell editor,
   *  whose textarea keeps its own undo. */
  onKeydown(event: KeyboardEvent): void {
    if (
      this.readOnly() ||
      !(event.ctrlKey || event.metaKey) ||
      (this.gridApi?.getEditingCells().length ?? 0) > 0
    ) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
      event.preventDefault();
      this.redo();
    }
  }

  /**
   * Re-apply one edit's `old`/`new` value. A row scrolled or filtered out of
   * the loaded blocks has no node to update, so its value is queued for
   * autosave directly — the server copy is what the grid shows next time.
   */
  private replay(from: CellEdit[], to: CellEdit[], value: 'oldValue' | 'newValue'): void {
    const edit = from.pop();
    if (!edit) return;
    to.push(edit);
    const node = this.gridApi?.getRowNode(String(edit.unitId));
    if (node?.data) {
      node.setDataValue(CELL_PREFIX + edit.column, edit[value], HISTORY_SOURCE); // -> onCellValueChanged
    } else {
      this.pendingRows.set(`${edit.unitId}:${edit.column}`, {
        unit_id: edit.unitId,
        column: edit.column,
        text: edit[value],
      });
      this.dirty.set(true);
      this.autosave$.next();
      this.refreshUndoState();
    }
  }

  private refreshUndoState(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }

  private clearHistory(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.refreshUndoState();
  }

  /**
   * An AG Grid infinite datasource backed by the paginated entries endpoint.
   * AG Grid always requests blocks aligned to `cacheBlockSize` (bound to
   * `cacheBlockSize` in the template), so `endRow - startRow` recovers that
   * same page size instead of a second hardcoded constant that could drift
   * from it — and `page` is 1-indexed to match the endpoint, which rejects
   * `page=0` with a 400. The grid's filter model goes to the server as-is.
   * Pending edits are saved first, so a refetched block (after a filter
   * change) never shows text older than what was typed.
   */
  buildDatasource(): IDatasource {
    return {
      getRows: (params: IGetRowsParams) => {
        const versionId = this.draftId();
        if (versionId === null) {
          params.failCallback();
          return;
        }
        const pageSize = params.endRow - params.startRow;
        const page = Math.floor(params.startRow / pageSize) + 1;
        const firstBlock = params.startRow === 0;
        if (firstBlock) this.firstBlocksInFlight.update((n) => n + 1);
        const done = () => {
          if (firstBlock) this.firstBlocksInFlight.update((n) => n - 1);
        };
        void this.flushPending().then(() => {
          this.contentService
            .getEntries(this.kind, this.slug, versionId, page, pageSize, params.filterModel)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (response) => {
                done();
                this.entriesTotal.set(response.count);
                params.successCallback(response.results, response.count);
                this.revealAppendedGroup(params, response.count);
              },
              error: (err: HttpErrorResponse) => {
                done();
                params.failCallback();
                this.handleEntriesError(err);
              },
            });
        });
      },
    };
  }

  /** An entries request failed. A filter on a column that no longer exists (deleted
   *  elsewhere) is dropped and the columns reloaded, rather than failing forever. */
  handleEntriesError(err: HttpErrorResponse): void {
    if (err?.error?.error_name === 'unknown_filter_column') {
      this.gridApi?.setFilterModel(null);
      this.loadColumns();
      return;
    }
    this.showError(err);
  }

  /** Rebuilt whenever the draft changes (e.g. switching language), so AG Grid
   *  drops blocks cached from the previous draft instead of showing them. */
  readonly datasource = computed<IDatasource>(() => {
    this.draftId();
    return this.buildDatasource();
  });

  /**
   * Positional paste: with a cell focused (and not being edited), Ctrl+V fills
   * clipboard rows downward and columns rightward from the focused cell, writing
   * only into editable columns. Accepts TSV (spreadsheets) or CSV (files).
   */
  onPaste(event: ClipboardEvent): void {
    const api = this.gridApi;
    if (!api || this.readOnly()) return;
    // While a cell editor is open, let the textarea paste normally.
    if (api.getEditingCells().length > 0) return;

    const focused = api.getFocusedCell();
    if (!focused) return;

    if (!isCellColumn(focused.column.getColId())) {
      this.message.info(this.translate.instant('ADMIN.CONTENT_EDITOR.PASTE.SELECT_EDITABLE'));
      return;
    }

    const text = event.clipboardData?.getData('text/plain') ?? '';
    const parsed = parseClipboardTable(text);
    if (parsed.length === 0) return;
    // A content CSV (the grid's own copy or a file export) is written by header into
    // the matching text columns, so identifiers and Quran text never land in a cell.
    const { keys, rows } = mapClipboardToColumns(parsed, this.columnKeys());
    if (rows.length === 0) return;
    event.preventDefault();

    // Anything else fills text columns rightward from the focused one, skipping the
    // read-only columns (unit, reference, shown source columns) in between.
    const cellCols = api
      .getAllDisplayedColumns()
      .map((c) => c.getColId())
      .filter(isCellColumn);
    const startColIdx = cellCols.indexOf(focused.column.getColId());
    if (startColIdx < 0) return;

    let changed = 0;
    rows.forEach((values, r) => {
      const node = api.getDisplayedRowAtIndex(focused.rowIndex + r);
      // Rows past the loaded blocks have no data yet; paste stops there. An orphaned
      // group's text is read-only: the server would refuse the whole batch.
      if (!node?.data || node.data.orphaned) return;
      values.forEach((value, c) => {
        const colId = keys ? CELL_PREFIX + keys[c] : cellCols[startColIdx + c];
        if (!colId) return;
        node.setDataValue(colId, value); // fires onCellValueChanged -> autosave
        changed++;
      });
    });

    if (changed > 0) {
      this.message.success(
        this.translate.instant('ADMIN.CONTENT_EDITOR.PASTE.APPLIED', { count: changed })
      );
    }
  }

  onSelectionChanged(): void {
    this.selectedCount.set(this.gridApi?.getSelectedRows().length ?? 0);
  }

  /**
   * Copy the selected rows to the clipboard as CSV (`label,reference_text,text`
   * with a header). Pasting back into a Text cell is header-aware and writes
   * only the text column.
   */
  /** The copied table: unit label, reference text, then every text column, in unit order. */
  copyTable(rows: ContentEntry[]): string[][] {
    const keys = this.columnKeys();
    const sorted = [...rows].sort((a, b) => a.order - b.order || a.unit_id - b.unit_id);
    return [
      ['label', 'reference_text', ...keys],
      ...sorted.map((r) => [
        r.label,
        r.reference_text,
        // A row from a backend without columns carries only `text` (the first column).
        ...keys.map((key, i) => r.cells?.[key] ?? (i === 0 ? (r.text ?? '') : '')),
      ]),
    ];
  }

  copySelectedToCsv(): void {
    const api = this.gridApi;
    if (!api) return;
    const selected = api.getSelectedRows() as ContentEntry[];
    if (selected.length === 0) {
      this.message.info(this.translate.instant('ADMIN.CONTENT_EDITOR.COPY.NONE_SELECTED'));
      return;
    }
    const csv = serializeCsv(this.copyTable(selected));
    navigator.clipboard.writeText(csv).then(
      () =>
        this.message.success(
          this.translate.instant('ADMIN.CONTENT_EDITOR.COPY.COPIED', {
            count: selected.length,
          })
        ),
      () => this.message.error(this.translate.instant('ADMIN.CONTENT_EDITOR.COPY.FAILED'))
    );
  }

  /** Load the asset's languages, restoring the last-active one (else the source),
   *  and open its draft.
   *
   *  The draft is opened alongside the languages rather than after them, for the
   *  remembered language or else the source (the server's default), saving a
   *  round trip. An early open that fails (the language was removed) or is for
   *  another language than the list settles on falls back to opening that one. */
  private loadLanguages(): void {
    this.loading.set(true);
    const viewId = this.viewVersionId();
    const remembered = this.lastLanguage.get(this.kind, this.slug);
    const earlyDraft$ =
      viewId === null
        ? this.contentService
            .createDraft(this.kind, this.slug, remembered)
            .pipe(catchError(() => of(null)))
        : of(null);
    forkJoin({
      langs: this.contentService.listLanguages(this.kind, this.slug),
      draft: earlyDraft$,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ langs, draft }) => {
          this.languages.set(langs);
          if (viewId !== null) {
            this.loadViewedVersion(viewId);
            return;
          }
          const source = langs.find((l) => l.is_source) ?? langs[0];
          const initial = langs.find((l) => l.language === remembered) ?? source;
          this.selectedLanguage.set(initial?.language ?? null);
          if (draft && draft.language === initial?.language) {
            this.openDraft(draft, ++this.loadGeneration);
          } else {
            this.loadForLanguage();
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.showError(err);
        },
      });
  }

  /** Read-only mode: load the viewed version's language, then its rows. The
   *  rows come from the same entries endpoint as a draft's (`draftId` holds the
   *  viewed version's id), so filters and columns behave identically. */
  private loadViewedVersion(versionId: number): void {
    const generation = ++this.loadGeneration;
    this.contentService
      .getVersion(this.kind, this.slug, versionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (version) => {
          if (generation !== this.loadGeneration) return;
          this.viewedVersion.set(version);
          this.columnKeys.set(
            version.column_keys?.length ? version.column_keys : DEFAULT_COLUMN_KEYS
          );
          this.selectedLanguage.set(version.language);
          this.draftId.set(version.id);
          this.applyTemplate(version.template, generation);
        },
        error: (err: HttpErrorResponse) => {
          if (generation !== this.loadGeneration) return;
          this.loading.set(false);
          this.showError(err);
        },
      });
  }

  /** Open (get-or-create) the draft for the selected language and load its rows. */
  private loadForLanguage(): void {
    const language = this.selectedLanguage();
    if (!language) {
      this.loading.set(false);
      return;
    }
    const generation = ++this.loadGeneration;
    this.loading.set(true);
    this.contentService
      .createDraft(this.kind, this.slug, language)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (draft) => {
          if (generation !== this.loadGeneration) return;
          this.openDraft(draft, generation);
        },
        error: (err: HttpErrorResponse) => {
          if (generation !== this.loadGeneration) return;
          this.loading.set(false);
          this.showError(err);
        },
      });
  }

  /** Show an opened draft: its columns, change count and rows. */
  private openDraft(draft: ContentDraftVersion, generation: number): void {
    this.draftId.set(draft.id);
    this.columnKeys.set(draft.column_keys?.length ? draft.column_keys : DEFAULT_COLUMN_KEYS);
    this.commitRequiresMajor.set(!!draft.requires_major);
    this.draftLabels = { label_en: draft.label_en ?? '', label_ar: draft.label_ar ?? '' };
    this.refreshPendingCount();
    this.applyTemplate(draft.template, generation);
  }

  /** Create the grid from the version's template, or learn it from a one-row
   *  probe when the backend doesn't send it. */
  private applyTemplate(template: AssetTemplate | null | undefined, generation: number): void {
    if (!template) {
      this.loadTemplate(generation);
      return;
    }
    this.derivedTemplate.set(template);
    this.loading.set(false);
  }

  /** Switch the edited language: flush pending edits, then reload for the new one. */
  onLanguageChange(language: string): void {
    if (language === this.selectedLanguage()) return;
    void this.flushPending().then((ok) => {
      if (!ok) return;
      this.pendingRows.clear();
      this.dirty.set(false);
      this.savedOnce.set(false);
      this.clearHistory();
      this.pendingCount.set(null);
      this.selectedLanguage.set(language);
      this.lastLanguage.set(this.kind, this.slug, language);
      this.loadForLanguage();
    });
  }

  /** Open the "add language" modal. */
  openAddLanguage(): void {
    this.newLanguage.set(null);
    this.newLanguageLabels.set({ label_en: '', label_ar: '' });
    this.newLanguageStart.set('');
    this.clearNewLanguageFile();
    this.addLanguageVisible.set(true);
  }

  /** Pick the optional seed file for the new language. */
  onPickNewLanguageFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.newLanguageFile = file;
    this.newLanguageFileName.set(file?.name ?? null);
  }

  clearNewLanguageFile(): void {
    this.newLanguageFile = null;
    this.newLanguageFileName.set(null);
  }

  /** Confirm adding a translation language (optionally seeded from a file) and edit it. */
  confirmAddLanguage(): void {
    const language = this.newLanguage();
    if (!language || this.addLanguageBlocked()) return;
    this.addLanguageBusy.set(true);
    this.contentService
      .addLanguage(this.kind, this.slug, language, this.newLanguageFile, {
        label_en: this.newLanguageLabels().label_en.trim(),
        label_ar: this.newLanguageLabels().label_ar.trim(),
        number: this.newLanguageStart().trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (added) => {
          this.addLanguageBusy.set(false);
          this.addLanguageVisible.set(false);
          this.clearNewLanguageFile();
          this.languages.update((ls) => [...ls, added]);
          this.onLanguageChange(added.language);
        },
        error: (err: HttpErrorResponse) => {
          this.addLanguageBusy.set(false);
          this.showError(err);
        },
      });
  }

  /**
   * Learns the template from a one-row probe of the entries endpoint (every
   * entry carries `unit_type`) so the grid is created with the right columns;
   * the rows themselves are then scrolled in by the infinite datasource.
   */
  private loadTemplate(generation = this.loadGeneration): void {
    const versionId = this.draftId();
    if (versionId === null) return;
    this.contentService
      .getEntries(this.kind, this.slug, versionId, 1, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (generation !== this.loadGeneration) return;
          this.derivedTemplate.set(response.results[0]?.unit_type ?? null);
          this.entriesTotal.set(response.count);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          if (generation !== this.loadGeneration) return;
          this.loading.set(false);
          this.showError(err);
        },
      });
  }

  /** Copy the server's `changed` flag onto the saved rows, so a cell edited
   *  back to its published text loses its highlight. Rows edited again since
   *  this save keep their mark until their own save answers. */
  private applySavedRows(saved: ContentEntry[]): void {
    const api = this.gridApi;
    if (!api) return;
    const nodes = [];
    const pendingUnits = new Set(Array.from(this.pendingRows.values(), (patch) => patch.unit_id));
    for (const row of saved) {
      if (pendingUnits.has(row.unit_id)) continue;
      const node = api.getRowNode(String(row.unit_id));
      if (!node?.data) continue;
      node.data.changed = row.changed ?? false;
      node.data.changed_columns = row.changed_columns;
      nodes.push(node);
    }
    if (nodes.length > 0) {
      const columns = this.columnKeys().map((key) => CELL_PREFIX + key);
      api.refreshCells({ rowNodes: nodes, columns, force: true });
    }
  }

  /** Persist any pending edits to the draft. `true` on success/nothing to save. */
  private async flushPending(): Promise<boolean> {
    const versionId = this.draftId();
    if (versionId === null) {
      return true;
    }
    if (this.pendingRows.size > 0) {
      const batch = Array.from(this.pendingRows.values());
      this.pendingRows.clear();
      this.saving.set(true);
      this.activePatchesCount++;
      await new Promise<void>((resolve) => {
        this.contentService
          .patchEntries(this.kind, this.slug, versionId, batch)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (saved) => {
              this.activePatchesCount--;
              this.applySavedRows(saved);
              this.savedOnce.set(true);
              if (this.pendingRows.size === 0) {
                this.dirty.set(false);
                this.refreshPendingCount();
              }
              resolve();
            },
            error: (err: HttpErrorResponse) => {
              this.activePatchesCount--;
              this.activePatchError = true;
              if (err?.error?.error_name === 'unknown_column') {
                // A column was deleted or renamed elsewhere: keep only the edits of
                // columns that still exist, so they don't block every later save.
                void this.dropEditsOfMissingColumns(batch).then(resolve);
                return;
              }
              if (err?.error?.error_name === 'group_not_in_source') {
                // A range the source no longer has (an orphan, or one the source moved
                // meanwhile): drop those edits so they don't block every later save.
                this.dropEditsOfOrphanedGroups(batch);
                resolve();
                return;
              }
              // Re-queue the failed batch so nothing is silently lost.
              this.requeue(batch);
              this.showError(err);
              resolve();
            },
          });
      });
    }

    // Wait if there are still active in-flight patch requests.
    while (this.activePatchesCount > 0) {
      await new Promise((r) => setTimeout(r, 50));
    }
    this.saving.set(false);

    if (this.activePatchError || this.pendingRows.size > 0) {
      this.activePatchError = false;
      return false;
    }
    return true;
  }

  /** Reload the columns, re-queue ``batch``'s edits of columns that still exist and
   *  drop (with a warning) those of columns that are gone, undo history included. */
  private dropEditsOfMissingColumns(batch: ContentEntryPatch[]): Promise<void> {
    return new Promise((resolve) => {
      this.contentService
        .listColumns(this.kind, this.slug)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (columns) => {
            this.columns.set(columns);
            const keys = new Set(columns.map((c) => c.key));
            this.columnKeys.update((current) => current.filter((key) => keys.has(key)));
            let dropped = 0;
            for (const patch of batch) {
              const id = `${patch.unit_id}:${patch.column}`;
              if (!keys.has(patch.column)) {
                dropped++;
              } else if (!this.pendingRows.has(id)) {
                this.pendingRows.set(id, patch);
              }
            }
            for (const [id, patch] of this.pendingRows) {
              if (!keys.has(patch.column)) this.pendingRows.delete(id);
            }
            const keep = (edit: CellEdit) => keys.has(edit.column);
            this.undoStack.splice(0, this.undoStack.length, ...this.undoStack.filter(keep));
            this.redoStack.splice(0, this.redoStack.length, ...this.redoStack.filter(keep));
            this.refreshUndoState();
            if (dropped > 0) {
              this.message.warning(
                this.translate.instant('ADMIN.CONTENT_EDITOR.MESSAGES.COLUMN_EDITS_DROPPED', {
                  count: dropped,
                })
              );
            }
            this.activePatchError = false;
            resolve();
          },
          error: (err: HttpErrorResponse) => {
            // Which columns are gone is unknown: keep every edit for the next save.
            this.requeue(batch);
            this.showError(err);
            resolve();
          },
        });
    });
  }

  /** Re-queue a refused batch's edits of rows still shown as normal groups, drop the
   *  rest (orphaned, or no longer loaded) with a warning, and refetch the rows so a
   *  range the source moved meanwhile shows as orphaned. */
  private dropEditsOfOrphanedGroups(batch: ContentEntryPatch[]): void {
    const kept = batch.filter((patch) => {
      const data = this.gridApi?.getRowNode(String(patch.unit_id))?.data;
      return !!data && !data.orphaned;
    });
    this.requeue(kept);
    const dropped = batch.length - kept.length;
    if (dropped > 0) {
      this.message.warning(
        this.translate.instant('ADMIN.CONTENT_EDITOR.MESSAGES.GROUP_EDITS_DROPPED', {
          count: dropped,
        })
      );
    }
    this.activePatchError = false;
    this.gridApi?.refreshInfiniteCache();
  }

  /** Put a failed batch back in the queue, behind any newer edit of the same cell. */
  private requeue(batch: ContentEntryPatch[]): void {
    for (const patch of batch) {
      const key = `${patch.unit_id}:${patch.column}`;
      if (!this.pendingRows.has(key)) {
        this.pendingRows.set(key, patch);
      }
    }
  }

  /** Save the current edits to the draft and return to the detail page, keeping
   *  the draft (no new version is published). */
  saveDraft(): void {
    if (this.draftId() === null) return;
    this.savingDraft.set(true);
    void this.flushPending().then((ok) => {
      this.savingDraft.set(false);
      if (!ok) return;
      this.message.success(this.translate.instant('ADMIN.CONTENT_EDITOR.MESSAGES.DRAFT_SAVED'));
      void this.router.navigate(['/admin', this.listSegment(), this.slug]);
    });
  }

  /** Guard hook: flush pending edits and allow leaving, keeping the draft. */
  keepDraftOnLeave(): Promise<boolean> {
    return this.flushPending();
  }

  /** Re-count the draft's real changes (one-row page: only `count` is needed). */
  private refreshPendingCount(): void {
    const versionId = this.draftId();
    if (versionId === null || this.readOnly()) return;
    // The count on opening can still be in flight when an autosave asks again; a
    // late, older answer (e.g. 0) must not overwrite the newer one.
    const request = ++this.pendingCountRequest;
    const isLatest = () => request === this.pendingCountRequest && this.draftId() === versionId;
    this.contentService
      .pendingChanges(this.kind, this.slug, versionId, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (isLatest()) this.pendingCount.set(res.count);
        },
        // Unknown: leave Commit enabled; the commit dialog reports the real state.
        error: () => {
          if (isLatest()) this.pendingCount.set(null);
        },
      });
  }

  /** Open the commit dialog: flush pending edits, then load the change review. */
  openCommit(): void {
    const versionId = this.draftId();
    if (versionId === null) return;
    this.publishing.set(true);
    void this.flushPending().then((ok) => {
      this.publishing.set(false);
      if (!ok) return;
      this.commitText.set({ ...EMPTY_VERSION_TEXT, ...this.draftLabels });
      this.commitStart.set('');
      this.commitBump.set(this.commitRequiresMajor() ? 'major' : 'minor');
      this.loadCommitLatest();
      this.pendingChanges.set([]);
      this.pendingError.set(false);
      this.commitDialogVisible.set(true);
      this.pendingLoading.set(true);
      this.contentService
        .pendingChanges(this.kind, this.slug, versionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.pendingChanges.set(res.results);
            this.pendingLoading.set(false);
          },
          error: (err: HttpErrorResponse) => {
            this.pendingLoading.set(false);
            this.pendingError.set(true);
            this.showError(err);
          },
        });
    });
  }

  /** Look up the number this commit follows: the language's latest version. */
  private loadCommitLatest(): void {
    const language = this.selectedLanguage();
    this.cancelCommitLatest$.next();
    this.commitLatest.set(null);
    this.commitLatestLoading.set(false);
    this.commitLatestError.set(false);
    if (!language) return;
    this.commitLatestLoading.set(true);
    this.versionsService
      .latestNumber(this.kind, this.slug, language)
      .pipe(takeUntil(this.cancelCommitLatest$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (latest) => {
          this.commitLatest.set(latest);
          this.commitLatestLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.commitLatestError.set(true);
          this.commitLatestLoading.set(false);
          this.showError(err);
        },
      });
  }

  setCommitText(key: keyof VersionText, value: string): void {
    this.commitText.update((text) => ({ ...text, [key]: value }));
  }

  setNewLanguageLabel(key: 'label_en' | 'label_ar', value: string): void {
    this.newLanguageLabels.update((labels) => ({ ...labels, [key]: value }));
  }

  /** Confirm the commit: publish the draft with the (required) message. */
  confirmCommit(): void {
    const versionId = this.draftId();
    if (
      versionId === null ||
      !this.commitHasMessage() ||
      this.pendingLoading() ||
      this.pendingError() ||
      this.commitNumberIncomplete()
    ) {
      return;
    }
    this.committing.set(true);
    this.contentService
      .commit(this.kind, this.slug, versionId, trimVersionText(this.commitText()), {
        // The number is issued by the server: only how to derive it is sent.
        ...(this.commitLatest() === null ? { version_number: this.commitStart().trim() } : {}),
        bump: this.commitBump(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.committing.set(false);
          this.commitDialogVisible.set(false);
          this.dirty.set(false);
          this.pendingRows.clear();
          this.draftId.set(null);
          this.message.success(this.translate.instant('ADMIN.CONTENT_EDITOR.MESSAGES.PUBLISHED'));
          void this.router.navigate(['/admin', this.listSegment(), this.slug]);
        },
        error: (err: HttpErrorResponse) => {
          this.committing.set(false);
          this.handleCommitError(err);
        },
      });
  }

  /** Whether a group row may be deleted: any row on the source; on a translation
   *  only an orphaned one (text for a range its source no longer has). */
  canDeleteGroup(row: ContentEntry): boolean {
    if (!this.isGroup() || this.readOnly()) return false;
    return this.isEditingSource() || !!row.orphaned;
  }

  openAddGroup(): void {
    this.groupError.set(null);
    this.addGroupOpen.set(true);
  }

  closeGroupModal(): void {
    this.addGroupOpen.set(false);
    this.groupError.set(null);
  }

  /** Save pending edits, then add the group; a failure keeps the dialog open. */
  async confirmGroup(result: GroupRangeResult): Promise<void> {
    const versionId = this.draftId();
    if (!this.addGroupOpen() || versionId === null) return;
    this.groupBusy.set(true);
    this.groupError.set(null);
    if (!(await this.flushPending())) {
      this.groupBusy.set(false);
      return;
    }
    await new Promise<void>((resolve) => {
      this.contentService
        .addGroup(this.kind, this.slug, versionId, result.start, result.end, result.cells)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.groupBusy.set(false);
            this.addGroupOpen.set(false);
            this.afterGroupChange();
            resolve();
          },
          error: (err: HttpErrorResponse) => {
            this.groupBusy.set(false);
            this.groupError.set(this.errorText(err));
            resolve();
          },
        });
    });
  }

  /** Confirm, then delete a group's text in every column of the draft. */
  confirmDeleteGroup(row: ContentEntry): void {
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.CONTENT_EDITOR.GROUPS.DELETE_CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.CONTENT_EDITOR.GROUPS.DELETE_CONFIRM_BODY'),
      nzOkText: this.translate.instant('ADMIN.CONTENT_EDITOR.GROUPS.DELETE'),
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.CONTENT_EDITOR.GROUPS.CANCEL'),
      nzDirection: this.rtl() ? 'rtl' : 'ltr',
      nzOnOk: () => this.deleteGroup(row),
    });
  }

  private async deleteGroup(row: ContentEntry): Promise<void> {
    const versionId = this.draftId();
    if (versionId === null || !(await this.flushPending())) return;
    await new Promise<void>((resolve) => {
      this.contentService
        .deleteGroup(this.kind, this.slug, versionId, row.unit_id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.afterGroupChange();
            resolve();
          },
          error: (err: HttpErrorResponse) => {
            this.showError(err);
            resolve();
          },
        });
    });
  }

  /** Grow (1) or shrink (-1) a group's end by one ayah / word, from its range cell. */
  async extendGroupBy(row: ContentEntry, by: 1 | -1): Promise<void> {
    const versionId = this.draftId();
    if (versionId === null) return;
    await this.runGroupChange(
      this.contentService.extendGroup(this.kind, this.slug, versionId, row.unit_id, by)
    );
  }

  /** Save a start / end typed in a group's range cell. */
  async changeGroupRange(
    row: ContentEntry,
    start: QuranPosition,
    end: QuranPosition
  ): Promise<void> {
    const versionId = this.draftId();
    if (versionId === null) return;
    await this.runGroupChange(
      this.contentService.moveGroup(this.kind, this.slug, versionId, row.unit_id, start, end)
    );
  }

  /** "Add next group": a blank group right after the furthest one, which the grid
   *  then scrolls to (it sorts last) with its text cell focused for typing. */
  async appendGroup(): Promise<void> {
    const versionId = this.draftId();
    if (versionId === null) return;
    const ok = await this.runGroupChange(
      this.contentService.appendGroup(this.kind, this.slug, versionId)
    );
    if (ok) this.focusLastRow = true;
  }

  /** Save pending edits, run one group change, then refresh; errors show as a
   *  toast and refresh the rows too (a cell may still show what was typed). */
  private async runGroupChange(request$: Observable<ContentEntry[]>): Promise<boolean> {
    if (this.groupBusy()) return false;
    this.groupBusy.set(true);
    if (!(await this.flushPending())) {
      this.groupBusy.set(false);
      return false;
    }
    return new Promise<boolean>((resolve) => {
      request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.groupBusy.set(false);
          this.afterGroupChange();
          resolve(true);
        },
        error: (err: HttpErrorResponse) => {
          this.groupBusy.set(false);
          this.showError(err);
          this.gridApi?.refreshInfiniteCache();
          resolve(false);
        },
      });
    });
  }

  /** After "add next group": bring the last row into view, then focus its first text cell. */
  private revealAppendedGroup(params: IGetRowsParams, total: number): void {
    if (!this.focusLastRow || total === 0) return;
    const last = total - 1;
    if (last < params.startRow || last >= params.endRow) {
      this.gridApi?.ensureIndexVisible(last, 'bottom');
      return;
    }
    this.focusLastRow = false;
    this.gridApi?.setFocusedCell(last, CELL_PREFIX + this.columnKeys()[0]);
  }

  /** Rows were re-keyed or removed: refetch them, recount the changes, and drop
   *  undo history that still names the old row ids. */
  private afterGroupChange(): void {
    this.savedOnce.set(true);
    this.clearHistory();
    this.gridApi?.refreshInfiniteCache();
    this.refreshPendingCount();
  }

  /** A commit failed. When the server requires a major version (columns were
   *  reordered meanwhile), switch the dialog to major and explain why there. */
  handleCommitError(err: HttpErrorResponse): void {
    if (err?.error?.error_name === 'orphaned_groups') {
      // Each label isolated left-to-right ("2:1 → 2:5" reads backwards in Arabic
      // otherwise); at most ten, and kept on screen until dismissed.
      const groups: string[] = err.error?.extra?.groups ?? [];
      const shown = groups.slice(0, ORPHANS_SHOWN).map((label) => `\u2066${label}\u2069`);
      const list =
        shown.join(this.rtl() ? '، ' : ', ') + (groups.length > ORPHANS_SHOWN ? ' …' : '');
      this.message.error(
        this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.ORPHANED_GROUPS', { groups: list }),
        { nzDuration: 0 }
      );
      return;
    }
    if (err?.error?.error_name === 'major_bump_required') {
      this.commitRequiresMajor.set(true);
      this.commitBump.set('major');
      return;
    }
    this.showError(err);
  }

  /** Confirm, then discard the draft and leave. */
  confirmDiscard(): void {
    if (this.draftId() === null) {
      void this.router.navigate(['/admin', this.listSegment(), this.slug]);
      return;
    }
    const dir = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.CONTENT_EDITOR.LEAVE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.CONTENT_EDITOR.LEAVE.CONFIRM_BODY'),
      nzOkText: this.translate.instant('ADMIN.CONTENT_EDITOR.LEAVE.OK'),
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.CONTENT_EDITOR.LEAVE.CANCEL'),
      nzDirection: dir,
      nzOnOk: () =>
        this.discardAndLeave().then((ok) => {
          if (!ok) {
            return Promise.resolve(false);
          }
          return this.router.navigate(['/admin', this.listSegment(), this.slug]);
        }),
    });
  }

  /** Discard the draft (delete it server-side). Resolves when done. */
  discardAndLeave(): Promise<boolean> {
    const versionId = this.draftId();
    if (versionId === null) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      this.contentService
        .discardDraft(this.kind, this.slug, versionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.draftId.set(null);
            this.dirty.set(false);
            this.pendingRows.clear();
            resolve(true);
          },
          error: (err: HttpErrorResponse) => {
            this.showError(err);
            resolve(false);
          },
        });
    });
  }

  private listSegment(): string {
    return this.kind === 'tafsir' ? 'tafsirs' : 'translations';
  }

  private colHeader(key: string): string {
    return this.translate.instant(`ADMIN.CONTENT_EDITOR.COLUMNS.${key}`);
  }

  /**
   * Column set is driven by the asset's content template (the explicit
   * `template` input when bound, otherwise `derivedTemplate` from the loaded
   * rows — see `effectiveTemplate`):
   *  - every template shows the pinned unit label and the editable text;
   *  - `reference_text` (the Quranic text being annotated) is shown for every
   *    template except `page`, which carries none;
   *  - `surah` / `ayah` number columns where every unit belongs to one ayah
   *    (`ayah`, `word`); `surah`/`page` units don't;
   *  - `source_text` (the source language for the same unit) is shown
   *    read-only whenever a non-source language is being edited.
   * Every filter runs on the server over the whole asset (see
   * `buildDatasource`): text columns get the text filter, `surah` / `ayah` the
   * number filter, and the unit column a dropdown of surah names (column id
   * `unit_surah`, a number filter on the surah) wherever units belong to a surah.
   */
  buildColumnDefs(): ColDef<ContentEntry>[] {
    const template = this.effectiveTemplate();
    const textFilter: ColDef<ContentEntry> = {
      filter: 'agTextColumnFilter',
      filterParams: TEXT_FILTER_PARAMS,
      floatingFilter: true,
    };
    const columns: ColDef<ContentEntry>[] = [
      {
        field: 'label',
        headerName: this.colHeader('UNIT'),
        width: this.isGroup() ? (this.canEditGroups() ? 290 : 170) : 120,
        editable: false,
        // A range label reads start → end only left-to-right, also in Arabic. The
        // source's draft edits it in place: typed start / end and grow / shrink.
        ...(this.isGroup()
          ? {
              cellStyle: {
                direction: 'ltr',
                unicodeBidi: 'isolate',
                textAlign: this.rtl() ? 'right' : 'left',
              },
              cellRenderer: GroupRangeCellComponent,
              cellRendererParams: {
                words: this.effectiveTemplate() === 'word_group',
                editable: () => this.canEditGroups(),
                orphanLabel: this.translate.instant('ADMIN.CONTENT_EDITOR.GROUPS.ORPHANED'),
                onRangeChange: (entry: ContentEntry, start: QuranPosition, end: QuranPosition) =>
                  void this.changeGroupRange(entry, start, end),
                onExtend: (entry: ContentEntry, by: 1 | -1) => void this.extendGroupBy(entry, by),
                onInvalid: () =>
                  this.message.error(
                    this.translate.instant('ADMIN.CONTENT_EDITOR.GROUPS.POSITION_INVALID')
                  ),
              } satisfies Partial<GroupRangeCellParams>,
              // Keys typed in the range boxes belong to them, not to grid navigation.
              suppressKeyboardEvent: (params: SuppressKeyboardEventParams<ContentEntry>) =>
                (params.event.target as HTMLElement | null)?.tagName === 'INPUT',
            }
          : {}),
        // A translation's text for a range its source dropped: marked, with the reason.
        valueFormatter: ({ data, value }) =>
          data?.orphaned
            ? `${value} · ${this.translate.instant('ADMIN.CONTENT_EDITOR.GROUPS.ORPHANED')}`
            : (value ?? ''),
        tooltipValueGetter: ({ data }) =>
          data?.orphaned
            ? this.translate.instant('ADMIN.CONTENT_EDITOR.GROUPS.ORPHANED_HINT')
            : undefined,
        pinned: this.rtl() ? 'right' : 'left',
        ...(template !== 'page'
          ? {
              // Filters the surah, not the label text: the backend reads the
              // `unit_surah` filter-model key as a surah-number filter.
              colId: 'unit_surah',
              filter: 'agNumberColumnFilter',
              filterParams: NUMBER_FILTER_PARAMS,
              floatingFilter: true,
              floatingFilterComponent: SurahFloatingFilterComponent,
              // The dropdown is the whole filter UI for this column.
              suppressHeaderFilterButton: true,
              suppressFloatingFilterButton: true,
            }
          : {}),
      },
    ];

    if (template === 'ayah' || template === 'word') {
      columns.push(
        {
          field: 'surah',
          headerName: this.colHeader('SURAH_NUMBER'),
          width: 160,
          editable: false,
          // Shows "2. Al-Baqara"; the filter still matches the surah number (it
          // reads the raw value, not the formatted text).
          valueFormatter: ({ value }) =>
            value == null ? '' : surahLabel(value, this.translate.currentLang === 'ar'),
          filter: 'agNumberColumnFilter',
          filterParams: NUMBER_FILTER_PARAMS,
          floatingFilter: true,
        },
        {
          field: 'ayah',
          headerName: this.colHeader('AYAH_NUMBER'),
          width: 100,
          editable: false,
          filter: 'agNumberColumnFilter',
          filterParams: NUMBER_FILTER_PARAMS,
          floatingFilter: true,
        }
      );
    }

    if (template !== 'page') {
      columns.push({
        field: 'reference_text',
        // Surah assets annotate a whole surah: its "reference" is the surah's name.
        headerName: this.colHeader(template === 'surah' ? 'SURAH_NAME' : 'REFERENCE'),
        flex: 1,
        editable: false,
        cellStyle: { direction: 'rtl', fontFamily: 'serif' },
        ...textFilter,
      });
    }

    // One editable column per text column. When translating with "show source" on,
    // each source column sits read-only right before its translation.
    const showSource = !this.isEditingSource() && this.showSource();
    for (const key of this.columnKeys()) {
      const title = this.columnTitle(key);
      if (showSource) {
        columns.push({
          colId: SOURCE_PREFIX + key,
          headerName: `${this.colHeader('SOURCE')} · ${title}`,
          headerTooltip: key,
          valueGetter: ({ data }) => data?.source_cells?.[key] ?? '',
          flex: 2,
          // "Editable" only so a cell opens the text popup in read-only mode:
          // rows are one line tall, and this is the only way to read it all.
          editable: true,
          cellEditor: ContentTextCellEditorComponent,
          cellEditorPopup: true,
          cellEditorParams: { readOnly: true } satisfies ContentTextEditorParams,
          // Being "editable", AG Grid would clear it on Delete/Backspace without the popup.
          suppressKeyboardEvent: suppressClearKeys,
          cellStyle: { direction: this.sourceTextDirection() },
          ...textFilter,
        });
      }
      columns.push({
        colId: CELL_PREFIX + key,
        headerName: title,
        headerTooltip: key,
        headerComponent: ContentColumnHeaderComponent,
        headerComponentParams: {
          columnKey: key,
          canManage: this.canManageColumns() && !this.readOnly(),
          openManage: (columnKey: string) => this.openManageColumns(columnKey),
        },
        valueGetter: ({ data }) =>
          data?.cells?.[key] ?? (key === this.columnKeys()[0] ? (data?.text ?? '') : ''),
        valueSetter: ({ data, newValue }) => {
          data.cells = { ...(data.cells ?? {}), [key]: (newValue as string | null) ?? '' };
          if (key === this.columnKeys()[0]) data.text = data.cells[key];
          return true;
        },
        flex: 2,
        editable: true,
        cellEditor: ContentTextCellEditorComponent,
        cellEditorPopup: true,
        // Read-only mode still opens the popup, to read long text in full.
        cellEditorParams: {
          sourceTitle: this.sourceColHeader(),
          readOnly: this.readOnly(),
          columnKey: key,
        } satisfies ContentTextEditorParams,
        // An orphaned group's text opens read-only too: it can only be read (and moved by
        // hand), and Delete / Backspace can't clear it.
        ...(this.isGroup()
          ? {
              suppressKeyboardEvent: (params: SuppressKeyboardEventParams<ContentEntry>) =>
                !!params.data?.orphaned && suppressClearKeys(params),
              cellEditorSelector: ({ data }: { data?: ContentEntry }) => ({
                component: ContentTextCellEditorComponent,
                params: {
                  sourceTitle: this.sourceColHeader(),
                  readOnly: this.readOnly() || !!data?.orphaned,
                  columnKey: key,
                } satisfies ContentTextEditorParams,
              }),
            }
          : {}),
        // Yellow when the draft differs from the published version.
        cellClassRules: { 'content-grid__cell--changed': (p) => cellChanged(p.data, key) },
        ...textFilter,
      });
    }

    if (this.isGroup() && !this.readOnly()) {
      columns.push({
        colId: 'group_actions',
        headerName: this.translate.instant('ADMIN.CONTENT_EDITOR.GROUPS.ACTIONS'),
        width: 90,
        pinned: this.rtl() ? 'left' : 'right',
        editable: false,
        cellRenderer: GroupActionsCellComponent,
        cellRendererParams: {
          canDelete: (entry: ContentEntry) => this.canDeleteGroup(entry),
          onDelete: (entry: ContentEntry) => this.confirmDeleteGroup(entry),
        } satisfies Partial<GroupActionsCellParams>,
      });
    }

    return columns;
  }

  /** A text column's header: its label in the interface language, else its key. The
   *  single default `text` column keeps the editor's own "Text" heading. */
  private columnTitle(key: string): string {
    const column = this.columns().find((c) => c.key === key);
    if (column && (column.label_en || column.label_ar)) {
      return columnLabel(column, this.translate.currentLang);
    }
    return key === 'text' && this.columnKeys().length === 1 ? this.colHeader('TEXT') : key;
  }

  /** Header for the read-only source-reference column (shows the source language). */
  private sourceColHeader(): string {
    const source = this.languages().find((l) => l.is_source);
    const label = source ? this.langName(source.language) : this.colHeader('SOURCE');
    return `${this.colHeader('SOURCE')} · ${label}`;
  }

  /** Text direction for the source-reference column based on the source language. */
  private sourceTextDirection(): 'rtl' | 'ltr' {
    const code =
      this.languages()
        .find((l) => l.is_source)
        ?.language?.toLowerCase() ?? 'ar';
    return RTL_LANGUAGE_CODES.has(code) ? 'rtl' : 'ltr';
  }

  private showError(err: HttpErrorResponse): void {
    const name: string | undefined = err?.error?.error_name;

    // "Nothing changed" isn't really a failure — show it as a friendly popup
    // rather than a red error toast.
    if (name === 'no_changes_to_publish') {
      this.modal.info({
        nzTitle: this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.NO_CHANGES_TO_PUBLISH_TITLE'),
        nzContent: this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.NO_CHANGES_TO_PUBLISH'),
        nzOkText: this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.OK'),
        nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      });
      return;
    }

    this.message.error(this.errorText(err));
  }

  /** An API error's message in the UI language (the generic one for unknown names). */
  private errorText(err: HttpErrorResponse): string {
    const name: string | undefined = err?.error?.error_name;
    const key = name ? `ADMIN.CONTENT_EDITOR.ERRORS.${name.toUpperCase()}` : '';
    const translated = key ? this.translate.instant(key) : '';
    return translated && translated !== key
      ? translated
      : this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.GENERIC');
  }
}
