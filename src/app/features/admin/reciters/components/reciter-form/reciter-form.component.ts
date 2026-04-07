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
import { NATIONALITY } from '../../nationality.enum';
import { RecitersAdminService } from '../../services/reciters.service';

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

  readonly isEditMode = signal(false);
  readonly loadingDetail = signal(false);
  readonly submitting = signal(false);
  readonly nationalityOptions = Object.values(NATIONALITY);

  readonly form = this.fb.group({
    name_ar: ['', [Validators.required, Validators.minLength(2)]],
    name_en: ['', [Validators.required, Validators.minLength(2)]],
    bio_ar: [''],
    bio_en: [''],
    nationality: ['', [Validators.required]],
    image_url: [''],
    date_of_death: [''],
  });

  private editId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode.set(true);
      this.editId = Number(idParam);
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
      image_url: v.image_url ?? '',
      date_of_death: v.date_of_death ?? '',
    };

    this.submitting.set(true);

    const request$ =
      this.isEditMode() && this.editId != null
        ? this.recitersService.patch(this.editId, body)
        : this.recitersService.create(body);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.message.success(
          this.isEditMode() ? 'تم تحديث القارئ بنجاح' : 'تم إضافة القارئ بنجاح'
        );
        this.submitting.set(false);
        void this.router.navigate(['/admin/reciters', res.id]);
      },
      error: () => {
        this.message.error('حدث خطأ. يرجى المحاولة مرة أخرى.');
        this.submitting.set(false);
      },
    });
  }

  private loadForEdit(): void {
    if (this.editId == null) return;
    this.loadingDetail.set(true);
    this.recitersService
      .getDetail(this.editId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.form.patchValue({
            name_ar: data.name_ar,
            name_en: data.name_en,
            bio_ar: data.bio_ar,
            bio_en: data.bio_en,
            nationality: data.nationality ?? '',
            image_url: data.image_url ?? '',
            date_of_death: data.date_of_death ?? '',
          });
          this.loadingDetail.set(false);
        },
        error: () => {
          this.message.error('تعذر تحميل بيانات القارئ للتعديل.');
          this.loadingDetail.set(false);
        },
      });
  }
}
