import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NATIONALITY } from '../../nationality.enum';
import { ReciterDetails, ReciterListItem } from '../../models/reciters.models';
import { RecitersAdminService } from '../../services/reciters.service';
import { localizeCountryCodeOrName } from '../../../utils/display-localization.util';

@Component({
  selector: 'app-reciter-form',
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

  readonly form = this.fb.group({
    name_ar: ['', [Validators.required, Validators.minLength(2)]],
    name_en: [''],
    bio_ar: [''],
    bio_en: [''],
    nationality: [''],
    date_of_death: [''],
  });

  private editSlug: string | null = null;

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
    const body = {
      name_ar: v.name_ar ?? '',
      name_en: v.name_en ?? '',
      bio_ar: v.bio_ar ?? '',
      bio_en: v.bio_en ?? '',
      nationality: v.nationality ?? '',
      date_of_death: v.date_of_death || null,
    };

    this.submitting.set(true);

    if (this.isEditMode() && this.editSlug != null) {
      this.recitersService
        .patch(this.editSlug, body)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res: ReciterDetails) => {
            this.message.success('تم تحديث القارئ بنجاح');
            this.submitting.set(false);
            void this.router.navigate(['/admin/reciters', res.slug]);
          },
          error: () => {
            this.submitting.set(false);
          },
        });
      return;
    }

    this.recitersService
      .create(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ReciterListItem) => {
          this.message.success('تم إضافة القارئ بنجاح');
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
          this.form.patchValue({
            name_ar: data.name_ar,
            name_en: data.name_en,
            bio_ar: data.bio_ar,
            bio_en: data.bio_en,
            nationality: data.nationality ?? '',
            date_of_death: data.date_of_death ?? '',
          });
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
        },
      });
  }

  countryLabel(countryCode: string): string {
    return localizeCountryCodeOrName(countryCode, this.translate.currentLang);
  }
}
