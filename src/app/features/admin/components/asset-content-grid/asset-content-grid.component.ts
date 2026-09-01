import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subject, debounceTime, firstValueFrom, take } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type {
  AssetVersionParentKind,
  ContentEntry,
  ContentEntryPatch,
} from '../../models/asset-content.models';
import type { ContentTemplate, MushafPrint } from '../../models/content-template.models';
import type { ContentDiffEntryOut } from '../../models/content-review.models';
import { AssetContentService } from '../../services/asset-content.service';
import { AssetVersionsService } from '../../services/asset-versions.service';
import { ContentReviewService } from '../../services/content-review.service';
import { QuranDataService } from '../../services/quran-data.service';
import { parseClipboardTable, serializeCsv } from '../../utils/clipboard-table.util';
import { computeContentDiff, type ContentDiffRow } from '../../utils/content-diff.util';
import {
  DEFAULT_CONTENT_TEMPLATE,
  buildContentColumnDefs,
  getContentTemplateDescriptor,
} from '../../utils/content-template.util';
import { chunkPatches, validateAndMapCsvImport } from '../../utils/csv-import.util';
import {
  buildEmptyTemplateRows,
  emptyTemplateFilename,
  emptyTemplateToCsv,
  triggerCsvDownload,
} from '../../utils/empty-template-csv.util';
import { SURAHS_METADATA } from '../../models/quran-metadata';
import { FormsModule } from '@angular/forms';
import { type SurahOption } from './surah-floating-filter.component';

ModuleRegistry.registerModules([AllCommunityModule]);

const ENTRIES_PAGE_SIZE = 500;
const AUTOSAVE_DEBOUNCE_MS = 800;
const CSV_UPLOAD_CHUNK_SIZE = 500;

@Component({
  selector: 'app-asset-content-grid',
  standalone: true,
  imports: [
    AgGridAngular,
    FormsModule,
    TranslateModule,
    NgIcon,
    NzButtonModule,
    NzModalModule,
    NzProgressModule,
    NzSelectModule,
    NzSpinModule,
    NzSwitchModule,
    NzToolTipModule,
  ],
  templateUrl: './asset-content-grid.component.html',
  styleUrl: './asset-content-grid.component.less',
})
export class AssetContentGridComponent implements OnInit, OnChanges {
  @Input({ required: true }) kind!: AssetVersionParentKind;
  @Input({ required: true }) slug!: string;
  @Input() template: ContentTemplate = DEFAULT_CONTENT_TEMPLATE;
  @Input() mushafPrint: MushafPrint | null = null;
  @Input() langSlug: string | null = null;
  @Input() readOnly = false;
  @Input() reviewMode = false;
  @Input() referenceLangSlug: string | null = null;

  private readonly contentService = inject(AssetContentService);
  private readonly versionsService = inject(AssetVersionsService);
  private readonly reviewService = inject(ContentReviewService);
  private readonly quranData = inject(QuranDataService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private gridApi?: GridApi<ContentEntry>;
  private readonly autosave$ = new Subject<void>();
  private readonly pendingRows = new Map<number, ContentEntryPatch>();
  private referenceTextByAyahId = new Map<number, string>();

  readonly draftId = signal<number | null>(null);
  readonly rows = signal<ContentEntry[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly publishing = signal(false);
  readonly savingDraft = signal(false);
  readonly submittingReview = signal(false);
  readonly dirty = signal(false);
  readonly selectedCount = signal(0);
  readonly entriesTotal = signal(0);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly surahOptions = signal<SurahOption[]>([]);
  readonly showDiffOnly = signal(false);
  readonly diffLoading = signal(false);
  readonly downloadingTemplate = signal(false);
  readonly diffRows = signal<ContentDiffRow[]>([]);
  readonly reviewDiffRows = signal<ContentDiffEntryOut[]>([]);
  readonly csvUploadProgress = signal<number | null>(null);
  readonly selectedSurah = signal<number | null>(null);
  readonly referenceLangOptions = signal<{ slug: string; label: string }[]>([]);

  readonly rtl = computed(() => this.translate.currentLang === 'ar');
  readonly theme = themeQuartz;
  readonly contentDiffViewEnabled = environment.contentDiffView;
  readonly reviewWorkflowEnabled = environment.contentReviewWorkflow;
  readonly isWordTemplate = computed(() => this.template === 'word');

  readonly displayRows = computed(() => {
    const all = this.rows();
    // Keep full table visible while the client diff is still loading.
    if (!this.showDiffOnly() || this.diffLoading()) return all;
    const diffKeys = new Set(this.diffRows().map((d) => d.key));
    return all.filter((r) => diffKeys.has(`${r.sura}:${r.aya}`));
  });

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

  columnDefs: ColDef<ContentEntry>[] = [];

  ngOnInit(): void {
    this.autosave$
      .pipe(debounceTime(AUTOSAVE_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.flushPending());
    if (this.template === 'word') {
      this.surahOptions.set(
        SURAHS_METADATA.map((s) => ({
          value: s.name_ar,
          label: `${s.id}. ${s.name_ar}`,
        }))
      );
      if (!this.selectedSurah()) this.selectedSurah.set(1);
    }
    this.rebuildColumns();
    this.initDraft();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['template'] ||
      changes['readOnly'] ||
      changes['reviewMode'] ||
      changes['referenceLangSlug']
    ) {
      this.rebuildColumns();
      if (this.gridApi) {
        this.gridApi.setGridOption('columnDefs', this.columnDefs);
      }
    }
    if (changes['referenceLangSlug'] && this.referenceLangSlug) {
      void this.loadReferenceColumn();
    }
    if (changes['template'] && this.template === 'word' && !this.selectedSurah()) {
      this.selectedSurah.set(1);
      if (this.draftId()) this.reloadEntries();
    }
  }

  hasUnsavedWork(): boolean {
    return !this.readOnly && (this.dirty() || this.pendingRows.size > 0 || this.saving());
  }

  setReferenceLangOptions(options: { slug: string; label: string }[]): void {
    this.referenceLangOptions.set(options);
  }

  onGridReady(event: GridReadyEvent<ContentEntry>): void {
    this.gridApi = event.api;
  }

  onCellValueChanged(event: CellValueChangedEvent<ContentEntry>): void {
    if (this.readOnly) return;
    if (this.showDiffOnly()) {
      this.showDiffOnly.set(false);
      this.diffRows.set([]);
    }
    const row = event.data;
    this.pendingRows.set(row.ayah_id, {
      ayah_id: row.ayah_id,
      text: row.text ?? '',
      footnotes: row.footnotes ?? '',
    });
    this.dirty.set(true);
    this.autosave$.next();
    this.refreshUndoState();
  }

  undo(): void {
    if (this.readOnly) return;
    this.gridApi?.undoCellEditing();
    this.refreshUndoState();
  }

  redo(): void {
    if (this.readOnly) return;
    this.gridApi?.redoCellEditing();
    this.refreshUndoState();
  }

  private refreshUndoState(): void {
    this.canUndo.set((this.gridApi?.getCurrentUndoSize() ?? 0) > 0);
    this.canRedo.set((this.gridApi?.getCurrentRedoSize() ?? 0) > 0);
  }

  onSurahScopeChange(sura: number): void {
    if (!this.isWordTemplate()) return;
    if (this.hasUnsavedWork()) {
      this.modal.confirm({
        nzTitle: this.translate.instant('ADMIN.CONTENT_EDITOR.SURAH_SCOPE.LEAVE_TITLE'),
        nzContent: this.translate.instant('ADMIN.CONTENT_EDITOR.SURAH_SCOPE.LEAVE_BODY'),
        nzOnOk: () => this.applySurahScope(sura),
      });
      return;
    }
    this.applySurahScope(sura);
  }

  toggleDiffOnly(checked: boolean): void {
    if (!checked) {
      this.showDiffOnly.set(false);
      this.diffLoading.set(false);
      this.diffRows.set([]);
      return;
    }
    this.showDiffOnly.set(true);
    void this.refreshDiff();
  }

  async downloadEmptyTemplate(): Promise<void> {
    if (this.downloadingTemplate()) return;
    this.downloadingTemplate.set(true);
    try {
      await firstValueFrom(this.quranData.whenReady());
      const data = {
        surahs: await firstValueFrom(this.quranData.getSurahs().pipe(take(1))),
        ayahs: await firstValueFrom(this.quranData.getAyahs().pipe(take(1))),
        pages: await firstValueFrom(this.quranData.getPages().pipe(take(1))),
        words: await firstValueFrom(
          this.quranData.getWords(this.selectedSurah() ?? undefined).pipe(take(1))
        ),
      };
      const emptyRows = buildEmptyTemplateRows(this.template, data);
      if (emptyRows.length === 0) {
        this.message.error(this.translate.instant('ADMIN.CONTENT_EDITOR.TEMPLATE.DOWNLOAD_EMPTY'));
        return;
      }
      const csv = emptyTemplateToCsv(this.template, emptyRows);
      triggerCsvDownload(csv, emptyTemplateFilename(this.slug, this.template, this.mushafPrint));
      this.message.success(this.translate.instant('ADMIN.CONTENT_EDITOR.TEMPLATE.DOWNLOADED'));
    } catch {
      this.message.error(this.translate.instant('ADMIN.CONTENT_EDITOR.TEMPLATE.DOWNLOAD_FAILED'));
    } finally {
      this.downloadingTemplate.set(false);
    }
  }

  onCsvFileSelected(event: Event): void {
    if (this.readOnly) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      void this.importCsvText(text);
    };
    reader.readAsText(file);
  }

  async importCsvText(csvText: string): Promise<void> {
    const result = validateAndMapCsvImport(csvText, this.template, this.rows());
    if (result.headerMismatch) {
      this.message.error(this.translate.instant('ADMIN.CONTENT_EDITOR.CSV_UPLOAD.HEADER_MISMATCH'));
      return;
    }
    if (result.rowErrors.length > 0) {
      this.message.error(
        this.translate.instant('ADMIN.CONTENT_EDITOR.CSV_UPLOAD.ROW_ERRORS', {
          count: result.rowErrors.length,
        })
      );
      return;
    }
    if (!result.valid) {
      this.message.error(this.translate.instant('ADMIN.CONTENT_EDITOR.CSV_UPLOAD.INVALID'));
      return;
    }
    const versionId = this.draftId();
    if (versionId === null) return;
    const chunks = chunkPatches(result.patches, CSV_UPLOAD_CHUNK_SIZE);
    this.csvUploadProgress.set(0);
    let done = 0;
    for (const chunk of chunks) {
      try {
        await firstValueFrom(
          this.contentService.patchEntries(
            this.kind,
            this.slug,
            versionId,
            chunk,
            this.langSlug ?? undefined
          )
        );
        for (const patch of chunk) {
          const row = this.rows().find((r) => r.ayah_id === patch.ayah_id);
          if (row) {
            row.text = patch.text;
            row.footnotes = patch.footnotes;
          }
        }
        done++;
        this.csvUploadProgress.set(Math.round((done / chunks.length) * 100));
      } catch (err) {
        this.csvUploadProgress.set(null);
        this.showError(err as HttpErrorResponse);
        return;
      }
    }
    this.rows.set([...this.rows()]);
    this.csvUploadProgress.set(null);
    this.dirty.set(false);
    this.message.success(
      this.translate.instant('ADMIN.CONTENT_EDITOR.CSV_UPLOAD.SUCCESS', {
        count: result.patches.length,
      })
    );
  }

  onPaste(event: ClipboardEvent): void {
    if (this.readOnly) return;
    const api = this.gridApi;
    if (!api || api.getEditingCells().length > 0) return;
    const focused = api.getFocusedCell();
    if (!focused) return;
    const editableFields = new Set(getContentTemplateDescriptor(this.template).editableFields);
    const startField = focused.column.getColDef().field;
    if (!startField || !editableFields.has(startField)) {
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
        if (!field || !editableFields.has(field)) return;
        node.setDataValue(field, value);
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

  copySelectedToCsv(): void {
    if (this.readOnly && !this.reviewMode) return;
    const api = this.gridApi;
    if (!api) return;
    const selected = api.getSelectedRows() as ContentEntry[];
    if (selected.length === 0) {
      this.message.info(this.translate.instant('ADMIN.CONTENT_EDITOR.COPY.NONE_SELECTED'));
      return;
    }
    const { csvHeaders } = getContentTemplateDescriptor(this.template);
    selected.sort((a, b) => a.order - b.order || a.ayah_id - b.ayah_id);
    const table = [
      csvHeaders,
      ...selected.map((r) =>
        csvHeaders.map((h) => String((r as unknown as Record<string, unknown>)[h] ?? ''))
      ),
    ];
    navigator.clipboard.writeText(serializeCsv(table)).then(
      () =>
        this.message.success(
          this.translate.instant('ADMIN.CONTENT_EDITOR.COPY.COPIED', { count: selected.length })
        ),
      () => this.message.error(this.translate.instant('ADMIN.CONTENT_EDITOR.COPY.FAILED'))
    );
  }

  saveDraft(): void {
    if (this.readOnly || this.draftId() === null) return;
    this.savingDraft.set(true);
    void this.flushPending().then((ok) => {
      this.savingDraft.set(false);
      if (!ok) return;
      this.message.success(this.translate.instant('ADMIN.CONTENT_EDITOR.MESSAGES.DRAFT_SAVED'));
      void this.router.navigate(['/admin', this.listSegment(), this.slug]);
    });
  }

  keepDraftOnLeave(): Promise<boolean> {
    return this.flushPending();
  }

  submitForReview(): void {
    const versionId = this.draftId();
    if (versionId === null || this.readOnly) return;
    this.submittingReview.set(true);
    void this.flushPending().then(async (ok) => {
      if (!ok) {
        this.submittingReview.set(false);
        return;
      }
      try {
        await firstValueFrom(
          this.reviewService.submitForReview(
            this.kind as 'tafsir' | 'translation',
            this.slug,
            versionId,
            this.langSlug ?? undefined
          )
        );
        this.message.success(this.translate.instant('ADMIN.CONTENT_EDITOR.REVIEW.SUBMITTED'));
        void this.router.navigate(['/admin', this.listSegment(), this.slug]);
      } catch (err) {
        this.showError(err as HttpErrorResponse);
      } finally {
        this.submittingReview.set(false);
      }
    });
  }

  publish(): void {
    const versionId = this.draftId();
    if (versionId === null || this.readOnly) return;
    this.publishing.set(true);
    void this.flushPending().then((ok) => {
      if (!ok) {
        this.publishing.set(false);
        return;
      }
      this.contentService
        .publish(this.kind, this.slug, versionId, {}, this.langSlug ?? undefined)
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

  confirmDiscard(): void {
    if (this.readOnly) {
      void this.router.navigate(['/admin', this.listSegment(), this.slug]);
      return;
    }
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
        this.discardAndLeave().then((success) => {
          if (!success) return Promise.resolve(false);
          return this.router.navigate(['/admin', this.listSegment(), this.slug]);
        }),
    });
  }

  discardAndLeave(): Promise<boolean> {
    const versionId = this.draftId();
    if (versionId === null) return Promise.resolve(true);
    return new Promise((resolve) => {
      this.contentService
        .discardDraft(this.kind, this.slug, versionId, this.langSlug ?? undefined)
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

  approveDiffRow(rowKey: string): void {
    const versionId = this.draftId();
    if (versionId === null) return;
    this.reviewService
      .approveRow(
        this.kind as 'tafsir' | 'translation',
        this.slug,
        versionId,
        rowKey,
        this.langSlug ?? undefined
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reviewDiffRows.update((rows) =>
            rows.map((r) => (r.row_key === rowKey ? { ...r, approved: true } : r))
          );
          this.message.success(this.translate.instant('ADMIN.CONTENT_EDITOR.REVIEW.APPROVED_ROW'));
        },
        error: (err: HttpErrorResponse) => this.showError(err),
      });
  }

  openRowComment(rowKey: string): void {
    const versionId = this.draftId();
    if (versionId === null) return;
    this.reviewService
      .listComments(
        this.kind as 'tafsir' | 'translation',
        this.slug,
        versionId,
        rowKey,
        this.langSlug ?? undefined
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (existing) => {
          const body = window.prompt(
            this.translate.instant('ADMIN.CONTENT_EDITOR.REVIEW.COMMENT_PROMPT'),
            ''
          );
          if (!body?.trim()) return;
          this.reviewService
            .addComment(
              this.kind as 'tafsir' | 'translation',
              this.slug,
              versionId,
              rowKey,
              body.trim(),
              this.langSlug ?? undefined
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.reviewDiffRows.update((rows) =>
                  rows.map((r) =>
                    r.row_key === rowKey ? { ...r, comments_count: existing.length + 1 } : r
                  )
                );
                this.message.success(
                  this.translate.instant('ADMIN.CONTENT_EDITOR.REVIEW.COMMENT_ADDED')
                );
              },
              error: (err: HttpErrorResponse) => this.showError(err),
            });
        },
      });
  }

  onReferenceLangChange(slug: string | null): void {
    this.referenceLangSlug = slug;
    void this.loadReferenceColumn();
  }

  private applySurahScope(sura: number): void {
    this.selectedSurah.set(sura);
    void this.flushPending().then((ok) => {
      if (ok) this.reloadEntries();
    });
  }

  private rebuildColumns(): void {
    const editable = !this.readOnly && !this.reviewMode;
    this.columnDefs = buildContentColumnDefs(
      this.template,
      (key) => this.colHeader(key),
      () => this.surahOptions()
    ).map((col) => ({
      ...col,
      editable: editable && col.editable === true,
    }));
    if (this.referenceLangSlug) {
      this.columnDefs.push({
        field: 'reference_text' as keyof ContentEntry & string,
        headerName: this.translate.instant('ADMIN.CONTENT_EDITOR.REFERENCE_COLUMN'),
        editable: false,
        flex: 1,
        valueGetter: (params) => {
          const ayahId = params.data?.ayah_id;
          return ayahId !== undefined ? (this.referenceTextByAyahId.get(ayahId) ?? '') : '';
        },
        wrapText: true,
        autoHeight: true,
      });
    }
    if (this.reviewMode) {
      this.columnDefs.push(
        {
          headerName: this.translate.instant('ADMIN.CONTENT_EDITOR.REVIEW.APPROVE'),
          width: 90,
          editable: false,
          cellRenderer: () => '',
        },
        {
          headerName: this.translate.instant('ADMIN.CONTENT_EDITOR.REVIEW.COMMENT'),
          width: 90,
          editable: false,
          cellRenderer: () => '',
        }
      );
    }
  }

  private initDraft(): void {
    this.loading.set(true);
    this.contentService
      .createDraft(this.kind, this.slug, this.langSlug ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (draft) => {
          this.draftId.set(draft.id);
          this.reloadEntries();
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.showError(err);
        },
      });
  }

  private reloadEntries(): void {
    this.loadAllEntries(1);
  }

  private loadAllEntries(page: number, acc: ContentEntry[] = []): void {
    const versionId = this.draftId();
    if (versionId === null) return;
    const sura = this.template === 'word' ? (this.selectedSurah() ?? 1) : undefined;
    this.contentService
      .getEntries(
        this.kind,
        this.slug,
        versionId,
        { page, page_size: ENTRIES_PAGE_SIZE, sura },
        this.langSlug ?? undefined
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const merged = acc.concat(response.results);
          if (merged.length < response.count && response.results.length > 0) {
            this.loadAllEntries(page + 1, merged);
          } else {
            this.rows.set(merged);
            this.entriesTotal.set(response.count);
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

  private async refreshDiff(): Promise<void> {
    if (!this.contentDiffViewEnabled || !this.showDiffOnly()) return;
    const versionId = this.draftId();
    if (versionId === null) return;
    this.diffLoading.set(true);
    try {
      const versions = await firstValueFrom(
        this.versionsService.list(this.kind, this.slug, { page: 1, page_size: 1 })
      );
      const published = versions.results[0];
      if (!published) {
        this.diffRows.set([]);
        return;
      }
      const baseEntries = await this.loadVersionEntries(published.id);
      const diffs = computeContentDiff(this.template, baseEntries, this.rows());
      this.diffRows.set(diffs);
      const reviewRows: ContentDiffEntryOut[] = diffs.map((d) => ({
        row_key: d.key,
        sura: d.entry.sura,
        aya: d.entry.aya,
        surah_name: d.entry.surah_name,
        before_text: d.beforeText,
        after_text: d.afterText,
        before_footnotes: d.beforeFootnotes,
        after_footnotes: d.afterFootnotes,
        approved: false,
        comments_count: 0,
      }));
      this.reviewDiffRows.set(this.reviewService.enrichDiffRows(versionId, reviewRows));
    } catch {
      this.diffRows.set([]);
    } finally {
      this.diffLoading.set(false);
    }
  }

  private loadVersionEntries(versionId: number): Promise<ContentEntry[]> {
    return new Promise((resolve, reject) => {
      const loadPage = (page: number, acc: ContentEntry[] = []) => {
        const sura = this.template === 'word' ? (this.selectedSurah() ?? 1) : undefined;
        this.contentService
          .getEntries(
            this.kind,
            this.slug,
            versionId,
            { page, page_size: ENTRIES_PAGE_SIZE, sura },
            this.langSlug ?? undefined
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (response) => {
              const merged = acc.concat(response.results);
              if (merged.length < response.count && response.results.length > 0) {
                loadPage(page + 1, merged);
              } else {
                resolve(merged);
              }
            },
            error: reject,
          });
      };
      loadPage(1);
    });
  }

  private async loadReferenceColumn(): Promise<void> {
    if (!this.referenceLangSlug || !this.draftId()) return;
    try {
      const entries = await this.loadVersionEntries(this.draftId()!);
      this.referenceTextByAyahId = new Map(entries.map((e) => [e.ayah_id, e.text ?? '']));
      this.rebuildColumns();
      this.gridApi?.setGridOption('columnDefs', this.columnDefs);
      this.gridApi?.refreshCells({ force: true });
    } catch {
      this.referenceTextByAyahId.clear();
    }
  }

  private flushPending(): Promise<boolean> {
    const versionId = this.draftId();
    if (versionId === null || this.pendingRows.size === 0 || this.readOnly) {
      return Promise.resolve(true);
    }
    const batch = Array.from(this.pendingRows.values());
    this.pendingRows.clear();
    this.saving.set(true);
    return new Promise<boolean>((resolve) => {
      this.contentService
        .patchEntries(this.kind, this.slug, versionId, batch, this.langSlug ?? undefined)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            if (this.pendingRows.size === 0) this.dirty.set(false);
            resolve(true);
          },
          error: (err: HttpErrorResponse) => {
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

  private listSegment(): string {
    return this.kind === 'tafsir' ? 'tafsirs' : 'translations';
  }

  private colHeader(key: string): string {
    return this.translate.instant(`ADMIN.CONTENT_EDITOR.COLUMNS.${key}`);
  }

  private showError(err: HttpErrorResponse): void {
    const name = err?.error?.error_name;
    this.message.error(
      name
        ? this.translate.instant(`ADMIN.CONTENT_EDITOR.ERRORS.${name.toUpperCase()}`, {
            default: this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.GENERIC'),
          })
        : this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.GENERIC')
    );
  }
}
