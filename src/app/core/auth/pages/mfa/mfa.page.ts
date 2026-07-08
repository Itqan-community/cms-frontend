import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { AuthBackLinkComponent } from '../../components/auth-back-link/auth-back-link.component';
import { resolveAuthErrorMessage } from '../../../../shared/utils/auth-error-resolver.util';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { isPasskeyAutoPromptCancellation } from '../../headless/passkey-auto-prompt.util';
import { resolvePasskeyFlowError } from '../../headless/passkey-error.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import { getWebAuthnRequestOptions, publicKeyCredentialToJson } from '../../headless/webauthn.util';
import type { WebAuthnCredentialRequestData } from '../../headless/headless-api.types';
import { AuthService } from '../../services/auth.service';
import { readContinueUrl } from '../../utils/auth-route-query.util';

@Component({
  selector: 'app-mfa-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    LangSwitchComponent,
    AuthBackLinkComponent,
    NgIcon,
  ],
  styleUrls: ['./mfa.page.less'],
  templateUrl: './mfa.page.html',
})
export class MfaPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  private autoPasskeyAttempted = false;

  form: FormGroup;
  errorMessage = signal<string>('');
  isLoading = signal(false);
  passkeyAvailable = signal(false);

  constructor() {
    this.form = this.fb.group({ code: ['', [Validators.required, Validators.minLength(4)]] });
    this.passkeyAvailable.set(isPasskeyClientEnvironmentSupported());
  }

  ngOnInit(): void {
    if (this.passkeyAvailable()) {
      void this.onWebAuthn({ auto: true });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.auth.headlessAuth.mfaAuthenticate({ code: this.form.value.code })
      );
      await firstValueFrom(this.auth.applyHeadlessSuccess(res, { fetchProfile: true }));
      this.isLoading.set(false);
      const nextUrl = readContinueUrl(this.route.snapshot.queryParamMap);
      void this.router.navigateByUrl(nextUrl);
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.errorMessage.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.MFA.ERROR', context: 'mfa_totp' },
            this.translate
          )
        );
        return;
      }
      this.errorMessage.set(this.translate.instant('AUTH.MFA.ERROR'));
    }
  }

  async onWebAuthn(options?: { auto?: boolean }): Promise<void> {
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
    this.errorMessage.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(this.auth.headlessAuth.getWebauthnMfaOptions());
      const data = res.data as WebAuthnCredentialRequestData;
      const publicKey = await getWebAuthnRequestOptions(data);
      const cred = (await navigator.credentials.get({
        publicKey,
      })) as PublicKeyCredential | null;
      if (!cred) {
        this.isLoading.set(false);
        if (!isAuto) {
          this.errorMessage.set(this.translate.instant('AUTH.PASSKEY.CANCELLED'));
        }
        return;
      }
      const body = publicKeyCredentialToJson(cred);
      const r = await firstValueFrom(this.auth.headlessAuth.postWebauthnMfa(body));
      await firstValueFrom(this.auth.applyHeadlessSuccess(r, { fetchProfile: true }));
      this.isLoading.set(false);
      const nextUrl = readContinueUrl(this.route.snapshot.queryParamMap);
      void this.router.navigateByUrl(nextUrl);
    } catch (e) {
      this.isLoading.set(false);
      if (isAuto && isPasskeyAutoPromptCancellation(e)) {
        return;
      }
      const resolution = resolvePasskeyFlowError(e, this.translate, this.router, 'mfa');
      if (resolution.kind === 'message') {
        this.errorMessage.set(resolution.message);
      }
    }
  }
}
