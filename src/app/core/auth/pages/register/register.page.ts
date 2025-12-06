import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { RegisterRequest } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.less'],
})
export class RegisterPage {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  registerForm: FormGroup;
  errorMessage = signal<string>('');

  constructor() {
    this.registerForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: [''],
      title: [''],
    });
  }

  passwordVisible = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.errorMessage.set('');
      this.authService.isLoading.set(true);

      const registerData: RegisterRequest = {
        name: this.registerForm.value.first_name + ' ' + this.registerForm.value.last_name,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password,
        phone: this.registerForm.value.phone || undefined,
        job_title: this.registerForm.value.title || undefined,
      };

      this.authService.register(registerData).subscribe({
        next: () => {
          this.router.navigate(['/gallery']);
        },
        error: (error: unknown) => {
          this.authService.isLoading.set(false);

          this.errorMessage.set(
            getErrorMessage(error) || this.translate.instant('AUTH.REGISTER.ERRORS.REGISTER_FAILED')
          );
        },
      });
    }
  }
}
