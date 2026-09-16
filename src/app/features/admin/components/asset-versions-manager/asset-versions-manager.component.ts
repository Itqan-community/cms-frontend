import { DatePipe } from '@angular/common';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';

import {
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { NgIcon } from '@ng-icons/core';

import {
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';

import {
  NzModalModule,
  NzModalService,
} from 'ng-zorro-antd/modal';

import { NzPaginationModule } from 'ng-zorro-antd/pagination';

import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  takeUntil,
} from 'rxjs';

import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';

import type {
  AssetVersion,
  AssetVersionParentKind,
} from '../../models/asset-versions.models';

import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetContentService } from '../../services/asset-content.service';
import { AssetVersionsService } from '../../services/asset-versions.service';

import { UniversalAssetPreviewerComponent } from '../universal-asset-previewer/universal-asset-previewer.component';

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
    UniversalAssetPreviewerComponent,
  ],

  templateUrl: './asset-versions-manager.component.html',

  styleUrl: './asset-versions-manager.component.less',
})
export class AssetVersionsManagerComponent
  implements OnInit
{
  private readonly fb = inject(FormBuilder);

  private readonly assetVersionsService =
    inject(AssetVersionsService);

  private readonly assetContentService =
    inject(AssetContentService);

  private readonly message =
    inject(NzMessageService);

  private readonly modal =
    inject(NzModalService);

  readonly translate =
    inject(TranslateService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly adminAuth =
    inject(AdminAuthService);

  private readonly http =
    inject(HttpClient);

  private readonly search$ =
    new Subject<string>();

  private readonly cancelInFlightSubmit$ =
    new Subject<void>();

  private readonly cancelPreview$ =
    new Subject<void>();

  @Input({ required: true })
  kind!: AssetVersionParentKind;

  @Input({ required: true })
  slug!: string;

  @Input({ required: true })
  i18nPrefix!: string;

  @Input({ required: true })
  sectionTitleKey!: string;

  @Input({ required: true })
  assetId!: number;

  readonly list =
    signal<AssetVersion[]>([]);

  readonly total =
    signal(0);

  readonly page =
    signal(1);

  readonly pageSize =
    signal(DEFAULT_PAGE_SIZE);

  readonly loading =
    signal(false);

  readonly saving =
    signal(false);

  readonly downloadingId =
    signal<number | null>(null);

  readonly searchTerm =
    signal('');

  readonly selectedFileName =
    signal<string | null>(null);

  private selectedFile:
    File | null = null;

  readonly versionModalOpen =
    signal(false);

  readonly versionModalTitleKey =
    signal('');

  readonly modalMode =
    signal<'create' | 'edit'>('create');

  readonly editingId =
    signal<number | null>(null);

  readonly previewingVersion =
    signal<AssetVersion | null>(null);

  readonly previewPreviousVersion =
    signal<AssetVersion | null>(null);

  readonly previewOriginalText =
    signal<string | null>(null);

  readonly previewModifiedText =
    signal<string | null>(null);

  readonly previewDiffLoading =
    signal(false);

  readonly form =
    this.fb.nonNullable.group({
      name: [
        '',
        [Validators.required],
      ],
      summary: [
        '',
        [Validators.required],
      ],
    });

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.page.set(1);
        this.loadList();
      });

    this.loadList();
  }

  onSearchInput(
    value: string,
  ): void {
    this.search$.next(value);
  }

  loadList(): void {
    if (!this.slug) {
      return;
    }

    this.loading.set(true);

    this.assetVersionsService
      .list(
        this.kind,
        this.slug,
        {
          page: this.page(),
          page_size: this.pageSize(),
          search:
            this.searchTerm() ||
            undefined,
        },
      )
      .subscribe({
        next: (res) => {
          this.list.set(
            res.results,
          );

          this.total.set(
            res.count,
          );

          this.loading.set(false);
        },

        error: () => {
          this.loading.set(false);

          this.message.error(
            this.translate.instant(
              `${this.i18nPrefix}.MESSAGES.LOAD_ERROR`,
            ),
          );
        },
      });
  }

  onPageChange(
    p: number,
  ): void {
    this.page.set(p);
    this.loadList();
  }

  onPageSizeChange(
    size: number,
  ): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.loadList();
  }

  canMutateVersions(): boolean {
    switch (this.kind) {
      case 'tafsir':
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_UPDATE_TAFSIR,
        );

      case 'mushaf':
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_UPDATE_MUSHAF,
        );

      case 'font':
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_UPDATE_FONT,
        );

      case 'program':
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_UPDATE_PROGRAM,
        );

      case 'translation':
      default:
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_UPDATE_TRANSLATION,
        );
    }
  }

  canDeleteVersions(): boolean {
    switch (this.kind) {
      case 'tafsir':
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_DELETE_TAFSIR,
        );

      case 'mushaf':
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_DELETE_MUSHAF,
        );

      case 'font':
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_DELETE_FONT,
        );

      case 'program':
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_DELETE_PROGRAM,
        );

      case 'translation':
      default:
        return this.adminAuth.hasPermission(
          PORTAL_PERMISSIONS.PORTAL_DELETE_TRANSLATION,
        );
    }
  }

  openPreview(
    row: AssetVersion,
  ): void {
    this.cancelPreview$.next();

    this.previewingVersion.set(
      row,
    );

    this.previewPreviousVersion.set(
      null,
    );

    this.previewOriginalText.set(
      null,
    );

    this.previewModifiedText.set(
      null,
    );

    this.previewDiffLoading.set(
      false,
    );

    this.previewDiffLoading.set(
      true,
    );

    this.assetVersionsService
      .listAll(
        this.kind,
        this.slug,
      )
      .pipe(
        takeUntil(
          this.cancelPreview$,
        ),
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          const previousVersion =
            this.findPreviousVersion(
              row,
              response.results,
            );

          this.previewPreviousVersion.set(
            previousVersion,
          );

          if (
            !previousVersion ||
            !row.file_url ||
            !this.isTextPreviewable(row.file_url) ||
            !previousVersion.file_url ||
            !this.isTextPreviewable(previousVersion.file_url)
          ) {
            this.previewDiffLoading.set(false);
            return;
          }

          this.loadTextDiff(row, previousVersion);
        },

        error: () => {
          this.previewPreviousVersion.set(
            null,
          );

          this.previewOriginalText.set(
            null,
          );

          this.previewModifiedText.set(
            null,
          );

          this.previewDiffLoading.set(
            false,
          );
        },
      });
  }

  private findPreviousVersion(
    current: AssetVersion,
    versions: AssetVersion[],
  ): AssetVersion | null {
    const orderedVersions = [...versions].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    );

    const currentIndex = orderedVersions.findIndex(
      (version) => version.id === current.id,
    );

    if (
      currentIndex === -1 ||
      currentIndex >= orderedVersions.length - 1
    ) {
      return null;
    }

    return orderedVersions[currentIndex + 1] ?? null;
  }

  private loadTextDiff(
    current: AssetVersion,
    previous: AssetVersion,
  ): void {
    this.previewDiffLoading.set(true);

    forkJoin({
      original: this.http.get(previous.file_url, {
        responseType: 'text',
      }),
      modified: this.http.get(current.file_url, {
        responseType: 'text',
      }),
    })
      .pipe(
        takeUntil(this.cancelPreview$),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ original, modified }) => {
          this.previewOriginalText.set(original);
          this.previewModifiedText.set(modified);
          this.previewDiffLoading.set(false);
        },

        error: () => {
          this.previewOriginalText.set(null);
          this.previewModifiedText.set(null);
          this.previewDiffLoading.set(false);
        },
      });
  }

  private isTextPreviewable(
    fileUrl: string | null | undefined,
  ): boolean {
    if (!fileUrl) {
      return false;
    }

    const cleanUrl =
      fileUrl
        .split('?')[0]
        .split('#')[0];

    const fileName =
      cleanUrl
        .split('/')
        .pop() ?? '';

    const extension =
      fileName
        .split('.')
        .pop()
        ?.toLowerCase() ??
      '';

    return [
      'txt',
      'md',
      'text',
      'json',
      'xml',
      'yaml',
      'yml',
      'ts',
      'js',
      'jsx',
      'tsx',
      'html',
      'css',
      'less',
      'scss',
      'sql',
      'sh',
      'bash',
    ].includes(
      extension,
    );
  }

  closePreview(): void {
    this.cancelPreview$.next();

    this.previewingVersion.set(
      null,
    );

    this.previewPreviousVersion.set(
      null,
    );

    this.previewOriginalText.set(
      null,
    );

    this.previewModifiedText.set(
      null,
    );

    this.previewDiffLoading.set(
      false,
    );
  }

  openCreateModal(): void {
    if (!this.canMutateVersions()) {
      return;
    }

    this.modalMode.set(
      'create',
    );

    this.editingId.set(
      null,
    );

    this.form.reset({
      name: '',
      summary: '',
    });

    this.clearFile();

    this.versionModalTitleKey.set(
      `${this.i18nPrefix}.MODAL_TITLE_CREATE`,
    );

    this.versionModalOpen.set(
      true,
    );
  }

  openEditModal(
    row: AssetVersion,
  ): void {
    if (!this.canMutateVersions()) {
      return;
    }

    this.modalMode.set(
      'edit',
    );

    this.editingId.set(
      row.id,
    );

    this.form.patchValue({
      name: row.name,
      summary:
        row.summary ?? '',
    });

    this.clearFile();

    this.versionModalTitleKey.set(
      `${this.i18nPrefix}.MODAL_TITLE_EDIT`,
    );

    this.versionModalOpen.set(
      true,
    );
  }

  onVersionModalVisibleChange(
    visible: boolean,
  ): void {
    this.versionModalOpen.set(
      visible,
    );

    if (!visible) {
      this.abortInFlightSave();
      this.resetModalFormState();
    }
  }

  closeVersionModal(): void {
    this.abortInFlightSave();

    this.versionModalOpen.set(
      false,
    );

    this.resetModalFormState();
  }

  private abortInFlightSave(): void {
    this.cancelInFlightSubmit$.next();
  }

  private resetModalFormState(): void {
    this.editingId.set(
      null,
    );

    this.form.reset({
      name: '',
      summary: '',
    });

    this.clearFile();
  }

  onPickFile(
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] ??
      null;

    input.value = '';

    if (!file) {
      return;
    }

    this.selectedFile =
      file;

    this.selectedFileName.set(
      file.name,
    );
  }

  clearFile(): void {
    this.selectedFile =
      null;

    this.selectedFileName.set(
      null,
    );
  }

  submit(): void {
    if (!this.canMutateVersions()) {
      return;
    }

    if (this.form.invalid) {
      Object.values(
        this.form.controls,
      ).forEach((control) => {
        control.markAsDirty();

        control.updateValueAndValidity({
          onlySelf: true,
        });
      });

      return;
    }

    const id =
      this.editingId();

    if (
      id == null &&
      !this.selectedFile
    ) {
      this.message.warning(
        this.translate.instant(
          `${this.i18nPrefix}.MESSAGES.FILE_REQUIRED`,
        ),
      );

      return;
    }

    const payload = {
      asset_id: this.assetId,
      name:
        this.form.getRawValue()
          .name,
      summary:
        this.form.getRawValue()
          .summary,
      file:
        this.selectedFile ??
        undefined,
    };

    this.abortInFlightSave();

    this.saving.set(true);

    const req$ =
      id == null
        ? this.assetVersionsService.create(
            this.kind,
            this.slug,
            payload,
          )
        : this.assetVersionsService.update(
            this.kind,
            this.slug,
            id,
            payload,
          );

    req$
      .pipe(
        takeUntil(
          this.cancelInFlightSubmit$,
        ),
        finalize(() =>
          this.saving.set(
            false,
          ),
        ),
      )
      .subscribe({
        next: () => {
          const msgKey =
            id == null
              ? `${this.i18nPrefix}.MESSAGES.CREATE_SUCCESS`
              : `${this.i18nPrefix}.MESSAGES.UPDATE_SUCCESS`;

          this.message.success(
            this.translate.instant(
              msgKey,
            ),
          );

          this.closeVersionModalWithoutCancelEmit();

          this.loadList();
        },

        error: (
          err: unknown,
        ) => {
          if (
            err instanceof
              HttpErrorResponse &&
            err.status === 0
          ) {
            return;
          }

          this.message.error(
            this.translate.instant(
              `${this.i18nPrefix}.MESSAGES.SAVE_ERROR`,
            ),
          );
        },
      });
  }

  private closeVersionModalWithoutCancelEmit(): void {
    this.versionModalOpen.set(
      false,
    );

    this.resetModalFormState();
  }

  deleteRow(
    row: AssetVersion,
  ): void {
    if (!this.canDeleteVersions()) {
      return;
    }

    const dir =
      this.translate.currentLang ===
      'ar'
        ? 'rtl'
        : 'ltr';

    this.modal.confirm({
      nzTitle:
        this.translate.instant(
          `${this.i18nPrefix}.DELETE_CONFIRM_TITLE`,
        ),

      nzContent:
        this.translate.instant(
          `${this.i18nPrefix}.DELETE_CONFIRM_BODY`,
          {
            name: row.name,
          },
        ),

      nzOkText:
        this.translate.instant(
          `${this.i18nPrefix}.DELETE_OK`,
        ),

      nzOkType:
        'primary',

      nzOkDanger:
        true,

      nzCancelText:
        this.translate.instant(
          'ADMIN.COMMON.CANCEL',
        ),

      nzDirection:
        dir,

      nzOnOk: () =>
        new Promise<void>(
          (
            resolve,
            reject,
          ) => {
            this.assetVersionsService
              .delete(
                this.kind,
                this.slug,
                row.id,
              )
              .subscribe({
                next: () => {
                  this.message.success(
                    this.translate.instant(
                      `${this.i18nPrefix}.MESSAGES.DELETE_SUCCESS`,
                    ),
                  );

                  if (
                    this.versionModalOpen() &&
                    this.editingId() ===
                      row.id
                  ) {
                    this.closeVersionModal();
                  }

                  this.loadList();

                  resolve();
                },

                error: () => {
                  this.message.error(
                    this.translate.instant(
                      `${this.i18nPrefix}.MESSAGES.DELETE_ERROR`,
                    ),
                  );

                  reject();
                },
              });
          },
        ),
    });
  }

  /** Download a version's content (CSV of its per-ayah entries, or its file). */
  downloadVersion(
    row: AssetVersion,
  ): void {
    if (this.downloadingId() !== null) {
      return;
    }

    this.downloadingId.set(
      row.id,
    );

    this.assetContentService
      .exportVersion(
        this.kind,
        this.slug,
        row.id,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (blob) => {
          const url =
            URL.createObjectURL(blob);

          this.triggerDownload(
            url,
            `${this.slug}-${row.name}.csv`.replace(
              /\s+/g,
              '_',
            ),
          );

          URL.revokeObjectURL(url);

          this.downloadingId.set(
            null,
          );
        },

        error: () => {
          if (row.file_url) {
            this.triggerDownload(
              row.file_url,
              `${this.slug}-${row.name}`.replace(
                /\s+/g,
                '_',
              ),
            );

            this.downloadingId.set(
              null,
            );

            return;
          }

          this.message.error(
            this.translate.instant(
              'ADMIN.CONTENT_EDITOR.ERRORS.GENERIC',
            ),
          );

          this.downloadingId.set(
            null,
          );
        },
      });
  }

  private triggerDownload(
    href: string,
    filename: string,
  ): void {
    const anchor =
      document.createElement('a');

    anchor.href = href;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.click();
  }

  formatBytes(
    n:
      | number
      | null
      | undefined,
  ): string {
    if (
      n == null ||
      n <= 0
    ) {
      return this.translate.instant(
        'COMMON.EM_DASH',
      );
    }

    if (n < 1024) {
      return `${n} B`;
    }

    if (
      n <
      1024 * 1024
    ) {
      return `${(
        n / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      n /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  }

  truncate(
    text:
      | string
      | null
      | undefined,
    max = 80,
  ): string {
    if (
      text == null ||
      text === ''
    ) {
      return this.translate.instant(
        'COMMON.EM_DASH',
      );
    }

    const t =
      text.trim();

    if (
      t.length <= max
    ) {
      return t;
    }

    return `${t.slice(
      0,
      max,
    )}…`;
  }

  t(
    key: string,
  ): string {
    return `${this.i18nPrefix}.${key}`;
  }

  modalDirection():
    'rtl' | 'ltr' {
    return this.translate.currentLang ===
      'ar'
      ? 'rtl'
      : 'ltr';
  }
}
