import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { resolveApiErrorMessage } from '../../../../../shared/utils/api-error-resolver.util';
import { isRestrictedForTenantConflictError } from '../../../../../shared/utils/error.utils';
import { AssetInitialVersionFieldsComponent } from '../../../components/asset-initial-version-fields/asset-initial-version-fields.component';
import { PublisherFilterItem } from '../../../tafsirs/models/tafsirs.models';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import {
  createDisplayLocalizationLabels,
  localizeLanguageCode,
} from '../../../utils/display-localization.util';
import { FontFormValue } from '../../models/fonts.models';
import { FontsService } from '../../services/fonts.service';

@Component({
  selector: 'app-font-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NgIcon,
    NzInputModule,
    NzSelectModule,
    NzSkeletonModule,
    NzSwitchModule,
    NzUploadModule,
    NzToolTipModule,
    TranslateModule,
    AssetInitialVersionFieldsComponent,
  ],
  templateUrl: './font-form.component.html',
  styleUrl: './font-form.component.less',
})
export class FontFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly fontsService = inject(FontsService);
  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly isEditMode = signal(false);
  readonly loadingDetail = signal(false);
  readonly submitting = signal(false);
  readonly publisherOptions = signal<PublisherFilterItem[]>([]);
  readonly publishersLoading = signal(false);
  readonly thumbnailFile = signal<File | null>(null);
  readonly thumbnailPreview = signal<string | null>(null);
  readonly fileList = signal<NzUploadFile[]>([]);
  readonly versionFile = signal<File | null>(null);

  readonly licenseOptions = Object.values(Licenses);

  readonly form = this.fb.group({
    name_ar: ['', [Validators.required, Validators.minLength(2)]],
    name_en: [''],
    description_ar: ['', [Validators.required]],
    description_en: ['', [Validators.required]],
    long_description_ar: ['', [Validators.required]],
    long_description_en: ['', [Validators.required]],
    license: ['', [Validators.required]],
    language: ['', [Validators.required]],
    publisher_id: [null as number | null, [Validators.required]],
    is_external: [false],
    external_url: [''],
    is_open_access: [false],
    restricted_for_tenant: [false],
    version_name: [''],
    version_summary: [''],
  });

  private editSlug: string | null = null;

  ngOnInit(): void {
    const slugParam = this.route.snapshot.params['slug'];
    if (slugParam) {
      this.isEditMode.set(true);
      this.editSlug = slugParam;
      this.loadForEdit();
    } else {
      this.form.controls.version_name.setValidators([
        Validators.required,
        Validators.maxLength(255),
      ]);
      this.form.controls.version_summary.setValidators([Validators.required]);
      this.form.controls.version_name.updateValueAndValidity();
      this.form.controls.version_summary.updateValueAndValidity();
    }
    this.loadPublishers();
  }

  onPublisherSearch(query: string): void {
    this.loadPublishers(query);
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    const raw = file as unknown as File;
    this.thumbnailFile.set(raw);
    this.fileList.set([file]);

    const reader = new FileReader();
    reader.onload = (e) => {
      this.thumbnailPreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(raw);

    return false;
  };

  removeThumbnail(): void {
    this.thumbnailFile.set(null);
    this.thumbnailPreview.set(null);
    this.fileList.set([]);
  }

  canSubmit(): boolean {
    if (this.form.invalid) return false;
    if (!this.isEditMode() && !this.versionFile()) return false;
    return true;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    if (!this.isEditMode() && !this.versionFile()) {
      this.message.warning(
        this.translate.instant('ADMIN.COMMON.INITIAL_VERSION.MESSAGES.FILE_REQUIRED')
      );
      return;
    }

    const body = this.buildBody();
    this.submitting.set(true);

    const request$ =
      this.isEditMode() && this.editSlug != null
        ? this.fontsService.patch(this.editSlug, body)
        : this.fontsService.create(body as FontFormValue);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.message.success(
          this.translate.instant(
            this.isEditMode()
              ? 'ADMIN.FONTS.MESSAGES.UPDATE_SUCCESS'
              : 'ADMIN.FONTS.MESSAGES.CREATE_SUCCESS'
          )
        );
        this.submitting.set(false);
        void this.router.navigate(['/admin/fonts', res.slug]);
      },
      error: (error) => {
        this.submitting.set(false);
        if (isRestrictedForTenantConflictError(error)) {
          this.message.error(
            resolveApiErrorMessage(
              error,
              { fallbackKey: 'ERRORS.RESTRICTED_FOR_TENANT_CONFLICT' },
              this.translate
            )
          );
        }
      },
    });
  }

  private buildBody(): FontFormValue {
    const v = this.form.getRawValue();
    const body: FontFormValue = {
      name_ar: v.name_ar ?? '',
      name_en: v.name_en ?? '',
      description_ar: v.description_ar ?? '',
      description_en: v.description_en ?? '',
      long_description_ar: v.long_description_ar ?? '',
      long_description_en: v.long_description_en ?? '',
      license: (v.license ?? '') as Licenses,
      language: v.language ?? '',
      publisher_id: v.publisher_id!,
      is_external: v.is_external ?? false,
      is_open_access: v.is_open_access ?? false,
      restricted_for_tenant: v.restricted_for_tenant ?? false,
      external_url: v.external_url || null,
      thumbnail: this.thumbnailFile() ?? undefined,
    };

    if (!this.isEditMode()) {
      body.version_name = v.version_name ?? '';
      body.version_summary = v.version_summary ?? '';
      body.file = this.versionFile() ?? undefined;
    }

    return body;
  }

  private loadForEdit(): void {
    if (this.editSlug == null) return;
    this.loadingDetail.set(true);
    this.fontsService
      .getDetail(this.editSlug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.form.patchValue({
            name_ar: data.name_ar,
            name_en: data.name_en,
            description_ar: data.description_ar,
            description_en: data.description_en,
            long_description_ar: data.long_description_ar,
            long_description_en: data.long_description_en,
            license: data.license,
            language: data.language ?? '',
            publisher_id: data.publisher.id,
            is_external: data.is_external,
            is_open_access: data.is_open_access,
            restricted_for_tenant: data.restricted_for_tenant,
            external_url: data.external_url ?? '',
          });

          if (data.thumbnail_url) {
            this.thumbnailPreview.set(data.thumbnail_url);
          }

          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
        },
      });
  }

  private loadPublishers(query = ''): void {
    this.publishersLoading.set(true);
    this.publishersFilterService
      .search(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.publisherOptions.set(res.results);
          this.publishersLoading.set(false);
        },
        error: () => {
          this.publishersLoading.set(false);
        },
      });
  }

  languageLabel(code: string): string {
    return localizeLanguageCode(
      code,
      this.translate.currentLang,
      createDisplayLocalizationLabels(this.translate)
    );
  }
}
