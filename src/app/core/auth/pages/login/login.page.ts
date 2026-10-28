import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { resolveAuthErrorMessage } from '../../../../shared/utils/auth-error-resolver.util';
import { isUnverifiedEmailError } from '../../../../shared/utils/error.utils';
import { AuthSocialActionsComponent } from '../../components/auth-social-actions/auth-social-actions.component';
import { AUTH_ROUTES, tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import {
  isPasskeyAutoPromptCancellation,
  shouldAttemptPasskeyAutoPrompt,
} from '../../headless/passkey-auto-prompt.util';
import { PasskeyAuthFlowService } from '../../headless/passkey-auth.flow';
import { resolvePasskeyFlowError } from '../../headless/passkey-error.util';
import { LoginRequest } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';
import { buildHeadlessOAuthCallbackUrl, readContinueUrl } from '../../utils/auth-route-query.util';

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
    AuthSocialActionsComponent,
  ],
  styleUrls: ['./login.page.less'],
  templateUrl: './login.page.html',
})
export class LoginPage implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  private readonly passkeyFlow = inject(PasskeyAuthFlowService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  private autoPasskeyAttempted = false;
  private passkeyAutofill: AbortController | null = null;

  passwordVisible = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  loginForm: FormGroup;
  errorMessage = signal<string>('');
  passkeyLoading = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      return;
    }
    void shouldAttemptPasskeyAutoPrompt().then((available) => {
      if (available) {
        void this.onPasskeyLogin({ auto: true });
      }
    });
  }

  ngOnDestroy(): void {
    this.passkeyAutofill?.abort();
  }

  /** Allauth `callback_url` for provider redirect (absolute). */
  get oauthCallbackUrl(): string {
    return buildHeadlessOAuthCallbackUrl(this.activatedRoute);
  }

  async onLoginWithGoogle(): Promise<void> {
    this.errorMessage.set('');
    const r = await this.authService.startGoogleOAuth(this.oauthCallbackUrl, 'login');
    if (r.kind === 'error') {
      this.errorMessage.set(r.message || this.translate.instant('AUTH.OAUTH.ERROR'));
    }
  }

  async onLoginWithGitHub(): Promise<void> {
    this.errorMessage.set('');
    const r = await this.authService.startGitHubOAuth(this.oauthCallbackUrl, 'login');
    if (r.kind === 'error') {
      this.errorMessage.set(r.message || this.translate.instant('AUTH.OAUTH.ERROR'));
    }
  }

  async onPasskeyLogin(options?: { auto?: boolean }): Promise<void> {
    const isAuto = options?.auto === true;
    if (isAuto && this.autoPasskeyAttempted) {
      return;
    }
    // Only one WebAuthn request may be pending: a manual login replaces the autofill request.
    this.passkeyAutofill?.abort();
    this.passkeyAutofill = null;
    if (isAuto) {
      this.autoPasskeyAttempted = true;
      this.passkeyAutofill = new AbortController();
    }
    this.errorMessage.set('');
    // Autofill waits indefinitely for the user, so it must not spin the passkey button.
    if (!isAuto) {
      this.passkeyLoading.set(true);
    }
    try {
      const continueUrl = readContinueUrl(this.activatedRoute.snapshot.queryParamMap);
      const result = this.passkeyAutofill
        ? await this.passkeyFlow.loginWithPasskey(continueUrl, {
            signal: this.passkeyAutofill.signal,
          })
        : await this.passkeyFlow.loginWithPasskey(continueUrl);
      if (!result.ok) {
        if (!isAuto || !isPasskeyAutoPromptCancellation(result)) {
          this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.CANCELLED'));
        }
        return;
      }
      void this.router.navigateByUrl(result.nextUrl);
    } catch (e) {
      if (isAuto && isPasskeyAutoPromptCancellation(e)) {
        return;
      }
      const resolution = resolvePasskeyFlowError(e, this.translate, this.router, 'login');
      if (resolution.kind === 'message') {
        this.errorMessage.set(resolution.message);
      }
    } finally {
      if (!isAuto) {
        this.passkeyLoading.set(false);
      }
    }
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
          const nextUrl = readContinueUrl(this.activatedRoute.snapshot.queryParamMap);
          void this.router.navigateByUrl(nextUrl);
        },
        error: (error: unknown) => {
          this.authService.isLoading.set(false);
          if (error instanceof HttpErrorResponse) {
            if (tryNavigateForAuth401(this.router, error)) {
              return;
            }
            if (isUnverifiedEmailError(error)) {
              void this.router.navigate([AUTH_ROUTES.verifyEmail], {
                queryParams: { reason: 'unverified_email' },
              });
              return;
            }
            this.errorMessage.set(
              resolveAuthErrorMessage(
                error,
                { fallbackKey: 'AUTH.LOGIN.ERRORS.LOGIN_FAILED', context: 'login' },
                this.translate
              )
            );
            return;
          }
          this.errorMessage.set(
            resolveAuthErrorMessage(
              error,
              { fallbackKey: 'AUTH.LOGIN.ERRORS.LOGIN_FAILED', context: 'login' },
              this.translate
            )
          );
        },
      });
    }
  }
}
