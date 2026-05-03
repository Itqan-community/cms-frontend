import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import { RegisterRequest } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';
import { buildHeadlessOAuthCallbackUrl } from '../../utils/auth-route-query.util';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LangSwitchComponent,
    NgIcon,
  ],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.less'],
})
export class RegisterPage {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  get oauthCallbackUrl(): string {
    return buildHeadlessOAuthCallbackUrl(this.activatedRoute);
  }

  onSignUpWithGoogle(): void {
    void this.authService.startGoogleOAuth(this.oauthCallbackUrl, 'login');
  }

  onSignUpWithGitHub(): void {
    void this.authService.startGitHubOAuth(this.oauthCallbackUrl, 'login');
  }

  registerForm: FormGroup;
  errorMessage = signal<string>('');
  passkeyAvailable = signal(false);

  constructor() {
    this.passkeyAvailable.set(isPasskeyClientEnvironmentSupported());
    this.registerForm = this.fb.group(
      {
        first_name: ['', [Validators.required]],
        last_name: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        phone: [''],
        title: [''],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordVisible = signal(false);
  confirmPasswordVisible = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.set(!this.confirmPasswordVisible());
  }

  private passwordMatchValidator(group: FormGroup) {
    return group.get('password')?.value === group.get('confirmPassword')?.value
      ? null
      : { passwordMismatch: true };
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
          if (error instanceof HttpErrorResponse) {
            if (tryNavigateForAuth401(this.router, error)) {
              return;
            }
            this.errorMessage.set(
              getErrorMessage(error) ||
                this.translate.instant('AUTH.REGISTER.ERRORS.REGISTER_FAILED')
            );
            return;
          }
          this.errorMessage.set(
            getErrorMessage(error) || this.translate.instant('AUTH.REGISTER.ERRORS.REGISTER_FAILED')
          );
        },
      });
    }
  }
}
