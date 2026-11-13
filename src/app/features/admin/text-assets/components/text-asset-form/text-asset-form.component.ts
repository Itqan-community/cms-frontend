import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { AssetTag, TextAssetFormValue } from '../../models/text-assets.models';
import { AssetTagsService } from '../../services/asset-tags.service';
import { TextAssetsService } from '../../services/text-assets.service';
import { AssetChannelsFieldsComponent } from '../../../components/asset-channels/asset-channels.component';
import {
  confirmChannelChange,
  getChannelConsumersConflict,
} from '../../../utils/asset-channels.util';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { MushafLayoutsService } from '../../../services/mushaf-layouts.service';
import { AssetTemplate, MushafLayout } from '../../../models/asset-content.models';
import {
  createDisplayLocalizationLabels,
  localizeLanguageCode,
} from '../../../utils/display-localization.util';
import { versionNumberValidator } from '../../../utils/version-number.util';
import { resolveApiErrorMessage } from '../../../../../shared/utils/api-error-resolver.util';
import { AssetInitialVersionFieldsComponent } from '../../../components/asset-initial-version-fields/asset-initial-version-fields.component';
import { AiTranslateActionsComponent } from '../../../components/ai-translate-actions/ai-translate-actions.component';
import { assetSlugValidators } from '../../../utils/asset-slug.util';

@Component({
  selector: 'app-text-asset-form',
  standalone: true,
  imports: [
    AssetChannelsFieldsComponent,
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NgIcon,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSkeletonModule,
    NzSwitchModule,
    NzUploadModule,
    NzToolTipModule,
    TranslateModule,
    AiTranslateActionsComponent,
    AssetInitialVersionFieldsComponent,
  ],
  templateUrl: './text-asset-form.component.html',
  styleUrl: './text-asset-form.component.less',
})
export class TextAssetFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly textAssetsService = inject(TextAssetsService);
  private readonly tenantService = inject(AdminTenantService);
  private readonly layoutsService = inject(MushafLayoutsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private readonly assetTagsService = inject(AssetTagsService);

  readonly tagOptions = signal<AssetTag[]>([]);
  readonly tagsLoading = signal(false);
  /** The backend's message when the tag list failed to load; the select offers a retry. */
  readonly tagsError = signal<string | null>(null);

  readonly isEditMode = signal(false);
  readonly loadingDetail = signal(false);
  readonly submitting = signal(false);
  readonly publisherDisplayName = signal('');
  readonly thumbnailFile = signal<File | null>(null);
  readonly thumbnailPreview = signal<string | null>(null);
  readonly fileList = signal<NzUploadFile[]>([]);
  readonly versionFile = signal<File | null>(null);
  readonly layouts = signal<MushafLayout[]>([]);

  readonly licenseOptions = Object.values(Licenses);

  readonly form = this.fb.group({
    name_ar: ['', [Validators.required, Validators.minLength(2)]],
    name_en: [''],
    description_ar: ['', [Validators.required]],
    description_en: ['', [Validators.required]],
    long_description_ar: [''],
    long_description_en: [''],
    license: ['', [Validators.required]],
    language: ['', [Validators.required]],
    publisher_id: [null as number | null, [Validators.required]],
    is_external: [false],
    external_url: [''],
    is_open_access: [false],
    in_gallery: [true],
    in_public_api: [true],
    in_cli: [true],
    in_tenants: [true],
    is_draft: [false],
    /** Tag slugs; the first one prefixes the package name. */
    tags: [[] as string[], [Validators.required]],
    template: [null as AssetTemplate | null, [Validators.required]],
    mushaf_layout_id: [null as number | null],
    version_name_en: [''],
    version_name_ar: [''],
    version_number: ['', [versionNumberValidator]],
    version_summary_en: [''],
    version_summary_ar: [''],
    /** Filled by the AI translate actions; sent on create only. */
    slug: [''],
  });

  /** A first version's number is required once a file is attached to the create form. */
  private readonly versionNumberRequired = effect(() => {
    const control = this.form.controls.version_number;
    control.setValidators(
      this.versionFile() ? [Validators.required, versionNumberValidator] : [versionNumberValidator]
    );
    control.updateValueAndValidity();
  });

  private editSlug: string | null = null;

  private readonly selectedTags = toSignal(this.form.controls.tags.valueChanges, {
    initialValue: [] as string[],
  });

  /** Templates a text asset can be created with; the group ones need the tafsir tag. */
  readonly templateOptions = computed<AssetTemplate[]>(() => {
    const base: AssetTemplate[] = ['surah', 'ayah', 'word', 'page'];
    return (this.selectedTags() ?? []).includes('tafsir')
      ? [...base, 'ayah_group', 'word_group']
      : base;
  });

  readonly layoutsLoading = signal(false);
  readonly layoutsError = signal(false);

  ngOnInit(): void {
    this.loadLayouts();
    this.loadTags();

    this.form.controls.template.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((template) => {
        const layout = this.form.controls.mushaf_layout_id;
        layout.setValidators(template === 'page' ? [Validators.required] : []);
        if (template !== 'page') {
          layout.setValue(null);
        }
        layout.updateValueAndValidity();
      });

    const slugParam = this.route.snapshot.params['slug'];
    if (slugParam) {
      this.isEditMode.set(true);
      this.editSlug = slugParam;
      this.loadForEdit();
      this.form.controls.template.disable();
      this.form.controls.mushaf_layout_id.disable();
    } else {
      for (const control of [
        this.form.controls.version_name_en,
        this.form.controls.version_name_ar,
      ]) {
        control.setValidators([Validators.maxLength(255)]);
        control.updateValueAndValidity();
      }
      // The package name starts with the first tag (`tafsir-…`), so the rule follows the tags.
      this.form.controls.tags.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((tags) => this.setSlugRule(tags?.[0] ?? null));
      this.setSlugRule(null);
      this.bindTenantPublisher();
    }
  }

  private setSlugRule(prefix: string | null): void {
    const slug = this.form.controls.slug;
    slug.setValidators(prefix ? assetSlugValidators(prefix) : [Validators.required]);
    slug.updateValueAndValidity();
  }

  loadTags(): void {
    this.tagsLoading.set(true);
    this.tagsError.set(null);
    this.assetTagsService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tags) => {
          this.tagOptions.set(tags);
          this.tagsLoading.set(false);
        },
        error: (error: unknown) => {
          this.tagsLoading.set(false);
          this.tagsError.set(
            resolveApiErrorMessage(
              error,
              { fallbackKey: 'ADMIN.TEXT_ASSETS.FORM.TAGS_LOAD_ERROR' },
              this.translate
            )
          );
        },
      });
  }

  loadLayouts(): void {
    this.layoutsLoading.set(true);
    this.layoutsError.set(false);
    this.layoutsService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (layouts) => {
          this.layouts.set(layouts);
          this.layoutsLoading.set(false);
        },
        error: () => {
          this.layoutsLoading.set(false);
          this.layoutsError.set(true);
        },
      });
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
    return this.form.valid;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.save(this.buildBody());
  }

  private save(body: TextAssetFormValue, confirmed = false): void {
    if (confirmed) body = { ...body, confirm_channel_change: true };
    this.submitting.set(true);

    const request$ =
      this.isEditMode() && this.editSlug != null
        ? this.textAssetsService.patch(this.editSlug, body)
        : this.textAssetsService.create(body as TextAssetFormValue);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.message.success(
          this.translate.instant(
            this.isEditMode()
              ? 'ADMIN.TEXT_ASSETS.MESSAGES.UPDATE_SUCCESS'
              : 'ADMIN.TEXT_ASSETS.MESSAGES.CREATE_SUCCESS'
          )
        );
        this.submitting.set(false);
        void this.router.navigate(['/admin/text-assets', res.slug]);
      },
      error: (error) => {
        this.submitting.set(false);
        // Ask once: a confirmed save that still conflicts shows the backend's message.
        const conflict = confirmed ? null : getChannelConsumersConflict(error);
        if (conflict) {
          confirmChannelChange(this.modal, this.translate, conflict, () => this.save(body, true));
          return;
        }
        this.message.error(
          resolveApiErrorMessage(error, { fallbackKey: 'ERRORS.REQUEST_FAILED' }, this.translate)
        );
      },
    });
  }

  private buildBody(): TextAssetFormValue {
    const v = this.form.getRawValue();
    const body: TextAssetFormValue = {
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
      in_gallery: v.in_gallery ?? true,
      in_public_api: v.in_public_api ?? true,
      in_cli: v.in_cli ?? true,
      in_tenants: v.in_tenants ?? true,
      status: v.is_draft ? 'draft' : 'ready',
      external_url: v.external_url || null,
      thumbnail: this.thumbnailFile() ?? undefined,
      tags: v.tags ?? [],
    };

    if (!this.isEditMode()) {
      const slug = v.slug?.trim();
      if (slug) body.slug = slug;
      body.template = v.template ?? undefined;
      body.mushaf_layout_id = v.mushaf_layout_id ?? null;

      for (const key of [
        'version_name_en',
        'version_name_ar',
        'version_summary_en',
        'version_summary_ar',
      ] as const) {
        const value = v[key]?.trim();
        if (value) body[key] = value;
      }
      if (this.versionFile()) {
        body.file = this.versionFile()!;
        body.version_number = (v.version_number ?? '').trim();
      }
    }

    return body;
  }

  private bindTenantPublisher(): void {
    const publisherId = this.tenantService.selectedPublisherId();
    const publisher = this.tenantService.publishers().find((p) => p.id === publisherId);
    this.form.controls.publisher_id.setValue(publisherId);
    this.publisherDisplayName.set(publisher?.name ?? '');
  }

  private loadForEdit(): void {
    if (this.editSlug == null) return;
    this.loadingDetail.set(true);
    this.textAssetsService
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
            in_gallery: data.in_gallery,
            in_public_api: data.in_public_api,
            in_cli: data.in_cli,
            in_tenants: data.in_tenants,
            is_draft: data.status === 'draft',
            external_url: data.external_url ?? '',
            template: data.template,
            tags: data.tags.map((tag) => tag.slug),
            mushaf_layout_id: data.mushaf_layout?.id ?? null,
          });
          this.publisherDisplayName.set(data.publisher.name);

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

  languageLabel(code: string): string {
    return localizeLanguageCode(
      code,
      this.translate.currentLang,
      createDisplayLocalizationLabels(this.translate)
    );
  }
}
