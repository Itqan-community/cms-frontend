import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { PublisherFilterItem, TranslationFormValue } from '../../models/translations.models';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import { TranslationsService } from '../../services/translations.service';

@Component({
  selector: 'app-translation-form',
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
    NzToolTipModule,
    NzUploadModule,
  ],
  templateUrl: './translation-form.component.html',
  styleUrl: './translation-form.component.less',
})
export class TranslationFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translationsService = inject(TranslationsService);
  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEditMode = signal(false);
  readonly loadingDetail = signal(false);
  readonly submitting = signal(false);
  readonly publisherOptions = signal<PublisherFilterItem[]>([]);
  readonly publishersLoading = signal(false);
  readonly thumbnailFile = signal<File | null>(null);
  readonly thumbnailPreview = signal<string | null>(null);
  readonly fileList = signal<NzUploadFile[]>([]);

  readonly licenseOptions = Object.values(Licenses);

  readonly form = this.fb.group({
    name_ar: ['', [Validators.required, Validators.minLength(2)]],
    name_en: ['', [Validators.required, Validators.minLength(2)]],
    description_ar: ['', [Validators.required]],
    description_en: ['', [Validators.required]],
    long_description_ar: ['', [Validators.required]],
    long_description_en: ['', [Validators.required]],
    license: ['', [Validators.required]],
    language: ['', [Validators.required]],
    publisher_id: [null as number | null, [Validators.required]],
    is_external: [false],
    external_url: [''],
  });

  private editSlug: string | null = null;

  ngOnInit(): void {
    const slugParam = this.route.snapshot.params['slug'];
    if (slugParam) {
      this.isEditMode.set(true);
      this.editSlug = slugParam;
      this.loadForEdit();
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

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const body = this.buildBody();
    this.submitting.set(true);

    const request$ =
      this.isEditMode() && this.editSlug != null
        ? this.translationsService.patch(this.editSlug, body)
        : this.translationsService.create(body as TranslationFormValue);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.message.success(
          this.isEditMode() ? 'تم تحديث الترجمة بنجاح' : 'تم إضافة الترجمة بنجاح'
        );
        this.submitting.set(false);
        void this.router.navigate(['/admin/translations', res.id]);
      },
      error: () => {
        this.message.error('حدث خطأ. يرجى المحاولة مرة أخرى.');
        this.submitting.set(false);
      },
    });
  }

  private buildBody(): TranslationFormValue {
    const v = this.form.value;
    return {
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
      external_url: v.external_url || null,
    };
  }

  private loadForEdit(): void {
    if (this.editSlug == null) return;
    this.loadingDetail.set(true);
    this.translationsService
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
            publisher_id: data.publisher.id,
            is_external: data.is_external,
            external_url: data.external_url ?? '',
          });

          if (data.thumbnail_url) {
            this.thumbnailPreview.set(data.thumbnail_url);
          }

          this.loadingDetail.set(false);
        },
        error: () => {
          this.message.error('تعذر تحميل بيانات الترجمة للتعديل.');
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
}
