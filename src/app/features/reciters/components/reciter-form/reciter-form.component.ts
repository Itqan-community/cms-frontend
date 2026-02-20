import { CommonModule } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { ToastService } from '../../../../shared/services/toast.service';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { CreateReciterRequest, Reciter } from '../../models/reciter.model';
import { RecitersService } from '../../services/reciters.service';

@Component({
  selector: 'app-reciter-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    NzButtonComponent,
    NzDatePickerModule,
  ],
  templateUrl: './reciter-form.component.html',
  styleUrls: ['./reciter-form.component.less'],
})
export class ReciterFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recitersService = inject(RecitersService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  reciterCreated = output<Reciter>();

  formVisible = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  reciterForm: FormGroup;

  constructor() {
    this.reciterForm = this.fb.group({
      identifier: ['', [Validators.required]],
      name_ar: ['', [Validators.required]],
      name_en: ['', [Validators.required]],
      nationality: ['', [Validators.required]],
      date_of_birth: [''],
      date_of_death: [''],
      about: [''],
    });
  }

  toggleForm(): void {
    this.formVisible.update((v) => !v);
    if (!this.formVisible()) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.reciterForm.reset();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  onSubmit(): void {
    if (this.reciterForm.invalid) {
      this.reciterForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formValue = this.reciterForm.value;
    const request: CreateReciterRequest = {
      identifier: formValue.identifier,
      name_ar: formValue.name_ar,
      name_en: formValue.name_en,
      nationality: formValue.nationality,
      date_of_birth: formValue.date_of_birth || undefined,
      date_of_death: formValue.date_of_death || undefined,
      about: formValue.about || undefined,
    };

    this.recitersService.createReciter(request).subscribe({
      next: (reciter) => {
        this.isLoading.set(false);
        this.toast.success(this.translate.instant('RECITERS.FORM.SUCCESS'));
        this.reciterCreated.emit(reciter);
        this.reciterForm.reset();
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.toast.error(
          getErrorMessage(error) || this.translate.instant('RECITERS.FORM.ERRORS.CREATE_FAILED')
        );
      },
    });
  }
}
