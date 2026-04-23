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
import { LoginRequest } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LangSwitchComponent,
    NgIcon,
  ],
  styleUrls: ['./login.page.less'],
  templateUrl: './login.page.html',
})
export class LoginPage {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  passwordVisible = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  loginForm: FormGroup;
  errorMessage = signal<string>('');

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  /** Allauth `callback_url` for provider redirect (absolute). */
  get oauthCallbackUrl(): string {
    if (typeof window === 'undefined') {
      return '/auth/oauth/callback';
    }
    return `${window.location.origin}/auth/oauth/callback`;
  }

  onLoginWithGoogle(): void {
    this.authService.startGoogleOAuth(this.oauthCallbackUrl, 'login');
  }

  onLoginWithGitHub(): void {
    this.authService.startGitHubOAuth(this.oauthCallbackUrl, 'login');
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.authService.isLoading.set(true);
      this.errorMessage.set('');

      const loginData: LoginRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password,
      };

      this.authService.login(loginData).subscribe({
        next: () => {
          // Get the return URL from query parameters, default to gallery
          const returnUrl =
            (this.activatedRoute.snapshot.queryParams['returnUrl'] as string) || '/gallery';

          // Security: Ensure returnUrl is internal (starts with /)
          if (returnUrl.startsWith('/')) {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/gallery']);
          }
        },
        error: (error: unknown) => {
          this.authService.isLoading.set(false);
          if (error instanceof HttpErrorResponse) {
            if (tryNavigateForAuth401(this.router, error)) {
              return;
            }
            const msg = getErrorMessage(error);
            this.errorMessage.set(msg || this.translate.instant('AUTH.LOGIN.ERRORS.LOGIN_FAILED'));
            return;
          }
          this.errorMessage.set(
            getErrorMessage(error) || this.translate.instant('AUTH.LOGIN.ERRORS.LOGIN_FAILED')
          );
        },
      });
    }
  }
}
