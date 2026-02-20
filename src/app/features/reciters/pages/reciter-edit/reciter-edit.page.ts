import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { ToastService } from '../../../../shared/services/toast.service';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { UpdateReciterRequest } from '../../models/reciter.model';
import { RecitersService } from '../../services/reciters.service';

@Component({
  selector: 'app-reciter-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NzButtonComponent],
  templateUrl: './reciter-edit.page.html',
  styleUrls: ['./reciter-edit.page.less'],
})
export class ReciterEditPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recitersService = inject(RecitersService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  loading = signal(true);
  saving = signal(false);
  notFound = signal(false);

  reciterId = 0;
  editForm: FormGroup;

  constructor() {
    this.editForm = this.fb.group({
      identifier: ['', [Validators.required]],
      name_ar: ['', [Validators.required]],
      name_en: ['', [Validators.required]],
      nationality: ['', [Validators.required]],
      date_of_birth: [''],
      date_of_death: [''],
      about: [''],
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.reciterId = id;
    this.loadReciter(id);
  }

  private loadReciter(id: number): void {
    this.recitersService.getReciter(id).subscribe({
      next: (reciter) => {
        this.editForm.patchValue({
          identifier: reciter.identifier,
          name_ar: reciter.name_ar,
          name_en: reciter.name_en,
          nationality: reciter.nationality,
          date_of_birth: reciter.date_of_birth || '',
          date_of_death: reciter.date_of_death || '',
          about: reciter.about || '',
        });
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        const status = (error as { status?: number })?.status;
        if (status === 404) {
          this.notFound.set(true);
        } else {
          this.toast.error(
            getErrorMessage(error) ||
              this.translate.instant('RECITERS.EDIT.ERRORS.LOAD_FAILED')
          );
        }
      },
    });
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    const formValue = this.editForm.value;
    const request: UpdateReciterRequest = {
      identifier: formValue.identifier,
      name_ar: formValue.name_ar,
      name_en: formValue.name_en,
      nationality: formValue.nationality,
      date_of_birth: formValue.date_of_birth || null,
      date_of_death: formValue.date_of_death || null,
      about: formValue.about || null,
    };

    this.recitersService.updateReciter(this.reciterId, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.translate.instant('RECITERS.EDIT.SUCCESS'));
        this.router.navigate(['/reciters', this.reciterId]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.toast.error(
          getErrorMessage(error) ||
            this.translate.instant('RECITERS.EDIT.ERRORS.UPDATE_FAILED')
        );
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/reciters', this.reciterId]);
  }
}
