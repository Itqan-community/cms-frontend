import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import {
  getErrorMessage,
  isWebAuthnIncorrectCodeError,
} from '../../../../shared/utils/error.utils';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import { WebAuthnRpIdMismatchError } from '../../headless/webauthn-rp-id.util';
import { getWebAuthnRequestOptions, publicKeyCredentialToJson } from '../../headless/webauthn.util';
import type { WebAuthnCredentialRequestData } from '../../headless/headless-api.types';
import { AuthService } from '../../services/auth.service';
import { readContinueUrl } from '../../utils/auth-route-query.util';

@Component({
  selector: 'app-mfa-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./mfa.page.less'],
  templateUrl: './mfa.page.html',
})
export class MfaPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  form: FormGroup;
  errorMessage = signal<string>('');
  isLoading = signal(false);
  passkeyAvailable = signal(false);

  constructor() {
    this.form = this.fb.group({ code: ['', [Validators.required, Validators.minLength(4)]] });
    this.passkeyAvailable.set(isPasskeyClientEnvironmentSupported());
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
        this.errorMessage.set(getErrorMessage(e) || this.translate.instant('AUTH.MFA.ERROR'));
        return;
      }
      this.errorMessage.set(this.translate.instant('AUTH.MFA.ERROR'));
    }
  }

  async onWebAuthn(): Promise<void> {
    if (!this.passkeyAvailable()) {
      return;
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
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.errorMessage.set(getErrorMessage(e) || this.translate.instant('AUTH.MFA.ERROR'));
        return;
      }
      this.errorMessage.set(this.translate.instant('AUTH.MFA.ERROR'));
    }
  }
}
