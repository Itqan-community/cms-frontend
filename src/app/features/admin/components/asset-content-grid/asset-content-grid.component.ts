import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type {
  CellValueChangedEvent,
  ColDef,
  GridReadyEvent,
  GridApi,
  RowSelectionOptions,
} from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subject, debounceTime } from 'rxjs';
import type {
  AssetVersionParentKind,
  ContentEntry,
  ContentEntryPatch,
} from '../../models/asset-content.models';
import { AssetContentService } from '../../services/asset-content.service';
import { parseClipboardTable, serializeCsv } from '../../utils/clipboard-table.util';
import { SurahFloatingFilterComponent, type SurahOption } from './surah-floating-filter.component';

ModuleRegistry.registerModules([AllCommunityModule]);

/** Columns the positional paste is allowed to write into. */
const EDITABLE_FIELDS = new Set<string>(['text']);

const ENTRIES_PAGE_SIZE = 500;
const AUTOSAVE_DEBOUNCE_MS = 800;

@Component({
  selector: 'app-asset-content-grid',
  standalone: true,
  imports: [
    AgGridAngular,
    TranslateModule,
    NgIcon,
    NzButtonModule,
    NzModalModule,
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

  private readonly contentService = inject(AssetContentService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private gridApi?: GridApi<ContentEntry>;
  private readonly autosave$ = new Subject<void>();

  /** Ayah ids with unsaved edits pending the next autosave flush. */
  private readonly pendingRows = new Map<number, ContentEntryPatch>();

  readonly draftId = signal<number | null>(null);
  readonly rows = signal<ContentEntry[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly publishing = signal(false);
  readonly savingDraft = signal(false);
  readonly dirty = signal(false);
  readonly selectedCount = signal(0);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  /** Distinct surahs present in the data, for the Surah dropdown filter. */
  readonly surahOptions = signal<SurahOption[]>([]);

  readonly rtl = computed(() => this.translate.currentLang === 'ar');

  readonly theme = themeQuartz;

  /** Checkbox multi-row selection (Community feature). */
  readonly rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    checkboxes: true,
    headerCheckbox: true,
  };

  readonly defaultColDef: ColDef<ContentEntry> = {
    resizable: true,
    sortable: true,
    filter: false,
  };

  readonly columnDefs: ColDef<ContentEntry>[] = this.buildColumnDefs();

  ngOnInit(): void {
    this.autosave$
      .pipe(debounceTime(AUTOSAVE_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.flushPending());
    this.initDraft();
  }

  /** True while there are edits not yet persisted to the draft. */
  hasUnsavedWork(): boolean {
    return this.dirty() || this.pendingRows.size > 0 || this.saving();
  }

  onGridReady(event: GridReadyEvent<ContentEntry>): void {
    this.gridApi = event.api;
  }

  onCellValueChanged(event: CellValueChangedEvent<ContentEntry>): void {
    const row = event.data;
    this.pendingRows.set(row.ayah_id, {
      ayah_id: row.ayah_id,
      text: row.text ?? '',
    });
    this.dirty.set(true);
    this.autosave$.next();
    this.refreshUndoState();
  }

  /** Undo the last cell edit (autosaves the reverted value). */
  undo(): void {
    this.gridApi?.undoCellEditing();
    this.refreshUndoState();
  }

  /** Redo the last undone cell edit. */
  redo(): void {
    this.gridApi?.redoCellEditing();
    this.refreshUndoState();
  }

  private refreshUndoState(): void {
    this.canUndo.set((this.gridApi?.getCurrentUndoSize() ?? 0) > 0);
    this.canRedo.set((this.gridApi?.getCurrentRedoSize() ?? 0) > 0);
  }

  /** Build the distinct surah list (ordered by sura number) for the dropdown. */
  private buildSurahOptions(rows: ContentEntry[]): void {
    const suraByName = new Map<string, number>();
    for (const row of rows) {
      if (row.surah_name && !suraByName.has(row.surah_name)) {
        suraByName.set(row.surah_name, row.sura);
      }
    }
    const options: SurahOption[] = [...suraByName.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([name, sura]) => ({ value: name, label: `${sura}. ${name}` }));
    this.surahOptions.set(options);
  }

  /**
   * Positional paste: with a cell focused (and not being edited), Ctrl+V fills
   * clipboard rows downward and columns rightward from the focused cell, writing
   * only into editable columns. Accepts TSV (spreadsheets) or CSV (files).
   */
  onPaste(event: ClipboardEvent): void {
    const api = this.gridApi;
    if (!api) return;
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
    const table = parseClipboardTable(text);
    if (table.length === 0) return;
    event.preventDefault();

    const displayedCols = api.getAllDisplayedColumns();
    const startColIdx = displayedCols.findIndex((c) => c.getColId() === focused.column.getColId());
    if (startColIdx < 0) return;

    let changed = 0;
    table.forEach((values, r) => {
      const node = api.getDisplayedRowAtIndex(focused.rowIndex + r);
      if (!node) return;
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
   * Copy the selected rows to the clipboard as CSV (`sura,aya,text` with a
   * header) — the same shape as the per-version download, so it can be saved
   * to a .csv file or pasted back in.
   */
  copySelectedToCsv(): void {
    const api = this.gridApi;
    if (!api) return;
    const selected = api.getSelectedRows() as ContentEntry[];
    if (selected.length === 0) {
      this.message.info(this.translate.instant('ADMIN.CONTENT_EDITOR.COPY.NONE_SELECTED'));
      return;
    }
    selected.sort((a, b) => a.order - b.order || a.ayah_id - b.ayah_id);
    const table: string[][] = [
      ['sura', 'aya', 'text'],
      ...selected.map((r) => [String(r.sura), String(r.aya), r.text ?? '']),
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

  private initDraft(): void {
    this.loading.set(true);
    this.contentService
      .createDraft(this.kind, this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (draft) => {
          this.draftId.set(draft.id);
          this.loadAllEntries(1);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.showError(err);
        },
      });
  }

  private loadAllEntries(page: number, acc: ContentEntry[] = []): void {
    const versionId = this.draftId();
    if (versionId === null) return;
    this.contentService
      .getEntries(this.kind, this.slug, versionId, page, ENTRIES_PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const merged = acc.concat(response.results);
          if (merged.length < response.count && response.results.length > 0) {
            this.loadAllEntries(page + 1, merged);
          } else {
            this.rows.set(merged);
            this.buildSurahOptions(merged);
            this.loading.set(false);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.showError(err);
        },
      });
  }

  /** Persist any pending edits to the draft. `true` on success/nothing to save. */
  private flushPending(): Promise<boolean> {
    const versionId = this.draftId();
    if (versionId === null || this.pendingRows.size === 0) {
      return Promise.resolve(true);
    }
    const batch = Array.from(this.pendingRows.values());
    this.pendingRows.clear();
    this.saving.set(true);
    return new Promise<boolean>((resolve) => {
      this.contentService
        .patchEntries(this.kind, this.slug, versionId, batch)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            if (this.pendingRows.size === 0) {
              this.dirty.set(false);
            }
            resolve(true);
          },
          error: (err: HttpErrorResponse) => {
            // Re-queue the failed batch so nothing is silently lost.
            for (const patch of batch) {
              if (!this.pendingRows.has(patch.ayah_id)) {
                this.pendingRows.set(patch.ayah_id, patch);
              }
            }
            this.saving.set(false);
            this.showError(err);
            resolve(false);
          },
        });
    });
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

  /** Save = publish the draft as a new version. Flushes pending edits first. */
  publish(): void {
    const versionId = this.draftId();
    if (versionId === null) return;
    this.publishing.set(true);
    void this.flushPending().then((ok) => {
      if (!ok) {
        this.publishing.set(false);
        return;
      }
      this.contentService
        .publish(this.kind, this.slug, versionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.publishing.set(false);
            this.dirty.set(false);
            this.pendingRows.clear();
            this.draftId.set(null);
            this.message.success(this.translate.instant('ADMIN.CONTENT_EDITOR.MESSAGES.PUBLISHED'));
            void this.router.navigate(['/admin', this.listSegment(), this.slug]);
          },
          error: (err: HttpErrorResponse) => {
            this.publishing.set(false);
            this.showError(err);
          },
        });
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

  private buildColumnDefs(): ColDef<ContentEntry>[] {
    return [
      {
        field: 'sura',
        headerName: this.colHeader('SURA'),
        width: 110,
        editable: false,
        filter: 'agNumberColumnFilter',
        floatingFilter: true,
      },
      {
        field: 'aya',
        headerName: this.colHeader('AYA'),
        width: 110,
        editable: false,
        filter: 'agNumberColumnFilter',
        floatingFilter: true,
      },
      {
        field: 'surah_name',
        headerName: this.colHeader('SURAH'),
        width: 170,
        editable: false,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        floatingFilterComponent: SurahFloatingFilterComponent,
        floatingFilterComponentParams: {
          optionsProvider: () => this.surahOptions(),
        },
      },
      {
        field: 'uthmani',
        headerName: this.colHeader('UTHMANI'),
        flex: 1,
        editable: false,
        cellStyle: { direction: 'rtl', fontFamily: 'serif' },
        wrapText: true,
        autoHeight: true,
      },
      {
        field: 'text',
        headerName: this.colHeader('TEXT'),
        flex: 2,
        editable: true,
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        // agLargeTextCellEditor defaults to maxLength 200; ayah text is far longer,
        // so raise the cap and enlarge the popup textarea.
        cellEditorParams: { maxLength: 100000, rows: 12, cols: 60 },
        wrapText: true,
        autoHeight: true,
      },
    ];
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
