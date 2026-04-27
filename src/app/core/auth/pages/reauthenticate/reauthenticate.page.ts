import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import { getWebAuthnRequestOptions, publicKeyCredentialToJson } from '../../headless/webauthn.util';
import type { WebAuthnCredentialRequestData } from '../../headless/headless-api.types';
import { AuthService } from '../../services/auth.service';

/**
 * Reauthentication (safe continuation): success navigates to `returnUrl`. Cancel returns to
 * `returnUrl` without retrying the protected request. Failed attempts show an error only.
 */
@Component({
  selector: 'app-reauthenticate-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, LangSwitchComponent],
  styleUrls: ['./reauthenticate.page.less'],
  templateUrl: './reauthenticate.page.html',
})
export class ReauthenticatePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  form: FormGroup;
  errorMessage = signal<string>('');
  isLoading = signal(false);
  passkeyAvailable = signal(true);

  constructor() {
    this.form = this.fb.group({ password: ['', [Validators.required, Validators.minLength(1)]] });
  }

  ngOnInit(): void {
    this.passkeyAvailable.set(isPasskeyClientEnvironmentSupported());
  }

  get returnUrl(): string {
    const u = this.route.snapshot.queryParamMap.get('returnUrl') || '/gallery';
    return u.startsWith('/') ? u : '/gallery';
  }

  /** Safe continuation: leave reauth without replaying the original request. */
  goBack(): void {
    void this.router.navigateByUrl(this.returnUrl);
  }

  async onSubmitPassword(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.auth.headlessAuth.reauthenticate({ password: this.form.value.password })
      );
      await firstValueFrom(this.auth.applyHeadlessSuccess(res, { fetchProfile: false }));
      this.isLoading.set(false);
      void this.router.navigateByUrl(this.returnUrl);
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.errorMessage.set(getErrorMessage(e) || this.translate.instant('AUTH.REAUTH.ERROR'));
    }
  }

  async onPasskey(): Promise<void> {
    if (!this.passkeyAvailable()) {
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(this.auth.headlessAuth.getWebauthnReauthOptions());
      const data = res.data as WebAuthnCredentialRequestData;
      const publicKey = await getWebAuthnRequestOptions(data);
      const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
      if (!cred) {
        this.isLoading.set(false);
        return;
      }
      const body = publicKeyCredentialToJson(cred);
      const out = await firstValueFrom(this.auth.headlessAuth.postWebauthnReauth(body));
      await firstValueFrom(this.auth.applyHeadlessSuccess(out, { fetchProfile: false }));
      this.isLoading.set(false);
      void this.router.navigateByUrl(this.returnUrl);
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.errorMessage.set(
          getErrorMessage(e) || this.translate.instant('AUTH.REAUTH.PASSKEY_ERROR')
        );
        return;
      }
      this.errorMessage.set(this.translate.instant('AUTH.REAUTH.PASSKEY_ERROR'));
    }
  }
}
