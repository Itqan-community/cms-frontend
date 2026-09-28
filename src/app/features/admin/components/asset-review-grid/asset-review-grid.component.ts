import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';

import { AdminTablePaginationComponent } from '../admin-table-pagination/admin-table-pagination.component';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import type { ReviewChange, ReviewState } from '../../models/asset-review.models';
import type { AssetVersionParentKind } from '../../models/asset-versions.models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetReviewService } from '../../services/asset-review.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import { localizedLanguageName } from '../../utils/iso-639.util';

export type ReviewActionType = 'approve' | 'comment' | 'unreview';

type StateFilter = 'all' | ReviewState;

const DEFAULT_PAGE_SIZE = 25;

@Component({
  selector: 'app-asset-review-grid',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslateModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    AdminTablePaginationComponent,
  ],
  templateUrl: './asset-review-grid.component.html',
  styleUrl: './asset-review-grid.component.less',
})
export class AssetReviewGridComponent implements OnInit {
  private readonly reviewService = inject(AssetReviewService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly lastLanguage = inject(LastActiveLanguageService);
  private readonly message = inject(NzMessageService);
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

  readonly canReview = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_REVIEW_CONTENT)
  );

  readonly languages = signal<string[]>([]);
  readonly selectedLanguage = signal<string | null>(null);
  readonly changes = signal<ReviewChange[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly loading = signal(false);
  readonly languagesError = signal(false);
  readonly stateFilter = signal<StateFilter>('unreviewed');
  readonly savingAction = signal<{ id: number; action: ReviewActionType } | null>(null);

  /** Comment dialog state. */
  readonly commentOpen = signal(false);
  readonly commentText = signal('');
  commentChangeId: number | null = null;

  readonly hasLanguages = computed(() => this.languages().length > 0);

  readonly langName = (code: string): string =>
    localizedLanguageName(code, this.translate.currentLang || 'en');

  /** i18n key for a review state (e.g. "approved" → ADMIN.REVIEW.STATE.APPROVED). */
  stateKey(state: ReviewState): string {
    return `ADMIN.REVIEW.STATE.${state.toUpperCase()}`;
  }

  /** i18n key for a change type (e.g. "added" → ADMIN.REVIEW.TYPE.ADDED). */
  typeKey(type: ReviewChange['change_type']): string {
    return `ADMIN.REVIEW.TYPE.${type.toUpperCase()}`;
  }

  ngOnInit(): void {
    if (!this.canReview()) {
      return;
    }
    this.loadLanguages();
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
          const remembered = this.lastLanguage.get(this.kind, this.slug);
          const initial = langs.find((l) => l === remembered) ?? langs[0] ?? null;
          this.selectedLanguage.set(initial);
          if (this.selectedLanguage()) {
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

  private loadChanges(): void {
    const language = this.selectedLanguage();
    if (!language) {
      return;
    }
    this.cancelInFlightChanges$.next();
    this.loading.set(true);
    const filter = this.stateFilter();
    this.reviewService
      .listChanges(
        this.kind,
        this.slug,
        language,
        this.page(),
        this.pageSize(),
        filter === 'all' ? null : filter
      )
      .pipe(takeUntil(this.cancelInFlightChanges$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
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
