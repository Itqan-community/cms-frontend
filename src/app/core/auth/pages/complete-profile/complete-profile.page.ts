import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { UpdateProfileRequest } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-complete-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NzButtonComponent],
  templateUrl: './complete-profile.page.html',
  styleUrls: ['./complete-profile.page.less'],
})
export class CompleteProfilePage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  profileForm: FormGroup;
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  constructor() {
    this.profileForm = this.fb.group({
      bio: ['', [Validators.required, Validators.minLength(20)]],
      project_url: [''],
      project_summary: [''],
    });
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.errorMessage.set('');
      this.isLoading.set(true);

      const profileData: UpdateProfileRequest = {
        bio: this.profileForm.value.bio,
        project_summary: this.profileForm.value.project_summary || undefined,
        project_url: this.profileForm.value.project_url || undefined,
      };

      this.authService.updateProfile(profileData).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/gallery']);
        },
        error: (error: unknown) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            getErrorMessage(error) || this.translate.instant('ERRORS.SERVER_ERROR')
          );
        },
      });
    }
  }

  handleSkip(): void {
    this.router.navigate(['/gallery']);
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field?.hasError('required')) {
      return this.translate.instant('FORMS.VALIDATION.REQUIRED');
    }
    if (field?.hasError('minlength')) {
      return this.translate.instant('FORMS.VALIDATION.FIELD_TOO_SHORT');
    }
    if (field?.hasError('url')) {
      return this.translate.instant('FORMS.VALIDATION.INVALID_URL');
    }
    return '';
  }
}
