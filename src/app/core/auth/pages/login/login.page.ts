import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { getGsiGoogle } from '../../headless/google-gsi.types';
import { pathForPendingFlow } from '../../headless/allauth-auth.hooks';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import type { AuthenticatedOrChallenge } from '../../headless/headless-auth-api.service';
import { LoginRequest } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';
import { buildHeadlessOAuthCallbackUrl, readContinueUrl } from '../../utils/auth-route-query.util';
import { isOauthReturnSessionEstablished } from '../../utils/oauth-callback-session.util';

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
export class LoginPage implements OnDestroy {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly activatedRoute = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  readonly googleBtnHost = viewChild<ElementRef<HTMLDivElement>>('googleBtnHost');

  passwordVisible = signal(false);
  passkeyAvailable = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  loginForm: FormGroup;
  errorMessage = signal<string>('');

  private googleMountAttempted = false;

  constructor() {
    this.passkeyAvailable.set(isPasskeyClientEnvironmentSupported());
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
    afterNextRender(() => {
      void this.tryMountGoogleButton();
    });
  }

  ngOnDestroy(): void {
    getGsiGoogle()?.accounts?.id?.cancel?.();
  }

  /** Allauth `callback_url` for provider redirect (absolute). */
  get oauthCallbackUrl(): string {
    return buildHeadlessOAuthCallbackUrl(this.activatedRoute);
  }

  private async tryMountGoogleButton(): Promise<void> {
    if (!this.authService.socialGoogleUseAppTokenConfigured() || this.googleMountAttempted) {
      return;
    }
    const el = this.googleBtnHost()?.nativeElement;
    if (!el) {
      return;
    }
    this.googleMountAttempted = true;
    const lang = localStorage.getItem('lang') ?? undefined;
    await this.authService.mountGoogleSignInButton(el, 'login', {
      locale: lang === 'ar' ? 'ar' : 'en',
      onNext: (envelope: AuthenticatedOrChallenge) => this.onGoogleAppTokenResult(envelope),
      onError: (m) => this.errorMessage.set(m),
    });
  }

  private onGoogleAppTokenResult(envelope: AuthenticatedOrChallenge): void {
    this.errorMessage.set('');
    this.authService.navigateAfterGoogleAppTokenLogin(
      this.activatedRoute.snapshot.queryParamMap,
      envelope
    );
    if (!pathForPendingFlow(envelope) && !isOauthReturnSessionEstablished(envelope)) {
      this.errorMessage.set(this.translate.instant('AUTH.OAUTH.ERROR'));
    }
  }

  async onLoginWithGoogle(): Promise<void> {
    this.errorMessage.set('');
    if (this.authService.socialGoogleUseAppTokenConfigured()) {
      return;
    }
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
