import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import type { WebAuthnCredentialRequestData } from '../../headless/headless-api.types';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import { getWebAuthnRequestOptions, publicKeyCredentialToJson } from '../../headless/webauthn.util';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-passkey-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./passkey.page.less'],
  templateUrl: './passkey.page.html',
})
export class PasskeyPage implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  errorMessage = signal<string>('');
  isLoading = signal(false);
  passkeyAvailable = signal(true);

  ngOnInit(): void {
    this.passkeyAvailable.set(isPasskeyClientEnvironmentSupported());
  }

  async signInWithPasskey(): Promise<void> {
    if (!this.passkeyAvailable()) {
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);
    try {
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
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.errorMessage.set(getErrorMessage(e) || this.translate.instant('AUTH.PASSKEY.ERROR'));
        return;
      }
      this.errorMessage.set(getErrorMessage(e) || this.translate.instant('AUTH.PASSKEY.ERROR'));
    }
  }
}
