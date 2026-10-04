import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  Input,
  OnInit,
  computed,
  inject,
  input,
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
  GridApi,
  IDatasource,
  IGetRowsParams,
  INumberFilterParams,
  ITextFilterParams,
  LocaleText,
  RowSelectionOptions,
} from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subject, debounceTime } from 'rxjs';
import type {
  AssetLanguage,
  AssetTemplate,
  AssetVersionParentKind,
  ContentChange,
  ContentDraftVersion,
  ContentEntry,
  ContentEntryPatch,
} from '../../models/asset-content.models';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetContentService } from '../../services/asset-content.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import {
  normalizeClipboardForTextPaste,
  parseClipboardTable,
  serializeCsv,
} from '../../utils/clipboard-table.util';
import { ISO_639_LANGUAGES, localizedLanguageName } from '../../utils/iso-639.util';
import { ContentChangesComponent } from '../content-changes/content-changes.component';
import {
  ContentTextCellEditorComponent,
  type ContentTextEditorParams,
} from './content-text-cell-editor.component';
import { surahLabel } from '../../models/quran-metadata';
import { SurahFloatingFilterComponent } from './surah-floating-filter.component';

ModuleRegistry.registerModules([AllCommunityModule]);

/** Columns the positional paste is allowed to write into. */
const EDITABLE_FIELDS = new Set<string>(['text']);

/** Language codes that should render with RTL direction in the source column. */
const RTL_LANGUAGE_CODES = new Set(['ar', 'fa', 'ur', 'ps', 'ku', 'he', 'yi', 'sd', 'ug']);

const AUTOSAVE_DEBOUNCE_MS = 800;
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
    NzToolTipModule,
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

  /** Unit ids with unsaved edits pending the next autosave flush. */
  private readonly pendingRows = new Map<number, ContentEntryPatch>();

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
  readonly commitMessage = signal('');
  readonly committing = signal(false);
  readonly pendingLoading = signal(false);
  readonly pendingError = signal(false);
  readonly pendingChanges = signal<ContentChange[]>([]);
  private activePatchesCount = 0;
  private activePatchError = false;
  readonly selectedCount = signal(0);
  readonly entriesTotal = signal(0);
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
    headerCheckbox: true,
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
    this.loadLanguages();
  }

  /** True while there are edits not yet persisted to the draft. */
  hasUnsavedWork(): boolean {
    if (this.readOnly()) return false;
    return this.dirty() || this.pendingRows.size > 0 || this.saving();
  }

  onGridReady(event: GridReadyEvent<ContentEntry>): void {
    this.gridApi = event.api;
  }

  onCellValueChanged(event: CellValueChangedEvent<ContentEntry>): void {
    const row = event.data;
    // Assume the edit differs from the published text until the autosave
    // response says otherwise (see `applySavedRows`).
    row.changed = true;
    // `force`: the grid has already drawn the new value, so a plain refresh skips it.
    if (event.node) {
      this.gridApi?.refreshCells({ rowNodes: [event.node], columns: ['text'], force: true });
    }
    this.pendingRows.set(row.unit_id, {
      unit_id: row.unit_id,
      text: row.text ?? '',
    });
    this.dirty.set(true);
    this.autosave$.next();
    if (event.source !== HISTORY_SOURCE) {
      this.undoStack.push({
        unitId: row.unit_id,
        oldValue: (event.oldValue as string | null) ?? '',
        newValue: row.text ?? '',
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
      node.setDataValue('text', edit[value], HISTORY_SOURCE); // -> onCellValueChanged
    } else {
      this.pendingRows.set(edit.unitId, { unit_id: edit.unitId, text: edit[value] });
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
              },
              error: (err: HttpErrorResponse) => {
                done();
                params.failCallback();
                this.showError(err);
              },
            });
        });
      },
    };
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

    const startField = focused.column.getColDef().field;
    if (!startField || !EDITABLE_FIELDS.has(startField)) {
      this.message.info(this.translate.instant('ADMIN.CONTENT_EDITOR.PASTE.SELECT_EDITABLE'));
      return;
    }

    const text = event.clipboardData?.getData('text/plain') ?? '';
    const parsed = parseClipboardTable(text);
    if (parsed.length === 0) return;
    // Exported CSV includes surah/ayah columns; strip those so paste into Text
    // only writes the text values (avoids autosaving identifiers as ayah text).
    const table = normalizeClipboardForTextPaste(parsed);
    if (table.length === 0) return;
    event.preventDefault();

    const displayedCols = api.getAllDisplayedColumns();
    const startColIdx = displayedCols.findIndex((c) => c.getColId() === focused.column.getColId());
    if (startColIdx < 0) return;

    let changed = 0;
    table.forEach((values, r) => {
      const node = api.getDisplayedRowAtIndex(focused.rowIndex + r);
      // Rows past the loaded blocks have no data yet; paste stops there.
      if (!node?.data) return;
      values.forEach((value, c) => {
        const col = displayedCols[startColIdx + c];
        const field = col?.getColDef().field;
        if (!field || !EDITABLE_FIELDS.has(field)) return; // skip read-only columns
        node.setDataValue(field, value); // fires onCellValueChanged -> autosave
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
  copySelectedToCsv(): void {
    const api = this.gridApi;
    if (!api) return;
    const selected = api.getSelectedRows() as ContentEntry[];
    if (selected.length === 0) {
      this.message.info(this.translate.instant('ADMIN.CONTENT_EDITOR.COPY.NONE_SELECTED'));
      return;
    }
    selected.sort((a, b) => a.order - b.order || a.unit_id - b.unit_id);
    const table: string[][] = [
      ['label', 'reference_text', 'text'],
      ...selected.map((r) => [r.label, r.reference_text, r.text ?? '']),
    ];
    const csv = serializeCsv(table);
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
   *  then open its draft. */
  private loadLanguages(): void {
    this.loading.set(true);
    this.contentService
      .listLanguages(this.kind, this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (langs) => {
          this.languages.set(langs);
          const viewId = this.viewVersionId();
          if (viewId !== null) {
            this.loadViewedVersion(viewId);
            return;
          }
          const source = langs.find((l) => l.is_source) ?? langs[0];
          const remembered = this.lastLanguage.get(this.kind, this.slug);
          const initial = langs.find((l) => l.language === remembered) ?? source;
          this.selectedLanguage.set(initial?.language ?? null);
          this.loadForLanguage();
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
          this.selectedLanguage.set(version.language);
          this.draftId.set(version.id);
          this.loadTemplate(generation);
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
          this.draftId.set(draft.id);
          this.refreshPendingCount();
          this.loadTemplate(generation);
        },
        error: (err: HttpErrorResponse) => {
          if (generation !== this.loadGeneration) return;
          this.loading.set(false);
          this.showError(err);
        },
      });
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
    if (!language) return;
    this.addLanguageBusy.set(true);
    this.contentService
      .addLanguage(this.kind, this.slug, language, this.newLanguageFile)
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
    for (const row of saved) {
      if (this.pendingRows.has(row.unit_id)) continue;
      const node = api.getRowNode(String(row.unit_id));
      if (!node?.data) continue;
      node.data.changed = row.changed ?? false;
      nodes.push(node);
    }
    if (nodes.length > 0) api.refreshCells({ rowNodes: nodes, columns: ['text'], force: true });
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
              // Re-queue the failed batch so nothing is silently lost.
              for (const patch of batch) {
                if (!this.pendingRows.has(patch.unit_id)) {
                  this.pendingRows.set(patch.unit_id, patch);
                }
              }
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
    this.contentService
      .pendingChanges(this.kind, this.slug, versionId, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (this.draftId() === versionId) this.pendingCount.set(res.count);
        },
        // Unknown: leave Commit enabled; the commit dialog reports the real state.
        error: () => this.pendingCount.set(null),
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
      this.commitMessage.set('');
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

  /** Confirm the commit: publish the draft with the (required) message. */
  confirmCommit(): void {
    const versionId = this.draftId();
    if (
      versionId === null ||
      !this.commitMessage().trim() ||
      this.pendingLoading() ||
      this.pendingError()
    ) {
      return;
    }
    this.committing.set(true);
    this.contentService
      .commit(this.kind, this.slug, versionId, this.commitMessage().trim())
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
          this.showError(err);
        },
      });
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
   *  - `sura` / `aya` number columns where every unit belongs to one ayah
   *    (`ayah`, `word`); `surah`/`page` units don't;
   *  - `source_text` (the source language for the same unit) is shown
   *    read-only whenever a non-source language is being edited.
   * Every filter runs on the server over the whole asset (see
   * `buildDatasource`): text columns get the text filter, `sura` / `aya` the
   * number filter, and the unit column a dropdown of surah names (column id
   * `surah`, a number filter on the surah) wherever units belong to a surah.
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
        width: 120,
        editable: false,
        pinned: this.rtl() ? 'right' : 'left',
        ...(template !== 'page'
          ? {
              // Filters the surah, not the label text: the backend reads the
              // `surah` filter-model key as a surah-number filter.
              colId: 'surah',
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
          field: 'sura',
          headerName: this.colHeader('SURA'),
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
          field: 'aya',
          headerName: this.colHeader('AYA'),
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

    // When editing a translation, show the source language read-only alongside.
    if (!this.isEditingSource()) {
      columns.push({
        field: 'source_text',
        headerName: this.sourceColHeader(),
        flex: 2,
        // "Editable" only so a cell opens the text popup in read-only mode:
        // rows are one line tall, and this is the only way to read it all.
        editable: true,
        cellEditor: ContentTextCellEditorComponent,
        cellEditorPopup: true,
        cellEditorParams: { readOnly: true } satisfies ContentTextEditorParams,
        cellStyle: { direction: this.sourceTextDirection() },
        ...textFilter,
      });
    }

    columns.push({
      field: 'text',
      headerName: this.colHeader('TEXT'),
      flex: 2,
      editable: true,
      cellEditor: ContentTextCellEditorComponent,
      cellEditorPopup: true,
      // Read-only mode still opens the popup, to read long text in full.
      cellEditorParams: {
        sourceTitle: this.sourceColHeader(),
        readOnly: this.readOnly(),
      } satisfies ContentTextEditorParams,
      // Yellow when the draft differs from the published version.
      cellClassRules: { 'content-grid__cell--changed': (p) => !!p.data?.changed },
      ...textFilter,
    });

    return columns;
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

    const key = name ? `ADMIN.CONTENT_EDITOR.ERRORS.${name.toUpperCase()}` : '';
    const translated = key ? this.translate.instant(key) : '';
    this.message.error(
      translated && translated !== key
        ? translated
        : this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.GENERIC')
    );
  }
}
