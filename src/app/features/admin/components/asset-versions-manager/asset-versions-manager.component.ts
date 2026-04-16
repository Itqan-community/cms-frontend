import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subject, debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs';
import type { AssetVersion, AssetVersionParentKind } from '../../models/asset-versions.models';
import { AssetVersionsService } from '../../services/asset-versions.service';

const DEFAULT_PAGE_SIZE = 10;

@Component({
  selector: 'app-asset-versions-manager',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TranslateModule,
    NgIcon,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzPaginationModule,
    NzSpinModule,
    NzTableModule,
    NzToolTipModule,
  ],
  templateUrl: './asset-versions-manager.component.html',
  styleUrl: './asset-versions-manager.component.less',
})
export class AssetVersionsManagerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly assetVersionsService = inject(AssetVersionsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();
  /** Emits to abort the in-flight create/update HTTP request (unsubscribe → browser abort). */
  private readonly cancelInFlightSubmit$ = new Subject<void>();

  /** Parent asset kind — drives API paths. */
  @Input({ required: true }) kind!: AssetVersionParentKind;
  /** Slug from route (tafsir or translation). */
  @Input({ required: true }) slug!: string;
  /** i18n prefix for panel strings, e.g. ADMIN.TAFSIRS.DETAIL.VERSIONS */
  @Input({ required: true }) i18nPrefix!: string;
  /** i18n key for section heading (existing VERSIONS_TITLE). */
  @Input({ required: true }) sectionTitleKey!: string;
  /** Parent asset id (required by portal multipart body). */
  @Input({ required: true }) assetId!: number;

  readonly list = signal<AssetVersion[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly searchTerm = signal('');
  readonly selectedFileName = signal<string | null>(null);
  private selectedFile: File | null = null;

  /** Create/edit popup visibility. */
  readonly versionModalOpen = signal(false);
  /** Full i18n key for modal title (set when opening). */
  readonly versionModalTitleKey = signal('');
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    summary: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.page.set(1);
        this.loadList();
      });
    this.loadList();
  }

  onSearchInput(value: string): void {
    this.search$.next(value);
  }

  loadList(): void {
    if (!this.slug) return;
    this.loading.set(true);
    this.assetVersionsService
      .list(this.kind, this.slug, {
        page: this.page(),
        page_size: this.pageSize(),
        search: this.searchTerm() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.list.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.message.error(this.translate.instant(`${this.i18nPrefix}.MESSAGES.LOAD_ERROR`));
        },
      });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.loadList();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.loadList();
  }

  openCreateModal(): void {
    this.modalMode.set('create');
    this.editingId.set(null);
    this.form.reset({ name: '', summary: '' });
    this.clearFile();
    this.versionModalTitleKey.set(`${this.i18nPrefix}.MODAL_TITLE_CREATE`);
    this.versionModalOpen.set(true);
  }

  openEditModal(row: AssetVersion): void {
    this.modalMode.set('edit');
    this.editingId.set(row.id);
    this.form.patchValue({
      name: row.name,
      summary: row.summary ?? '',
    });
    this.clearFile();
    this.versionModalTitleKey.set(`${this.i18nPrefix}.MODAL_TITLE_EDIT`);
    this.versionModalOpen.set(true);
  }

  onVersionModalVisibleChange(visible: boolean): void {
    this.versionModalOpen.set(visible);
    if (!visible) {
      this.abortInFlightSave();
      this.resetModalFormState();
    }
  }

  closeVersionModal(): void {
    this.abortInFlightSave();
    this.versionModalOpen.set(false);
    this.resetModalFormState();
  }

  /** Unsubscribes active save request so Angular HttpClient aborts the network call. */
  private abortInFlightSave(): void {
    this.cancelInFlightSubmit$.next();
  }

  private resetModalFormState(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', summary: '' });
    this.clearFile();
  }

  onPickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    this.selectedFile = file;
    this.selectedFileName.set(file.name);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    const id = this.editingId();
    if (id == null && !this.selectedFile) {
      this.message.warning(this.translate.instant(`${this.i18nPrefix}.MESSAGES.FILE_REQUIRED`));
      return;
    }

    const payload = {
      asset_id: this.assetId,
      name: this.form.getRawValue().name,
      summary: this.form.getRawValue().summary,
      file: this.selectedFile ?? undefined,
    };

    // Abort any previous in-flight save (e.g. double submit).
    this.abortInFlightSave();
    this.saving.set(true);

    const req$ =
      id == null
        ? this.assetVersionsService.create(this.kind, this.slug, payload)
        : this.assetVersionsService.update(this.kind, this.slug, id, payload);

    req$
      .pipe(
        takeUntil(this.cancelInFlightSubmit$),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          const msgKey =
            id == null
              ? `${this.i18nPrefix}.MESSAGES.CREATE_SUCCESS`
              : `${this.i18nPrefix}.MESSAGES.UPDATE_SUCCESS`;
          this.message.success(this.translate.instant(msgKey));
          this.closeVersionModalWithoutCancelEmit();
          this.loadList();
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 0) return;
          this.message.error(this.translate.instant(`${this.i18nPrefix}.MESSAGES.SAVE_ERROR`));
        },
      });
  }

  /** Close modal after success without re-emitting cancel (save already finished). */
  private closeVersionModalWithoutCancelEmit(): void {
    this.versionModalOpen.set(false);
    this.resetModalFormState();
  }

  deleteRow(row: AssetVersion): void {
    const dir = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.modal.confirm({
      nzTitle: this.translate.instant(`${this.i18nPrefix}.DELETE_CONFIRM_TITLE`),
      nzContent: this.translate.instant(`${this.i18nPrefix}.DELETE_CONFIRM_BODY`, {
        name: row.name,
      }),
      nzOkText: this.translate.instant(`${this.i18nPrefix}.DELETE_OK`),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: dir,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.assetVersionsService.delete(this.kind, this.slug, row.id).subscribe({
            next: () => {
              this.message.success(
                this.translate.instant(`${this.i18nPrefix}.MESSAGES.DELETE_SUCCESS`)
              );
              if (this.versionModalOpen() && this.editingId() === row.id) {
                this.closeVersionModal();
              }
              this.loadList();
              resolve();
            },
            error: () => {
              this.message.error(
                this.translate.instant(`${this.i18nPrefix}.MESSAGES.DELETE_ERROR`)
              );
              reject();
            },
          });
        }),
    });
  }

  formatBytes(n: number | null | undefined): string {
    if (n == null || n <= 0) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  truncate(text: string | null | undefined, max = 80): string {
    if (text == null || text === '') return '—';
    const t = text.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max)}…`;
  }

  t(key: string): string {
    return `${this.i18nPrefix}.${key}`;
  }

  modalDirection(): 'rtl' | 'ltr' {
    return this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
  }
}
