import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  Input,
  OnInit,
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
} from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Subject, debounceTime } from 'rxjs';
import type {
  AssetVersionParentKind,
  ContentEntry,
  ContentEntryPatch,
} from '../../models/asset-content.models';
import { AssetContentService } from '../../services/asset-content.service';

ModuleRegistry.registerModules([AllCommunityModule]);

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
  readonly dirty = signal(false);

  readonly rtl = computed(() => this.translate.currentLang === 'ar');

  readonly theme = themeQuartz;

  readonly defaultColDef: ColDef<ContentEntry> = {
    resizable: true,
    sortable: true,
    filter: true,
  };

  readonly columnDefs: ColDef<ContentEntry>[] = [
    { field: 'sura', headerName: 'Sura', width: 90, editable: false },
    { field: 'aya', headerName: 'Aya', width: 80, editable: false },
    {
      field: 'surah_name',
      headerName: 'Surah',
      width: 140,
      editable: false,
    },
    {
      field: 'uthmani',
      headerName: 'Ayah (Uthmani)',
      flex: 1,
      editable: false,
      cellStyle: { direction: 'rtl', fontFamily: 'serif' },
      wrapText: true,
      autoHeight: true,
    },
    {
      field: 'text',
      headerName: 'Text',
      flex: 2,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      wrapText: true,
      autoHeight: true,
    },
    {
      field: 'footnotes',
      headerName: 'Footnotes',
      flex: 1,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      wrapText: true,
      autoHeight: true,
    },
  ];

  ngOnInit(): void {
    this.autosave$
      .pipe(debounceTime(AUTOSAVE_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.flushAutosave());
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
      footnotes: row.footnotes ?? '',
    });
    this.dirty.set(true);
    this.autosave$.next();
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
            this.loading.set(false);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.showError(err);
        },
      });
  }

  private flushAutosave(): void {
    const versionId = this.draftId();
    if (versionId === null || this.pendingRows.size === 0) return;
    const batch = Array.from(this.pendingRows.values());
    this.pendingRows.clear();
    this.saving.set(true);
    this.contentService
      .patchEntries(this.kind, this.slug, versionId, batch)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          if (this.pendingRows.size === 0) {
            this.dirty.set(false);
          }
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
        },
      });
  }

  /** Save = publish the draft as a new version. Flushes pending edits first. */
  publish(): void {
    const versionId = this.draftId();
    if (versionId === null) return;
    this.flushAutosave();
    this.publishing.set(true);
    this.contentService
      .publish(this.kind, this.slug, versionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.publishing.set(false);
          this.dirty.set(false);
          this.pendingRows.clear();
          this.draftId.set(null);
          this.message.success(
            this.translate.instant('ADMIN.CONTENT_EDITOR.MESSAGES.PUBLISHED')
          );
          void this.router.navigate(['/admin', this.listSegment(), this.slug]);
        },
        error: (err: HttpErrorResponse) => {
          this.publishing.set(false);
          this.showError(err);
        },
      });
  }

  /** Discard the draft (delete it server-side) and return to the detail page. */
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
          error: () => resolve(true),
        });
    });
  }

  private listSegment(): string {
    return this.kind === 'tafsir' ? 'tafsirs' : 'translations';
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
