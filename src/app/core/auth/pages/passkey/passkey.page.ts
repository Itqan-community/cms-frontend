import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import {
  getErrorMessage,
  isWebAuthnIncorrectCodeError,
} from '../../../../shared/utils/error.utils';
import type {
  AuthenticatedResponse,
  AuthenticationMeta,
  WebAuthnCredentialCreationData,
  WebAuthnCredentialRequestData,
} from '../../headless/headless-api.types';
import {
  isReauthenticationBody,
  tryNavigateForAuth401,
} from '../../headless/headless-auth-flow.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import { WebAuthnRpIdMismatchError } from '../../headless/webauthn-rp-id.util';
import {
  getWebAuthnCreationOptions,
  getWebAuthnRequestOptions,
  publicKeyCredentialCreationToJson,
  publicKeyCredentialToJson,
} from '../../headless/webauthn.util';
import { HeadlessAppTokenService } from '../../headless/headless-app-token.service';
import { AuthService } from '../../services/auth.service';

type PasskeyMode = 'login' | 'signup' | 'setup';

function isAuthenticatedResponseBody(b: unknown): b is AuthenticatedResponse {
  return (
    b !== null &&
    typeof b === 'object' &&
    'status' in b &&
    (b as { status: unknown }).status === 200 &&
    'meta' in b &&
    typeof (b as { meta: unknown }).meta === 'object'
  );
}

@Component({
  selector: 'app-passkey-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./passkey.page.less'],
  templateUrl: './passkey.page.html',
})
export class PasskeyPage implements OnInit {
  readonly authService = inject(AuthService);
  private readonly tokenStore = inject(HeadlessAppTokenService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  readonly signupForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  errorMessage = signal<string>('');
  infoMessage = signal<string>('');
  /** Setup flow: server returned reauthentication required instead of creation options. */
  setupNeedsReauthenticate = signal(false);
  isLoading = signal(false);
  passkeyAvailable = signal(true);
  mode = signal<PasskeyMode>('login');
  backRoute = signal<string>('/login');

  ngOnInit(): void {
    this.passkeyAvailable.set(isPasskeyClientEnvironmentSupported());
    const routeData = this.route.snapshot.data ?? {};
    const routeMode = routeData['mode'];
    const queryFlow = this.route.snapshot.queryParamMap.get('flow');
    const mode: PasskeyMode =
      routeMode === 'setup'
        ? 'setup'
        : queryFlow === 'signup'
          ? 'signup'
          : queryFlow === 'login'
            ? 'login'
            : 'login';
    this.mode.set(mode);
    this.backRoute.set(mode === 'setup' ? '/gallery' : mode === 'signup' ? '/register' : '/login');

    const emailQ = this.route.snapshot.queryParamMap.get('email');
    if (emailQ) {
      this.signupForm.patchValue({ email: emailQ });
    }

    if (this.mode() === 'login' && this.authService.isLoggedIn()) {
      void this.router.navigateByUrl('/gallery');
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

  async submitPasskey(): Promise<void> {
    if (!this.passkeyAvailable()) {
      return;
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
      if (this.mode() === 'signup') {
        await this.signupWithPasskey();
      } else if (this.mode() === 'setup') {
        await this.setupPasskeyAuthenticator();
      } else {
        await this.loginWithPasskey();
      }
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof WebAuthnRpIdMismatchError) {
        this.errorMessage.set(
          this.translate.instant('AUTH.PASSKEY.RP_ID_ORIGIN_MISMATCH', {
            rpId: e.rpId,
            host: e.hostname,
          })
        );
        return;
      }
      if (
        e instanceof DOMException &&
        e.name === 'SecurityError' &&
        /relying party|webauthn|well-known/i.test(e.message)
      ) {
        this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.RP_ID_BROWSER_REJECT'));
        return;
      }
      if (e instanceof HttpErrorResponse) {
        if (isWebAuthnIncorrectCodeError(e)) {
          this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.WEBAUTHN_STATE_ERROR'));
          return;
        }
        if (this.mode() === 'setup' && isReauthenticationBody(e.error)) {
          this.setupNeedsReauthenticate.set(true);
          this.infoMessage.set(this.translate.instant('AUTH.PASSKEY.SETUP_REAUTH_REQUIRED'));
          return;
        }
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.errorMessage.set(getErrorMessage(e) || this.translate.instant('AUTH.PASSKEY.ERROR'));
        return;
      }
      this.errorMessage.set(getErrorMessage(e) || this.translate.instant('AUTH.PASSKEY.ERROR'));
    }
  }

  private async loginWithPasskey(): Promise<void> {
    const res = await firstValueFrom(this.authService.headlessAuth.getWebauthnLoginOptions());
    const data = res.data as WebAuthnCredentialRequestData;
    const publicKey = await getWebAuthnRequestOptions(data);
    const cred = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential | null;
    if (!cred) {
      this.isLoading.set(false);
      this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.CANCELLED'));
      return;
    }
    const body = publicKeyCredentialToJson(cred);
    const r = await firstValueFrom(this.authService.headlessAuth.postWebauthnLogin(body));
    await firstValueFrom(this.authService.applyHeadlessSuccess(r, { fetchProfile: true }));
    this.isLoading.set(false);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/gallery';
    const safe = returnUrl.startsWith('/') ? returnUrl : '/gallery';
    void this.router.navigateByUrl(safe);
  }

  /**
   * OpenAPI: POST `{ email }` → (optional session) → GET assertion options →
   * `credentials.get` → PUT `{ credential }`.
   */
  private async signupWithPasskey(): Promise<void> {
    const email = (this.signupForm.value['email'] as string).trim();
    /** Anonymous passkey signup: drop stale app session so GET/PUT use the new `meta.session_token` only. */
    if (!this.authService.isLoggedIn()) {
      this.tokenStore.clearSessionToken();
    }

    const initResp = await firstValueFrom(
      this.authService.headlessAuth.initiatePasskeySignup(email)
    );
    const initBody = initResp.body;
    if (initResp.ok && initBody && isAuthenticatedResponseBody(initBody)) {
      await firstValueFrom(
        this.authService.applyHeadlessSuccess(initBody, { fetchProfile: false })
      );
    } else if (initResp.ok && initBody) {
      this.applyMetaFromHeadlessBody(initBody);
    }

    if (initResp.ok && !this.tokenStore.getSessionToken()) {
      this.isLoading.set(false);
      this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.SIGNUP_SESSION_MISSING'));
      return;
    }

    const res = await firstValueFrom(this.authService.headlessAuth.getWebauthnSignupOptions());
    const data = res.data as WebAuthnCredentialRequestData;
    const publicKey = await getWebAuthnRequestOptions(data);
    const cred = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential | null;
    if (!cred) {
      this.isLoading.set(false);
      this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.CANCELLED'));
      return;
    }
    const body = publicKeyCredentialToJson(cred);
    const r = await firstValueFrom(this.authService.headlessAuth.completePasskeySignup(body));
    await firstValueFrom(this.authService.applyHeadlessSuccess(r, { fetchProfile: true }));
    this.isLoading.set(false);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/gallery';
    const safe = returnUrl.startsWith('/') ? returnUrl : '/gallery';
    void this.router.navigateByUrl(safe);
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

  /** Persist tokens from non-`AuthenticatedResponse` initiate bodies (e.g. partial headless envelopes). */
  private applyMetaFromHeadlessBody(body: unknown): void {
    if (!body || typeof body !== 'object') {
      return;
    }
    const meta = (body as { meta?: AuthenticationMeta }).meta;
    if (meta && typeof meta === 'object') {
      this.authService.applyMetaTokens(meta);
    }
  }
}
