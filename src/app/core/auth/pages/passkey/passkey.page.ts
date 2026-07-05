import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { AuthBackLinkComponent } from '../../components/auth-back-link/auth-back-link.component';
import type {
  AuthenticationMeta,
  WebAuthnCredentialCreationData,
} from '../../headless/headless-api.types';
import { isPasskeyAutoPromptCancellation } from '../../headless/passkey-auto-prompt.util';
import { PasskeyAuthFlowService } from '../../headless/passkey-auth.flow';
import { resolvePasskeyFlowError } from '../../headless/passkey-error.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import {
  getWebAuthnCreationOptions,
  publicKeyCredentialCreationToJson,
} from '../../headless/webauthn.util';
import { AuthService } from '../../services/auth.service';
import { readContinueUrl } from '../../utils/auth-route-query.util';

type PasskeyMode = 'login' | 'signup' | 'setup';

@Component({
  selector: 'app-passkey-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LangSwitchComponent,
    AuthBackLinkComponent,
    NgIcon,
  ],
  styleUrls: ['./passkey.page.less'],
  templateUrl: './passkey.page.html',
})
export class PasskeyPage implements OnInit {
  readonly authService = inject(AuthService);
  private readonly passkeyFlow = inject(PasskeyAuthFlowService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  readonly signupForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  errorMessage = signal<string>('');
  infoMessage = signal<string>('');
  setupNeedsReauthenticate = signal(false);
  isLoading = signal(false);
  passkeyAvailable = signal(true);
  mode = signal<PasskeyMode>('login');
  backRoute = signal<string>('/account/login');
  backLabelKey = signal<string>('AUTH.COMMON.BACK_TO_LOGIN');

  private autoPasskeyAttempted = false;

  ngOnInit(): void {
    this.passkeyAvailable.set(isPasskeyClientEnvironmentSupported());
    const routeData = this.route.snapshot.data ?? {};
    const routeMode = routeData['mode'];
    const queryFlow = this.route.snapshot.queryParamMap.get('flow');
    const urlPath = this.router.url.split('?')[0];
    const inferredSignup =
      urlPath.includes('/signup/passkey') || urlPath.includes('/signup/passkey/create');
    const mode: PasskeyMode =
      routeMode === 'setup'
        ? 'setup'
        : inferredSignup || queryFlow === 'signup'
          ? 'signup'
          : queryFlow === 'login'
            ? 'login'
            : 'login';
    this.mode.set(mode);
    if (mode === 'setup') {
      this.backRoute.set('/gallery');
      this.backLabelKey.set('AUTH.COMMON.BACK_TO_GALLERY');
    } else if (mode === 'signup') {
      this.backRoute.set('/account/signup');
      this.backLabelKey.set('AUTH.COMMON.BACK_TO_SIGNUP');
    } else {
      this.backRoute.set('/account/login');
      this.backLabelKey.set('AUTH.COMMON.BACK_TO_LOGIN');
    }

    const emailQ = this.route.snapshot.queryParamMap.get('email');
    if (emailQ) {
      this.signupForm.patchValue({ email: emailQ });
    }

    if (this.mode() === 'login' && this.authService.isLoggedIn()) {
      void this.router.navigateByUrl('/gallery');
      return;
    }

    if (this.mode() === 'login' && this.passkeyAvailable() && queryFlow === 'login') {
      void this.submitPasskey({ auto: true });
    }
  }

  get titleKey(): string {
    if (this.mode() === 'setup') {
      return 'AUTH.PASSKEY.SETUP_TITLE';
    }
    if (this.mode() === 'signup') {
      return 'AUTH.PASSKEY.SIGNUP_TITLE';
    }
    return 'AUTH.PASSKEY.TITLE';
  }

  get subtitleKey(): string {
    if (this.mode() === 'setup') {
      return 'AUTH.PASSKEY.SETUP_SUBTITLE';
    }
    if (this.mode() === 'signup') {
      return 'AUTH.PASSKEY.SIGNUP_SUBTITLE';
    }
    return 'AUTH.PASSKEY.SUBTITLE';
  }

  get submitKey(): string {
    if (this.mode() === 'setup') {
      return 'AUTH.PASSKEY.SETUP_BUTTON';
    }
    if (this.mode() === 'signup') {
      return 'AUTH.PASSKEY.SIGNUP_BUTTON';
    }
    return 'AUTH.PASSKEY.BUTTON';
  }

  async submitPasskey(options?: { auto?: boolean }): Promise<void> {
    const isAuto = options?.auto === true;
    if (!this.passkeyAvailable()) {
      return;
    }
    if (isAuto && this.autoPasskeyAttempted) {
      return;
    }
    if (isAuto) {
      this.autoPasskeyAttempted = true;
    }
    if (this.mode() === 'signup') {
      this.signupForm.markAllAsTouched();
      if (this.signupForm.invalid) {
        return;
      }
    }
    this.infoMessage.set('');
    this.errorMessage.set('');
    this.setupNeedsReauthenticate.set(false);
    this.isLoading.set(true);
    try {
      const continueUrl = readContinueUrl(this.route.snapshot.queryParamMap);
      if (this.mode() === 'signup') {
        const email = (this.signupForm.value['email'] as string).trim();
        const result = await this.passkeyFlow.signupWithPasskey(email, continueUrl);
        if (!result.ok) {
          this.isLoading.set(false);
          if (result.reason === 'cancelled') {
            if (!isAuto) {
              this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.CANCELLED'));
            }
          } else {
            this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.SIGNUP_SESSION_MISSING'));
          }
          return;
        }
        this.isLoading.set(false);
        void this.router.navigateByUrl(result.nextUrl);
      } else if (this.mode() === 'setup') {
        await this.setupPasskeyAuthenticator();
      } else {
        const result = await this.passkeyFlow.loginWithPasskey(continueUrl);
        if (!result.ok) {
          this.isLoading.set(false);
          if (!isAuto || !isPasskeyAutoPromptCancellation(result)) {
            this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.CANCELLED'));
          }
          return;
        }
        this.isLoading.set(false);
        void this.router.navigateByUrl(result.nextUrl);
      }
    } catch (e) {
      this.isLoading.set(false);
      if (isAuto && isPasskeyAutoPromptCancellation(e)) {
        return;
      }
      const resolution = resolvePasskeyFlowError(
        e,
        this.translate,
        this.router,
        this.mode() === 'setup' ? 'setup' : this.mode() === 'signup' ? 'signup' : 'login'
      );
      if (resolution.kind === 'navigated') {
        return;
      }
      if (resolution.kind === 'reauth_required') {
        this.setupNeedsReauthenticate.set(true);
        this.infoMessage.set(resolution.message);
        return;
      }
      if (resolution.kind === 'message') {
        this.errorMessage.set(resolution.message);
      }
    }
  }

  private async setupPasskeyAuthenticator(): Promise<void> {
    const res = await firstValueFrom(
      this.authService.headlessAuth.getWebauthnAuthenticatorCreateOptions()
    );
    const data = res.data as WebAuthnCredentialCreationData;
    const publicKey = await getWebAuthnCreationOptions(data);
    const cred = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential | null;
    if (!cred) {
      this.isLoading.set(false);
      this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.CANCELLED'));
      return;
    }
    const body = publicKeyCredentialCreationToJson(cred);
    const added = await firstValueFrom(
      this.authService.headlessAuth.addWebauthnAuthenticator(body)
    );
    if (added && typeof added === 'object' && 'meta' in added) {
      this.authService.applyMetaTokens((added as { meta?: AuthenticationMeta }).meta);
    }
    this.isLoading.set(false);
    this.infoMessage.set(this.translate.instant('AUTH.PASSKEY.SETUP_SUCCESS'));
    this.setupNeedsReauthenticate.set(false);
  }
}
