import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { getWebAuthnRequestOptions, publicKeyCredentialToJson } from '../../headless/webauthn.util';
import type { WebAuthnCredentialRequestData } from '../../headless/headless-api.types';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reauthenticate-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, LangSwitchComponent],
  styleUrls: ['./reauthenticate.page.less'],
  templateUrl: './reauthenticate.page.html',
})
export class ReauthenticatePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  form: FormGroup;
  errorMessage = signal<string>('');
  isLoading = signal(false);

  constructor() {
    this.form = this.fb.group({ password: ['', [Validators.required, Validators.minLength(1)]] });
  }

  get returnUrl(): string {
    const u = this.route.snapshot.queryParamMap.get('returnUrl') || '/gallery';
    return u.startsWith('/') ? u : '/gallery';
  }

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
      this.errorMessage.set(getErrorMessage(e) || this.translate.instant('AUTH.REAUTH.ERROR'));
    }
  }

  async onPasskey(): Promise<void> {
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
        this.errorMessage.set(
          getErrorMessage(e) || this.translate.instant('AUTH.REAUTH.PASSKEY_ERROR')
        );
        return;
      }
      this.errorMessage.set(this.translate.instant('AUTH.REAUTH.PASSKEY_ERROR'));
    }
  }
}
