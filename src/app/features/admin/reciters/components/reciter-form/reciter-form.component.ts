import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { NATIONALITY } from '../../nationality.enum';
import {
  ReciterDetails,
  ReciterFormValue,
  ReciterListItem,
  ReciterPatchValue,
} from '../../models/reciters.models';
import { RecitersAdminService } from '../../services/reciters.service';
import { localizeCountryCodeOrName } from '../../../utils/display-localization.util';

@Component({
  selector: 'app-reciter-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
    NgIcon,
    NzInputModule,
    NzSelectModule,
    NzSkeletonModule,
    NzUploadModule,
    TranslateModule,
  ],
  templateUrl: './reciter-form.component.html',
  styleUrl: './reciter-form.component.less',
})
export class ReciterFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly recitersService = inject(RecitersAdminService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly isEditMode = signal(false);
  readonly loadingDetail = signal(false);
  readonly submitting = signal(false);
  readonly nationalityOptions = Object.values(NATIONALITY);
  readonly imageFile = signal<File | null>(null);
  readonly imagePreview = signal<string | null>(null);
  readonly imageFileList = signal<NzUploadFile[]>([]);

  readonly form = this.fb.group({
    name_ar: ['', [Validators.required, Validators.minLength(2)]],
    name_en: [''],
    bio_ar: [''],
    bio_en: [''],
    nationality: [''],
    date_of_death: this.fb.control<Date | null>(null),
  });

  private editSlug: string | null = null;
  private originalSnapshot: ReciterFormValue | null = null;

  ngOnInit(): void {
    const slugParam = this.route.snapshot.params['slug'];
    if (slugParam) {
      this.isEditMode.set(true);
      this.editSlug = slugParam;
      this.loadForEdit();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const v = this.form.value;
    const body: ReciterFormValue = {
      name_ar: v.name_ar ?? '',
      name_en: v.name_en ?? '',
      bio_ar: v.bio_ar ?? '',
      bio_en: v.bio_en ?? '',
      nationality: v.nationality ?? '',
      date_of_death: this.formatDate(v.date_of_death),
      image: this.imageFile() ?? undefined,
    };

    if (this.isEditMode() && this.editSlug != null) {
      const patch = this.buildPatchPayload(body);
      if (Object.keys(patch).length === 0) {
        void this.router.navigate(['/admin/reciters', this.editSlug]);
        return;
      }

      this.submitting.set(true);

      this.recitersService
        .patch(this.editSlug, patch)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res: ReciterDetails) => {
            this.message.success(this.translate.instant('ADMIN.RECITERS.MESSAGES.UPDATE_SUCCESS'));
            this.submitting.set(false);
            void this.router.navigate(['/admin/reciters', res.slug]);
          },
          error: () => {
            this.submitting.set(false);
          },
        });
      return;
    }

    this.submitting.set(true);

    this.recitersService
      .create(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ReciterListItem) => {
          this.message.success(this.translate.instant('ADMIN.RECITERS.MESSAGES.CREATE_SUCCESS'));
          this.submitting.set(false);
          void this.router.navigate(['/admin/reciters', res.slug]);
        },
        error: () => {
          this.submitting.set(false);
        },
      });
  }

  private loadForEdit(): void {
    if (this.editSlug == null) return;
    this.loadingDetail.set(true);
    this.recitersService
      .getDetail(this.editSlug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.originalSnapshot = {
            name_ar: data.name_ar,
            name_en: data.name_en ?? '',
            bio_ar: data.bio_ar ?? '',
            bio_en: data.bio_en ?? '',
            nationality: data.nationality ?? '',
            date_of_death: data.date_of_death ?? null,
          };
          this.form.patchValue({
            name_ar: data.name_ar,
            name_en: data.name_en,
            bio_ar: data.bio_ar,
            bio_en: data.bio_en,
            nationality: data.nationality ?? '',
            date_of_death: data.date_of_death ? new Date(data.date_of_death) : null,
          });
          if (typeof data.image_url === 'string' && data.image_url) {
            this.imagePreview.set(data.image_url);
          }
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
        },
      });
  }

  private buildPatchPayload(current: ReciterFormValue): ReciterPatchValue {
    const original = this.originalSnapshot;
    if (!original) return current;

    const patch: ReciterPatchValue = {};
    if (current.name_ar !== original.name_ar) patch.name_ar = current.name_ar;
    if (current.name_en !== original.name_en) patch.name_en = current.name_en;
    if (current.bio_ar !== original.bio_ar) patch.bio_ar = current.bio_ar;
    if (current.bio_en !== original.bio_en) patch.bio_en = current.bio_en;

    const nationality = current.nationality ?? '';
    if (nationality !== (original.nationality ?? '')) {
      patch.nationality = nationality || null;
    }

    const dateOfDeath = current.date_of_death ?? null;
    if (dateOfDeath !== (original.date_of_death ?? null)) {
      patch.date_of_death = dateOfDeath;
    }

    if (current.image) patch.image = current.image;
    return patch;
  }

  private formatDate(value: Date | null | undefined): string | null {
    if (!value) return null;
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  countryLabel(countryCode: string): string {
    return localizeCountryCodeOrName(countryCode, this.translate.currentLang);
  }

  beforeImageUpload = (file: NzUploadFile): boolean => {
    const raw = file as unknown as File;
    const maxBytes = 10 * 1024 * 1024;
    if (!raw.type.startsWith('image/')) {
      this.message.error(this.translate.instant('ADMIN.RECITERS.FORM.MSG_IMAGE_TYPE'));
      return false;
    }
    if (raw.size > maxBytes) {
      this.message.error(this.translate.instant('ADMIN.RECITERS.FORM.MSG_IMAGE_SIZE'));
      return false;
    }

    this.imageFile.set(raw);
    this.imageFileList.set([file]);

    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.set((e.target?.result as string) ?? null);
    };
    reader.readAsDataURL(raw);
    return false;
  };

  removeImage(): void {
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.imageFileList.set([]);
  }
}
