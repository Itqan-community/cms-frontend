import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { PublisherFilterItem } from '../../models/tafsirs.models';
import { PublishersFilterService } from '../../services/publishers-filter.service';
import { TafsirsService } from '../../services/tafsirs.service';

@Component({
  selector: 'app-tafsir-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzSkeletonModule,
    NzUploadModule,
  ],
  templateUrl: './tafsir-form.component.html',
  styleUrl: './tafsir-form.component.less',
})
export class TafsirFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly tafsirsService = inject(TafsirsService);
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
  });

  private editId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode.set(true);
      this.editId = Number(idParam);
      this.loadForEdit();
    }
    this.loadPublishers();
  }

  onPublisherSearch(query: string): void {
    this.loadPublishers(query);
  }

  /** nzBeforeUpload: intercept file, prevent auto-upload, generate preview */
  beforeUpload = (file: NzUploadFile): boolean => {
    const raw = file as unknown as File;
    this.thumbnailFile.set(raw);
    this.fileList.set([file]);

    const reader = new FileReader();
    reader.onload = (e) => {
      this.thumbnailPreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(raw);

    return false; // prevent auto-upload
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

    const fd = this.buildFormData();
    this.submitting.set(true);

    const request$ =
      this.isEditMode() && this.editId != null
        ? this.tafsirsService.patch(this.editId, fd)
        : this.tafsirsService.create(fd);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.message.success(this.isEditMode() ? 'تم تحديث التفسير بنجاح' : 'تم إضافة التفسير بنجاح');
        this.submitting.set(false);
        void this.router.navigate(['/admin/tafsirs', res.id]);
      },
      error: () => {
        this.message.error('حدث خطأ. يرجى المحاولة مرة أخرى.');
        this.submitting.set(false);
      },
    });
  }

  private buildFormData(): FormData {
    const v = this.form.value;
    const fd = new FormData();
    fd.append('name_ar', v.name_ar ?? '');
    fd.append('name_en', v.name_en ?? '');
    fd.append('description_ar', v.description_ar ?? '');
    fd.append('description_en', v.description_en ?? '');
    fd.append('long_description_ar', v.long_description_ar ?? '');
    fd.append('long_description_en', v.long_description_en ?? '');
    fd.append('license', v.license ?? '');
    fd.append('language', v.language ?? '');
    fd.append('publisher_id', String(v.publisher_id ?? ''));

    const thumb = this.thumbnailFile();
    if (thumb) {
      fd.append('thumbnail', thumb, thumb.name);
    }
    return fd;
  }

  private loadForEdit(): void {
    if (this.editId == null) return;
    this.loadingDetail.set(true);
    this.tafsirsService
      .getDetail(this.editId)
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
            language: data.language,
            publisher_id: data.publisher.id,
          });

          if (data.thumbnail_url) {
            this.thumbnailPreview.set(data.thumbnail_url);
          }

          this.loadingDetail.set(false);
        },
        error: () => {
          this.message.error('تعذر تحميل بيانات التفسير للتعديل.');
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
