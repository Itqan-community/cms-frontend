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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AgGridAngular } from 'ag-grid-angular';
import type {
  ColDef,
  FilterChangedEvent,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  INumberFilterParams,
  ITextFilterParams,
  LocaleText,
  RowSelectionOptions,
} from 'ag-grid-community';
import {
  CellStyleModule,
  ClientSideRowModelModule,
  CustomFilterModule,
  LocaleModule,
  ModuleRegistry,
  NumberFilterModule,
  RowApiModule,
  RowAutoHeightModule,
  RowSelectionModule,
  TextFilterModule,
  ValidationModule,
  themeQuartz,
} from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { AdminTablePaginationComponent } from '../admin-table-pagination/admin-table-pagination.component';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import type { AssetColumn, AssetTemplate } from '../../models/asset-content.models';
import type {
  BulkApproveRequest,
  ReviewChange,
  ReviewFilterModel,
  ReviewState,
  ReviewVersion,
} from '../../models/asset-review.models';
import type { AssetVersionParentKind } from '../../models/asset-versions.models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetContentService } from '../../services/asset-content.service';
import { AssetReviewService } from '../../services/asset-review.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import { localizedLanguageName } from '../../utils/iso-639.util';
import { isPreviewCut } from '../../utils/text-preview.util';
import { diffWords } from '../../utils/word-diff.util';
import { ChangeCompareComponent } from '../change-compare/change-compare.component';
import { columnLabel } from '../../utils/column-label.util';
import { SurahFloatingFilterComponent } from '../asset-content-grid/surah-floating-filter.component';
import {
  OptionsFloatingFilterComponent,
  ReviewActionsCellComponent,
  ReviewChangeCellComponent,
  ReviewStateCellComponent,
  type OptionsFloatingFilterParams,
  type ReviewActionType,
  type ReviewGridContext,
  type RowCompare,
} from './review-grid-cells.component';

export type { ReviewActionType } from './review-grid-cells.component';

// Only what this grid uses (see the content editor's `GRID_MODULES`). Rows are one
// server page at a time, so the client-side row model can size each row to its
// diff (`autoHeight`), which the infinite row model can't.
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  CustomFilterModule,
  RowSelectionModule,
  RowAutoHeightModule,
  // `getRowNode` (un-ticking a row once approved).
  RowApiModule,
  CellStyleModule,
  LocaleModule,
  ...(isDevMode() ? [ValidationModule] : []),
]);

type StateFilter = 'all' | ReviewState;

const DEFAULT_PAGE_SIZE = 25;
/** Unchanged words kept around each change — the same as the versions list. */
const CONTEXT_WORDS = 2;
const CHANGE_TYPES: readonly ReviewChange['change_type'][] = ['added', 'modified', 'removed'];
/** Templates whose units sit in one surah / start at an ayah (all but `page`). */
const AYAH_TEMPLATES: readonly AssetTemplate[] = ['ayah', 'word', 'ayah_group', 'word_group'];

/**
 * Every filter runs on the server, over the whole language (see `loadChanges`).
 * The client-side row model also filters the page it holds, so text conditions
 * always pass locally (the server already matched them, ignoring vocalization and
 * across before/after); `blank` / `notBlank` and number filters agree on both sides.
 */
const TEXT_FILTER_PARAMS: ITextFilterParams = {
  maxNumConditions: 2,
  trimInput: true,
  textMatcher: () => true,
};
const NUMBER_FILTER_PARAMS: INumberFilterParams = {
  maxNumConditions: 2,
  inRangeInclusive: true,
  allowedCharPattern: '\\d',
};

@Component({
  selector: 'app-asset-review-grid',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    AgGridAngular,
    AdminTablePaginationComponent,
    ChangeCompareComponent,
  ],
  templateUrl: './asset-review-grid.component.html',
  styleUrl: './asset-review-grid.component.less',
})
export class AssetReviewGridComponent implements OnInit, ReviewGridContext {
  private readonly reviewService = inject(AssetReviewService);
  private readonly contentService = inject(AssetContentService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly lastLanguage = inject(LastActiveLanguageService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  /** Emits to abort the in-flight changes request. Row actions stay available
   *  while another row is saving, so two reloads can otherwise race and an older
   *  response can restore a row the current filter no longer includes. */
  private readonly cancelInFlightChanges$ = new Subject<void>();

  /** Parent asset kind — drives API paths. */
  @Input({ required: true }) kind!: AssetVersionParentKind;
  /** Slug from route (tafsir or translation). */
  @Input({ required: true }) slug!: string;
  /** Language to open on (e.g. from a version's "pending review" link). */
  readonly initialLanguage = input<string | null>(null);
  /** Version to open on: only the changes that make it up are listed. */
  readonly initialVersion = input<number | null>(null);

  readonly canReview = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_REVIEW_CONTENT)
  );

  readonly languages = signal<string[]>([]);
  readonly selectedLanguage = signal<string | null>(null);
  readonly changes = signal<ReviewChange[]>([]);
  /** The asset's text columns (null until loaded, or when unavailable). */
  private readonly columns = signal<AssetColumn[] | null>(null);
  /** Several text columns: a column shows (and filters) each change's column.
   *  Until the asset's columns load, guessed from the changes on this page. */
  readonly multiColumn = computed(() => {
    const columns = this.columns();
    if (columns !== null) return columns.length > 1;
    return this.changes().some((c) => !!c.column && c.column !== 'text');
  });
  /** The asset's unit template, from its changes (fixed per asset); null until any load. */
  readonly template = signal<AssetTemplate | null>(null);
  /** The grid's column filters, sent with every listing and with "Approve all". */
  readonly filterModel = signal<ReviewFilterModel>({});
  readonly hasColumnFilters = computed(() => Object.keys(this.filterModel()).length > 0);
  private gridApi: GridApi<ReviewChange> | null = null;
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly loading = signal(false);
  readonly languagesError = signal(false);
  readonly stateFilter = signal<StateFilter>('unreviewed');
  /** The selected language's committed versions, newest first. */
  readonly versions = signal<ReviewVersion[]>([]);
  /** `null`: every change; otherwise the changes that make up this version. */
  readonly selectedVersion = signal<number | null>(null);
  readonly selectedVersionName = computed(
    () => this.versions().find((v) => v.id === this.selectedVersion())?.name ?? null
  );
  readonly savingAction = signal<{ id: number; action: ReviewActionType } | null>(null);

  /** Rows ticked for "Approve selected" — on the current page only. */
  readonly selectedIds = signal<ReadonlySet<number>>(new Set());
  /** A bulk approve is in flight. */
  readonly bulkApproving = signal(false);
  /** "Approve all" has nothing to do when only approved changes are listed. */
  readonly canApproveAll = computed(() => this.stateFilter() !== 'approved' && this.total() > 0);

  /** Comment dialog state. */
  readonly commentOpen = signal(false);
  readonly commentText = signal('');
  commentChangeId: number | null = null;

  readonly hasLanguages = computed(() => this.languages().length > 0);

  /**
   * Before/after per row. "Before" is the last-approved text, so the reviewer sees
   * the net change since the last approval; a unit never approved compares with
   * the text this commit replaced.
   */
  readonly compare = computed<ReadonlyMap<number, RowCompare>>(() => {
    const byId = new Map<number, RowCompare>();
    for (const row of this.changes()) {
      const before = row.baseline_text || row.old_text || '';
      const after = row.new_text || '';
      const words =
        before && after && before !== after
          ? diffWords(before, after, { contextWords: CONTEXT_WORDS })
          : null;
      byId.set(row.id, { before, after, words, cut: isPreviewCut(before, after, words) });
    }
    return byId;
  });

  /** The row whose full before/after text is open in the popup. */
  readonly fullTextRow = signal<ReviewChange | null>(null);

  openFullText(row: ReviewChange): void {
    this.fullTextRow.set(row);
  }

  closeFullText(): void {
    this.fullTextRow.set(null);
  }

  readonly langName = (code: string): string =>
    localizedLanguageName(code, this.translate.currentLang || 'en');

  /** A row's column, labelled in the interface language (its key when unlabelled). */
  columnName(change: ReviewChange): string {
    return columnLabel(
      { key: change.column, label_en: change.column_label_en, label_ar: change.column_label_ar },
      this.translate.currentLang
    );
  }

  /** i18n key for a change type (e.g. "added" → ADMIN.REVIEW.TYPE.ADDED). */
  typeKey(type: ReviewChange['change_type']): string {
    return `ADMIN.REVIEW.TYPE.${type.toUpperCase()}`;
  }

  readonly rtl = computed(() => this.translate.currentLang === 'ar');
  readonly theme = themeQuartz;
  /** The cells' view of this component (`ReviewGridContext`). */
  readonly gridContext: ReviewGridContext = this;

  /** Grid-owned text in the UI language: the editor's filter texts (AG Grid's own
   *  locale keys) and the empty-page message. Read once, when the grid is created. */
  readonly localeText = computed<LocaleText>(() => {
    const grid: unknown = this.translate.instant('ADMIN.CONTENT_EDITOR.GRID');
    return {
      loadingOoo: this.translate.instant('COMMON.LOADING'),
      noRowsToShow: this.translate.instant('ADMIN.REVIEW.NO_CHANGES'),
      ...(typeof grid === 'object' && grid !== null ? (grid as LocaleText) : {}),
    };
  });

  /** Ticking a row selects it for "Approve selected"; approved rows can't be ticked. */
  readonly rowSelection: RowSelectionOptions<ReviewChange> = {
    mode: 'multiRow',
    checkboxes: true,
    headerCheckbox: true,
    isRowSelectable: (node) => node.data?.review_state !== 'approved',
  };

  readonly defaultColDef: ColDef<ReviewChange> = {
    resizable: true,
    // Changes come back newest commit first; the endpoint has no other order.
    sortable: false,
    suppressMovable: true,
  };

  readonly getRowId = (params: GetRowIdParams<ReviewChange>): string => String(params.data.id);

  readonly columnDefs = computed(() => this.buildColumnDefs());

  ngOnInit(): void {
    if (!this.canReview()) {
      return;
    }
    this.loadLanguages();
    this.loadColumns();
  }

  /** The asset's text columns; failures keep the page-based guess. */
  private loadColumns(): void {
    this.contentService
      .listColumns(this.kind, this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (columns) => this.columns.set(columns.length ? columns : null),
        error: () => this.columns.set(null),
      });
  }

  /**
   * One column per field a reviewer narrows by, each with a floating filter:
   * the unit (a surah dropdown, filtering `unit_surah`), its ayah number, the
   * text column (several-column assets), the change type, the change's text
   * (before or after), its commit, editor and comment, and who reviewed it.
   * Every filter model key is a backend `filters` key (see `TEXT_FILTER_PARAMS`).
   */
  buildColumnDefs(): ColDef<ReviewChange>[] {
    const template = this.template();
    const textFilter: ColDef<ReviewChange> = {
      filter: 'agTextColumnFilter',
      filterParams: TEXT_FILTER_PARAMS,
      floatingFilter: true,
    };
    const optionsFilter = (options: OptionsFloatingFilterParams['options']) =>
      ({
        ...textFilter,
        floatingFilterComponent: OptionsFloatingFilterComponent,
        floatingFilterComponentParams: {
          options,
          allLabel: this.translate.instant('ADMIN.REVIEW.FILTER.ALL'),
        } satisfies Partial<OptionsFloatingFilterParams>,
        // The dropdown is the whole filter UI for this column.
        suppressHeaderFilterButton: true,
        suppressFloatingFilterButton: true,
      }) satisfies ColDef<ReviewChange>;
    const hasSurah = template !== 'page';
    const columns: ColDef<ReviewChange>[] = [
      {
        colId: 'unit_surah',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.UNIT'),
        width: hasSurah ? 170 : 120,
        pinned: this.rtl() ? 'right' : 'left',
        // Filters on the surah number; shows the unit's reference.
        valueGetter: ({ data }) => data?.surah ?? null,
        valueFormatter: ({ data }) => data?.label ?? '',
        // A range label reads start → end only left-to-right, also in Arabic.
        cellStyle: { direction: 'ltr', unicodeBidi: 'isolate' },
        ...(hasSurah
          ? {
              filter: 'agNumberColumnFilter',
              filterParams: NUMBER_FILTER_PARAMS,
              floatingFilter: true,
              floatingFilterComponent: SurahFloatingFilterComponent,
              suppressHeaderFilterButton: true,
              suppressFloatingFilterButton: true,
            }
          : {}),
      },
    ];
    if (template === null || AYAH_TEMPLATES.includes(template)) {
      columns.push({
        field: 'ayah',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.AYAH'),
        width: 110,
        filter: 'agNumberColumnFilter',
        filterParams: NUMBER_FILTER_PARAMS,
        floatingFilter: true,
      });
    }
    if (this.multiColumn()) {
      columns.push({
        field: 'column',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.COLUMN'),
        width: 150,
        valueFormatter: ({ data }) => (data ? this.columnName(data) : ''),
        cellClass: 'asset-review-grid__column',
        ...optionsFilter(
          (this.columns() ?? []).map((c) => ({
            value: c.key,
            label: columnLabel(c, this.translate.currentLang),
          }))
        ),
      });
    }
    columns.push(
      {
        field: 'change_type',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.TYPE'),
        width: 120,
        valueFormatter: ({ value }) =>
          value ? this.translate.instant(this.typeKey(value as ReviewChange['change_type'])) : '',
        ...optionsFilter(
          CHANGE_TYPES.map((type) => ({
            value: type,
            label: this.translate.instant(this.typeKey(type)),
          }))
        ),
      },
      {
        colId: 'text',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.CHANGE'),
        flex: 1,
        minWidth: 320,
        // The text the change is about: what it wrote, or what it removed.
        valueGetter: ({ data }) => data?.new_text || data?.old_text || '',
        cellRenderer: ReviewChangeCellComponent,
        autoHeight: true,
        ...textFilter,
      },
      {
        field: 'commit_ref',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.COMMIT'),
        width: 120,
        cellClass: 'admin-mono',
        ...textFilter,
      },
      {
        field: 'edited_by',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.EDITOR'),
        width: 150,
        cellClass: 'asset-review-grid__editor',
        valueFormatter: ({ value }) =>
          (value as string | null) ?? this.translate.instant('COMMON.EM_DASH'),
        ...textFilter,
      },
      {
        field: 'comment',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.COMMENT'),
        width: 200,
        wrapText: true,
        autoHeight: true,
        cellClass: 'asset-review-grid__comment-cell',
        ...textFilter,
      },
      {
        // The state is the toolbar's filter; this column's filter is the reviewer.
        colId: 'reviewed_by',
        field: 'reviewed_by',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.STATE'),
        width: 170,
        cellRenderer: ReviewStateCellComponent,
        autoHeight: true,
        ...textFilter,
        filterParams: {
          ...TEXT_FILTER_PARAMS,
          filterPlaceholder: this.translate.instant('ADMIN.REVIEW.REVIEWER_FILTER'),
        },
      },
      {
        colId: 'actions',
        headerName: this.translate.instant('ADMIN.REVIEW.COLUMN.ACTIONS'),
        width: 230,
        pinned: this.rtl() ? 'left' : 'right',
        cellRenderer: ReviewActionsCellComponent,
        autoHeight: true,
      }
    );
    return columns;
  }

  onGridReady(event: GridReadyEvent<ReviewChange>): void {
    this.gridApi = event.api;
  }

  /** A column filter changed: list page 1 of what the filters now match. */
  onFilterChanged(event: FilterChangedEvent<ReviewChange>): void {
    this.filterModel.set(event.api.getFilterModel());
    this.page.set(1);
    this.loadChanges();
  }

  clearColumnFilters(): void {
    // Raises `filterChanged`, which reloads.
    this.gridApi?.setFilterModel(null);
  }

  /** Ticked rows, as the grid reports them. */
  onSelectionChanged(): void {
    const rows = this.gridApi?.getSelectedRows() ?? [];
    this.selectedIds.set(new Set(rows.map((r) => r.id)));
  }

  loadLanguages(): void {
    this.languagesError.set(false);
    this.loading.set(true);
    this.reviewService
      .listLanguages(this.kind, this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (langs) => {
          this.languages.set(langs);
          const requested = langs.find((l) => l === this.initialLanguage());
          const remembered = this.lastLanguage.get(this.kind, this.slug);
          const initial = requested ?? langs.find((l) => l === remembered) ?? langs[0] ?? null;
          this.selectedLanguage.set(initial);
          // A requested version only applies to the language it was requested with.
          this.selectedVersion.set(requested ? this.initialVersion() : null);
          if (this.selectedLanguage()) {
            this.loadVersions();
            this.loadChanges();
          } else {
            this.loading.set(false);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.languagesError.set(true);
          this.showError(err);
        },
      });
  }

  /** The version filter's options for the selected language. */
  private loadVersions(): void {
    const language = this.selectedLanguage();
    this.versions.set([]);
    if (!language) return;
    this.reviewService
      .listVersions(this.kind, this.slug, language)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (versions) => {
          if (this.selectedLanguage() === language) this.versions.set(versions);
        },
        error: (err: HttpErrorResponse) => this.showError(err),
      });
  }

  private loadChanges(): void {
    const language = this.selectedLanguage();
    if (!language) {
      return;
    }
    this.cancelInFlightChanges$.next();
    this.loading.set(true);
    // The ticked rows belong to the old listing: drop them now, so "Approve
    // selected" can't send them along with the new language or filters.
    this.selectedIds.set(new Set());
    this.gridApi?.deselectAll();
    const filter = this.stateFilter();
    this.reviewService
      .listChanges(
        this.kind,
        this.slug,
        language,
        this.page(),
        this.pageSize(),
        filter === 'all' ? null : filter,
        this.selectedVersion(),
        this.filterModel()
      )
      .pipe(takeUntil(this.cancelInFlightChanges$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.results.length) this.template.set(res.results[0].unit_type);
          this.changes.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.showError(err);
        },
      });
  }

  onLanguageChange(language: string): void {
    this.selectedLanguage.set(language);
    this.lastLanguage.set(this.kind, this.slug, language);
    // Versions belong to one language.
    this.selectedVersion.set(null);
    this.loadVersions();
    this.page.set(1);
    this.loadChanges();
  }

  onVersionChange(version: number | 'all'): void {
    this.selectedVersion.set(version === 'all' ? null : version);
    this.page.set(1);
    this.loadChanges();
  }

  onFilterChange(filter: StateFilter): void {
    this.stateFilter.set(filter);
    this.page.set(1);
    this.loadChanges();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadChanges();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.loadChanges();
  }

  approve(row: ReviewChange): void {
    this.applyState(row.id, 'approved', undefined, undefined, 'approve');
  }

  unreview(row: ReviewChange): void {
    this.applyState(row.id, 'unreviewed', undefined, undefined, 'unreview');
  }

  openComment(row: ReviewChange): void {
    this.commentChangeId = row.id;
    this.commentText.set(row.comment ?? '');
    this.commentOpen.set(true);
  }

  confirmComment(): void {
    const id = this.commentChangeId;
    if (id === null || !this.commentText().trim() || this.savingAction() !== null) {
      return;
    }
    this.applyState(
      id,
      'commented',
      this.commentText().trim(),
      () => {
        this.closeComment();
      },
      'comment'
    );
  }

  toggleRow(id: number, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectedIds.set(next);
    this.gridApi?.getRowNode(String(id))?.setSelected(checked);
  }

  approveSelected(): void {
    const language = this.selectedLanguage();
    const ids = [...this.selectedIds()];
    if (!language || !ids.length || this.bulkApproving()) {
      return;
    }
    this.runBulkApprove({ language, change_ids: ids });
  }

  /** Approve every change the current filters match, across all pages — after confirming. */
  approveAll(): void {
    const language = this.selectedLanguage();
    if (!language || !this.canApproveAll() || this.bulkApproving()) {
      return;
    }
    const filter = this.stateFilter();
    const version = this.selectedVersion();
    const body: BulkApproveRequest = {
      language,
      ...(filter === 'unreviewed' || filter === 'commented' ? { state: filter } : {}),
      ...(version !== null ? { version } : {}),
      ...(this.hasColumnFilters() ? { filters: this.filterModel() } : {}),
    };
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.REVIEW.BULK.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.REVIEW.BULK.CONFIRM_BODY', { count: this.total() }),
      nzOkText: this.translate.instant('ADMIN.REVIEW.BULK.CONFIRM_OK'),
      nzCancelText: this.translate.instant('ADMIN.REVIEW.COMMENT_DIALOG.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () => this.runBulkApprove(body),
    });
  }

  private runBulkApprove(body: BulkApproveRequest): void {
    this.bulkApproving.set(true);
    this.reviewService
      .bulkApprove(this.kind, this.slug, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ approved }) => {
          this.bulkApproving.set(false);
          this.message.success(
            this.translate.instant('ADMIN.REVIEW.BULK.SUCCESS', { count: approved })
          );
          this.loadChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.bulkApproving.set(false);
          this.showError(err);
        },
      });
  }

  closeComment(): void {
    this.commentOpen.set(false);
    this.commentChangeId = null;
  }

  private applyState(
    changeId: number,
    state: ReviewState,
    comment?: string,
    onSuccess?: () => void,
    action: ReviewActionType = 'approve'
  ): void {
    this.savingAction.set({ id: changeId, action });
    this.reviewService
      .setState(this.kind, this.slug, changeId, state, comment)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.savingAction.set(null);
          onSuccess?.();
          this.message.success(
            this.translate.instant(`ADMIN.REVIEW.MESSAGES.${state.toUpperCase()}`)
          );
          // A state change can move the row out of the active filter, so reload.
          if (this.stateFilter() !== 'all') {
            this.loadChanges();
          } else {
            this.changes.update((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
            if (updated.review_state === 'approved') {
              this.toggleRow(updated.id, false);
            }
          }
        },
        error: (err: HttpErrorResponse) => {
          this.savingAction.set(null);
          this.showError(err);
        },
      });
  }

  private showError(err: HttpErrorResponse): void {
    const name: string | undefined = err?.error?.error_name;
    const key = name ? `ADMIN.REVIEW.ERRORS.${name.toUpperCase()}` : '';
    const translated = key ? this.translate.instant(key) : '';
    this.message.error(
      translated && translated !== key
        ? translated
        : this.translate.instant('ADMIN.REVIEW.ERRORS.GENERIC')
    );
  }
}
